import requests
import boto3
from botocore.exceptions import ClientError
import json
from backendlib.sessionmanager import get_session
from backendlib.models import SensorApplication
import time
import os
from chalicelib.utils.powertools import logger
from chalicelib.utils.runtime_tools import __IS_PROD

__DOMAIN = os.environ.get("DOMAIN")


# Different secret session because ttn secrets do not change across environments
secret_name = ""
region_name = ""
ttn_session = boto3.session.Session()
client = ttn_session.client(service_name="secretsmanager", region_name=region_name)
try:
    get_secret_value_response = client.get_secret_value(SecretId=secret_name)
except ClientError as e:
    logger.error("Could not retrieve TTN secrets")
    raise e

ttn_secrets = json.loads(get_secret_value_response["SecretString"])


# Get API key for gateway access
api_key = ttn_secrets.get("API_KEY", " ")

# Get required URL fragments
ttn_identity_url = ttn_secrets.get("IDENTITY", " ")
ttn_network_url = ttn_secrets.get("NETWORK", " ")
ttn_api_url_fragment = "/api/v3"


# Headers for authorization
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}


def ttn_get_request(api_url, error_message):
    response = requests.get(f"{api_url}", headers=headers)
    if response.status_code == 200:
        logger.info("TTN get request: " + api_url + "was successful.")
        response_data = response.json()
    else:
        response_data = None
        logger.error(
            f"TTN get request: {api_url} was not successful. Error: {error_message}, {response.status_code}"
        )
    return response_data


def init_dynamo_dev_eui_device_id_table(table_name):
    logger.info("Checking dynamo table..")
    dynamodb = boto3.resource("dynamodb")
    dynamo_table = dynamodb.Table(table_name)
    # Check the dynamo table
    dynamo_table_item_count = dynamo_table.scan().get("ScannedCount", -1)
    if dynamo_table_item_count <= 0:
        logger.info("Dynamo table " + table_name + " not yet made, generating...")
        generate_dynamo_table_dev_eui_to_TTN_device_id(dynamo_table)
    else:
        logger.info(f"Dynamo table found, has {dynamo_table_item_count} elements...")
    return dynamo_table


def generate_dynamo_table_dev_eui_to_TTN_device_id(dynamo_table):
    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    with get_session() as session:
        rows = session.query(SensorApplication).all()
        ttn_applications = {
            row.id: {"application_id": row.application_id, "cluster_id": row.cluster_id}
            for row in rows
        }
        # Compile list of non-standard device ids
        for key, value in list(ttn_applications.items()):
            application_id = value.get("application_id", {})
            page_num = 1
            list_devices_url = f"{ttn_identity_url}/api/v3/applications/{application_id}/devices?field_mask=ids&order=dev_eui&page="
            list_devices_page_url = list_devices_url + str(page_num)
            response = requests.get(list_devices_page_url, headers=headers)
            devices_page = response.json().get("end_devices", [])
            while len(devices_page) > 0:
                for device in devices_page:
                    dev_eui = device["ids"]["dev_eui"]
                    device_id = device["ids"]["device_id"]
                    expected_device_id = "eui-" + device["ids"]["dev_eui"].lower()
                    if device_id != expected_device_id:
                        dynamo_table.update_item(
                            Key={"eui": dev_eui},
                            UpdateExpression="SET device_id = :value",
                            ExpressionAttributeValues={":value": device_id},
                        )
                page_num = page_num + 1
                list_devices_page_url = list_devices_url + str(page_num)
                response = requests.get(list_devices_page_url, headers=headers)
                devices_page = response.json().get("end_devices", [])


def dynamo_device_id_from_eui(dev_eui, dynamo_table_name):
    dynamo_table = init_dynamo_dev_eui_device_id_table(dynamo_table_name)
    dynamo_condition = boto3.dynamodb.conditions.Key("eui")
    q_result = dynamo_table.query(KeyConditionExpression=dynamo_condition.eq(dev_eui))
    rows = q_result.get("Items", [])
    return rows[0]["device_id"] if len(rows) > 0 else None


def TTN_downlink_request(cluster_id, application_id, device_id, encoded_bytes, fport=1):

    webhook_id = "prod-webhook" if __IS_PROD else "yrdy-webhook"
    logger.info(
        f"TTN downlink request for cluster_id: {cluster_id}, application id: {application_id}, device_id: {device_id}"
    )

    url = f"https://{cluster_id}.cloud.thethings.industries/api/v3/as/applications/{application_id}/webhooks/{webhook_id}/devices/{device_id}/down/push"
    payload = {
        "downlinks": [
            {"frm_payload": encoded_bytes, "f_port": fport, "priority": "NORMAL"}
        ]
    }
    headers = {
        "Authorization": f"Bearer {ttn_secrets[application_id]}",
        "Content-Type": "application/json",
        "User-Agent": f"webhook-offline/{__DOMAIN}",
    }
    response = requests.post(url, headers=headers, json=payload)
    if not response.status_code == 200:
        logger.error(
            f"FAILED ON downlink (offline) {device_id} {response.status_code} \n response {response.text} - {webhook_id} {application_id}"
        )
    else:
        logger.info(
            f"SUCCESS ON downlink (offline) {device_id} {response.status_code} \n response {response.text} - {webhook_id} {application_id}"
        )
    time.sleep(0.01)
    return response.status_code == 200
