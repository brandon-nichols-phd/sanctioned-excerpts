from aws_lambda_powertools import Logger
from backendlib.sessionmanager import get_session
from backendlib.models import (
    DeployedSensor,
    SensorAction,
    Location,
    TriggeredAction,
    SensorData,
    SensorModel,
    CooldownReading,
)
from chalice import Blueprint
from chalicelib.routes.lora_parser import lora_parser
from chalicelib.routes.cooldown_evaluator import evaluate_cooldown
from chalicelib.helpers.queues import ambient_queue_url, process_queue_url

import datetime
import uuid
import json
import boto3
from sqlalchemy import func
import traceback

sqs = boto3.client("sqs")
bp_ttn = Blueprint(__name__)
logger = Logger()


def get_body():
    return bp_ttn.current_request.json_body


@bp_ttn.route("/uplink", methods=["POST"])
def uplink_sqs_enque():

    body = get_body()

    try:
        dev_eui = body["end_device_ids"]["dev_eui"]
        uplink_message = body["uplink_message"]
    except Exception as e:
        logger.error(f"Error reading uplink event from body: {body}, ERROR: {e}")
        return

    try:
        model_id = uplink_message.get(
            "version_ids", uplink_message.get("decoded_payload", {})
        )["model_id"]
    except KeyError:
        # Must be an uplink message missing both key variants or the model_id
        logger.error(f"Uplink message missing sensor identifier: {uplink_message}")
        return

    if model_id == "ltc2":
        sqs.send_message(
            QueueUrl=process_queue_url,
            MessageBody=json.dumps(body),
            MessageGroupId=dev_eui,
        )
    else:
        # default to our ambient queue
        sqs.send_message(
            QueueUrl=ambient_queue_url,
            MessageBody=json.dumps(body),
            MessageGroupId=dev_eui,
        )


def uplink_new(body_str):
    body = json.loads(body_str)
    dev_eui = None
    try:
        dev_eui = body["end_device_ids"]["dev_eui"]
    except KeyError as ke:
        logger.error(
            f"Error parsing device id from uplink body: {body_str}. Error: {ke}"
        )
        return

    start = datetime.datetime.now()
    with get_session() as session:
        q = session.query()
