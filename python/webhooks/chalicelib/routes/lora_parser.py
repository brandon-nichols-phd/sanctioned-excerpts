from aws_lambda_powertools import Logger
from dateutil import parser
import base64
import datetime
import pytz
import traceback

logger = Logger()


def __battery_level(voltage):
    if voltage >= 2.65:
        return min(100, round((voltage - 2.65) / 0.45 * 50) + 50)
    elif voltage >= 2.5:
        return round((voltage - 2.5) / 0.15 * 40) + 10
    else:
        return 10


def __generate_reading(created_at, value, data_type, unit):
    return dict(
        created_when=created_at,
        data_type=data_type,
        sensor_unit=unit,
        sensor_value=value,
    )


def historical_data(uplink):
    logger.info("Parsing offline data...")
    if "frm_payload" not in uplink:
        logger.error(f"Payload does not contain historical data: {uplink}")
        return []
    payload = base64.b64decode(uplink["frm_payload"])
    reformated = zip(*[iter(payload)] * 11)
    ret = []
    for reading in reformated:
        # ext_type = reading[6] & 7
        try:
            external_temp = (int.from_bytes(reading[0:2], "big", signed=True) / 100,)
            internal_temp = (int.from_bytes(reading[2:4], "big", signed=True) / 100,)
            internal_humidity = (int.from_bytes(reading[4:6], "big", signed=True) / 10,)
            timestamp = datetime.datetime.utcfromtimestamp(
                int.from_bytes(reading[7:11], "big", signed=False)
            )
            timestamp = timestamp.replace(tzinfo=pytz.timezone("UTC"))
            ret.append(
                __generate_reading(
                    created_at=timestamp,
                    data_type="TEMPERATURE_SECONDARY",
                    unit="C",
                    value=external_temp,
                )
            )
            ret.append(
                __generate_reading(
                    created_at=timestamp,
                    data_type="TEMPERATURE",
                    unit="C",
                    value=internal_temp,
                )
            )
            ret.append(
                __generate_reading(
                    created_at=timestamp,
                    data_type="HUMIDITY",
                    unit="%",
                    value=internal_humidity,
                )
            )
        except Exception as e:
            logger.error(
                f"Failed to parse offline reading: {reading}, from uplink: {uplink}, errror: {e}"
            )
    return ret


def parse_sensor_data(uplink):
    if "decoded_payload" not in uplink:
        logger.info("Offline data, decoded payload not in uplink...")
        return historical_data(uplink)
    else:
        logger.info("Current data, decoded payload exists in uplink...")
        payload = uplink["decoded_payload"]
        created_at = parser.parse(uplink["received_at"])
        try:
            response = [
                __generate_reading(
                    created_at,
                    uplink.get("rx_metadata", [None])[0]["channel_rssi"],
                    "RSSI",
                    "db",
                ),
                __generate_reading(
                    created_at, payload.get("TempC_SHT", None), "TEMPERATURE", "C"
                ),
                __generate_reading(
                    created_at, payload.get("Hum_SHT", None), "HUMIDITY", "%"
                ),
                __generate_reading(
                    created_at,
                    __battery_level(payload.get("BatV", None)),
                    "BATTERY",
                    "%",
                ),
                __generate_reading(
                    created_at,
                    payload.get("TempC_DS", None),
                    "TEMPERATURE_SECONDARY",
                    "C",
                ),
            ]
            clean_responses = [
                item for item in response if item["sensor_value"] is not None
            ]
            return clean_responses
        except Exception:
            logger.error(
                f"Failed to parse uplink: {uplink}, traceback: {traceback.format_exc()}"
            )
            return []


def parse_probe(uplink):
    try:
        payload = uplink["decoded_payload"]
        return [
            dict(
                created_when=datetime.datetime.now(),
                sensor_value=payload["Temp_Channel1"],
            )
        ]
    except Exception:
        logger.error(
            f"Could not parse a probe message {traceback.format_exc()}", uplink=uplink
        )
        return []


__PARSE_MAP = {
    "Sensor": parse_sensor,
    "Probe": parse_probe,
}


def lora_parser(body, model_name):
    return __PARSE_MAP[model_name](body["uplink_message"])
