import base64
from sqlalchemy import func
from backendlib.models import redacted
from backendlib.sessionmanager import  _current_user_id as _uid_cv
import datetime
from chalicelib.helpers.TTNHelper import TTN_downlink_request, dynamo_device_id_from_eui
import pprint
import os
from aws_lambda_powertools import Logger

logger = Logger()


def _get_device_id(public_addr):
    logger.info(f"Checking device ID for EUI {public_addr}")
    non_standard_device_id = dynamo_device_id_from_eui(
        public_addr, os.environ.get("DYNAMO_TBL", "Unknown")
    )
    logger.info(
        f"Device ID search result for EUI {public_addr} is {non_standard_device_id}"
    )
    if non_standard_device_id is None:
        generated_id = "eui-" + public_addr.lower()
        logger.info(
            f"No Device ID found for EUI {public_addr}, using standard ID: {generated_id}"
        )
    return non_standard_device_id or generated_id


def _find_gaps():
    #Redacted

def request_offline_data(
    cluster_id, application_id, device_id, start_offline, end_offline=None
):
    if end_offline is None:
        end_offline = datetime.datetime.now()
    end_offline = int.to_bytes(int(end_offline.timestamp()), length=4, byteorder="big")
    start_offline = int.to_bytes(
        int(start_offline.timestamp()), length=4, byteorder="big"
    )
    byte_stream = b"\x31" + start_offline + end_offline + b"\x05"
    return TTN_downlink_request(
        cluster_id=cluster_id,
        application_id=application_id,
        device_id=device_id,
        encoded_bytes=base64.b64encode(byte_stream).decode(),
    )


def offline_request_cron():
    _uid_cv.set(0) 
    gaps = _find_gaps()
    logger.info(pprint.pformat(gaps))
    for gap in gaps.values():
        device_id = _get_device_id(gap["public_addr"])
        logger.info(
            f"Sending offline data request for device id: {device_id}, eui: {gap['public_addr']}, start time is: {gap['prev_created_when']}, end time is: {gap['created_when']}"
        )
        request_offline_data(
            cluster_id=gap["cluster_id"],
            application_id=gap["application_id"],
            device_id=device_id,
            start_offline=gap["prev_created_when"],
            end_offline=gap["created_when"],
        )
