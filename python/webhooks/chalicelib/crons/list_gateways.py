from chalicelib.helpers.TTNHelper import (
    ttn_identity_url,
    ttn_get_request,
    ttn_api_url_fragment,
)

import time
import logging
import boto3
import json
from chalicelib.helpers.queues import gateway_queue_url

sqs = boto3.client("sqs")

# URL to get all ttn users. This is necessary to get all gateways as they are user owned and gateway list api call only returns gateways owned by the specified user, admin does not override
get_users_url = f"{ttn_identity_url}{ttn_api_url_fragment}/users"

# Get list of users
user_error_log_message = "Error listing users:"


def get_gateway_listing():
    # Eval in function to prevent lambda caching of user list.

    user_list = ttn_get_request(get_users_url, user_error_log_message)

    if user_list is not None:
        user_id_list = [user["ids"]["user_id"] for user in user_list["users"]]

        if user_id_list:
            # We have a list of TTN users, fetch corresponding gateways
            gateway_listing = []
            for user_id in user_id_list:
                user_gateways_url = (
                    f"{get_users_url}/{user_id}/gateways?field_mask=name"
                )
                error_log_message = f"Error fetching gateways for user {user_id}:"
                user_gateways = ttn_get_request(user_gateways_url, error_log_message)
                if user_gateways is not None and len(user_gateways) > 0:
                    user_owned_gateways = user_gateways["gateways"]
                    for owned_gateway in user_owned_gateways:
                        owned_gateway["ttn_owner"] = user_id
                    # If the user owns gateways, append them to the all encompassing gateway list. Use list.extend() instead of list.append() to maintain a single dimensional array
                    gateway_listing.extend(user_owned_gateways)

            if len(gateway_listing) > 0:
                # We have all gateways for all users as a single list, reformat for easy consumption from queue
                gateway_queue_elements = [
                    {
                        "gateway_id": item["ids"]["gateway_id"],
                        "eui": item["ids"]["eui"],
                        "created_when": item["created_at"],
                        "updated_when": item["updated_at"],
                        "ttn_owner": item["ttn_owner"],
                        "name": item.get("name", None),
                    }
                    for item in gateway_listing
                ]
                return gateway_queue_elements

            else:
                logging.error("Error retrieving gateways from all users.")

    else:
        logging.error("No TTN users returned; gateway stats not updated.")

    return None


def insert_gateways_sqs(gateways):
    # insert into SQS queue
    try:
        for gateway in gateways:
            sqs.send_message(
                QueueUrl=gateway_queue_url,
                MessageBody=json.dumps(gateway),
            )
            time.sleep(0.01)  # Sleep for a short period to avoid slamming the queue
    except Exception as e:
        logging.error(
            f"Exception occured while attempting to add to gateway sqs queue. {e}"
        )
        logging.error(f"Failed to insert gateway into sqs queue: {json.dumps(gateway)}")
