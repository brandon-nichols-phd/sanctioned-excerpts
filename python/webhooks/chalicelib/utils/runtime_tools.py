import boto3
import json
import time
import os
from chalicelib.types.config_models import RuntimeConfigParameter, RuntimeConfig
from chalicelib.utils.powertools import logger
from typing import Literal, Optional

__IS_PROD = os.getenv("CHALICE_STAGE", "staging") == "prod"

ParamType = Literal["number", "boolean", "string"]


ssm = boto3.client("ssm")

rt_app_name = os.getenv("CHALICE_APP_NAME", "webhooks")
rt_stage = os.getenv("CHALICE_STAGE", "staging")

# Basic in-memory cache
_json_config_cache = {}


def get_env_ssm_config(
    param_name: str, ttl: int = 60, fallback: Optional[dict] = None
) -> dict:
    """
    Fetch and parse a JSON string from SSM Parameter Store with TTL caching.

    Args:
        config_type (str): Grouped configuration settings context (e.g., "runtime", "debug", etc.).
        ttl (int): Time in seconds to cache the result (default: 60s).
        fallback (dict | None): Optional fallback value if parameter is missing or invalid.

    Returns:
        dict: Parsed JSON object from SSM (or fallback).
    """
    now = time.time()
    # Fully qualified SSM param name is /{app_name}/{stage}/config/{config_type} (e.g. /webhooks/staging/config/runtime)
    cache_entry = _json_config_cache.get(param_name)

    if cache_entry and now - cache_entry["timestamp"] < ttl:
        return cache_entry["value"]

    try:
        param = ssm.get_parameter(Name=param_name, WithDecryption=False)
        value_str = param["Parameter"]["Value"]
        value = json.loads(value_str)

        _json_config_cache[param_name] = {"value": value, "timestamp": now}
        return value

    except ssm.exceptions.ParameterNotFound:
        logger.warning(f"SSM parameter '{param_name}' not found. Using fallback.")
    except json.JSONDecodeError:
        logger.error(f"SSM parameter '{param_name}' is not valid JSON. Using fallback.")
    except Exception as e:
        logger.exception(f"Unexpected error reading SSM parameter '{param_name}': {e}")

    return fallback or {}


def get_runtime_config_param_value(
    param_key: RuntimeConfigParameter, fallback: Optional[ParamType] = None
):
    """
    Fetch runtime configuration JSON SSM Parameter Store and retrieve configuration attribute value

    Args:
        param_key (RuntimeConfigParameter): Configuration key for desired attribute value.
        fallback (ParamType | None): Optional fallback value if parameter is missing or invalid.

    Returns:
        ParamType: Parsed value from SSM (or fallback).
    """
    config_type = "runtime"
    param_name = f"/{rt_app_name}/{rt_stage}/config/{config_type}"
    runtime_config_dict = get_env_ssm_config(param_name)
    default_runtime_config = RuntimeConfig()
    if param_key in runtime_config_dict and hasattr(default_runtime_config, param_key):
        runtime_config = RuntimeConfig(**runtime_config_dict)
    else:
        runtime_config = default_runtime_config
    try:
        param = getattr(runtime_config, param_key, None)
        if param is None:
            raise AttributeError()
        return param
    except AttributeError:
        param_name = f"/{os.getenv('CHALICE_APP_NAME', '')}/{os.getenv('CHALICE_STAGE')}/config/runtime"
        logger.error(
            f"SSM parameter '{param_name}' does not contain attribute '{param_key}' Using fallback."
        )
        return fallback
