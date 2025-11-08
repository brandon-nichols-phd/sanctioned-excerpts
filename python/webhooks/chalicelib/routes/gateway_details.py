import json
from backendlib.sessionmanager import get_session
import logging
from chalicelib.helpers.TTNHelper import (
    ttn_network_url,
    ttn_get_request,
    ttn_api_url_fragment,
)
from aws_lambda_powertools import Logger, Metrics
from datetime import datetime
from backendlib.models import GatewayStatus
import os
import uuid

env = os.environ.get("EMAIL_SRC", "Unknown")

logger = Logger()
metrics = Metrics()
metrics.set_default_dimensions(environment=env)


def coalesce_gateway_details(gateway, gateway_stats):
    try:
        is_active = True if gateway_stats is not None else False
        if gateway_stats is None:
            gateway_stats = {}
        rt_details = gateway_stats.get("round_trip_times", {})
        ip_details = gateway_stats.get("gateway_remote_address", {})
        gateway_details = {
            "gateway_id": gateway.get("gateway_id", None),
            "eui": gateway.get("eui", None),
            "gateway_name": gateway.get("name", None),
            "created_when": gateway.get("created_when", None),
            "last_modified_when": gateway.get("updated_when", None),
            "active": is_active,
            "ttn_owner": gateway.get("ttn_owner", None),
            "protocol": gateway_stats.get("protocol", None),
            "last_connected_when": gateway_stats.get("connected_at", None),
            "last_status_received_when": gateway_stats.get(
                "last_status_received_at", None
            ),
            "last_uplink_received_when": gateway_stats.get(
                "last_uplink_received_at", None
            ),
            "last_downlink_received_when": gateway_stats.get(
                "last_downlink_received_at", None
            ),
            "last_tx_acknowledgment_received_when": gateway_stats.get(
                "last_tx_acknowledgment_received_at", None
            ),
            "uplink_count": gateway_stats.get("uplink_count", None),
            "downlink_count": gateway_stats.get("downlink_count", None),
            "tx_acknowledgment_count": gateway_stats.get(
                "tx_acknowledgment_count", None
            ),
            "round_trip_seconds_min": rt_details.get("min", None),
            "round_trip_seconds_max": rt_details.get("max", None),
            "round_trip_seconds_median": rt_details.get("median", None),
            "round_trip_stat_group_size": rt_details.get("count", None),
            "remote_ip": ip_details.get("ip", None),
        }

        for key, value in gateway_details.items():
            if "when" in key and value is not None:
                date_str = (
                    value[:26] + "Z"
                )  # have to truncate because datetime does not support extended precision of the ISO8601 format, which TTN uses
                iso_string = date_str.replace("Z", "+00:00")
                date_obj = datetime.fromisoformat(iso_string)
                gateway_details[key] = date_obj
            if "seconds" in key and value is not None:
                float_value = float(value.strip("s"))
                gateway_details[key] = float_value
            if "count" in key and value is not None:
                int_value = int(value)
                gateway_details[key] = int_value

    except Exception as e:
        gateway_details = None
        logging.error(
            f"Error in validating/reformatting gateway status details data: {e}"
        )

    return gateway_details


def request_gateway_details(gateway_id):
    gateways_conn_stats_url = f"{ttn_network_url}{ttn_api_url_fragment}/gs/gateways/{gateway_id}/connection/stats"
    error_log_message = (
        f"Error fetching gateway details for gateway with id: {gateway_id}:"
    )
    gateway_stats = ttn_get_request(gateways_conn_stats_url, error_log_message)
    return gateway_stats


def database_insert_gateway_status(gateway_detail):
    gateway_id = gateway_detail.get("gateway_id", "")
    gateway_model = GatewayStatus(
        **gateway_detail,
        id=str(uuid.uuid4()),
        status_created_when=datetime.now(),
    )
    start = datetime.now()
    with get_session() as session:
        logging.info(f"Gateway insert session initialized {datetime.now() - start} ")
        session.add(gateway_model)
        try:
            session.commit()
        except Exception as e:
            logging.error(f"Failed to insert {gateway_id} -- {e}")
            session.rollback()
            return


# Process individual gateway from sqs message
def update_gateway_stats(gateway_body):
    gateway = json.loads(gateway_body)
    gateway_id = gateway.get("gateway_id", None)
    if gateway_id is not None:
        gateway_stats = request_gateway_details(gateway_id)
        gateway_detail = coalesce_gateway_details(gateway, gateway_stats)
        if gateway_detail is not None:
            database_insert_gateway_status(gateway_detail)
    else:
        logging.error("No gateway id found.")
