import traceback
from sqlalchemy.ext.declarative import declarative_base
from chalice import Chalice, Rate
from chalice import CORSConfig
from chalicelib.crons.offline_lora import offline_request_cron
from chalicelib.crons.cooldown_cleanup import clean_up_cooldown
from chalicelib.helpers.TTNHelper import init_dynamo_dev_eui_device_id_table
from chalicelib.routes.the_things_network import uplink_new
from chalicelib.routes.gateway_details import update_gateway_stats
from chalicelib.crons.list_gateways import get_gateway_listing, insert_gateways_sqs
from chalicelib.helpers.queues import (
    ambient_queue_name,
    process_queue_name,
    gateway_queue_name,
)
from chalice.app import ConvertToMiddleware
import os
from backendlib.sessionmanager import (
    initialize_for_request as session_initialize,
    _current_user_id,
)
from chalicelib.routes.the_things_network import bp_ttn
from aws_lambda_powertools.metrics import MetricUnit
from chalicelib.utils.powertools import metrics, logger, tracer
from chalicelib.utils.runtime_tools import get_runtime_config_param_value, __IS_PROD


env = os.environ.get("EMAIL_SRC", "Unknown")
app_name = os.getenv("CHALICE_APP_NAME", "webhooks")

Base = declarative_base()
metadata = Base.metadata
app = Chalice(app_name=app_name)
app.debug = True

metrics.set_default_dimensions(environment=env)

app.register_middleware(ConvertToMiddleware(logger.inject_lambda_context))
app.register_middleware(ConvertToMiddleware(tracer.capture_lambda_handler))


allowed_origin = os.environ.get(
    "ALLOWED_ORIGIN"
)  # staging: pathspot-engineering.com | prod: pathspot.app

cors_config = CORSConfig(allow_origin=allowed_origin, allow_credentials=True)
app.api.cors = cors_config


app.register_blueprint(bp_ttn)


@app.middleware("http")
def inject_route_info(event, get_response):
    logger.structure_logs(append=True, request_path=event.path)
    return get_response(event)


@app.middleware("all")
def initialize_user_session(event, get_response):
    try:
        session_initialize(app)  # pass the app to the session so we can get userids
        # Background tasks (SQS, scheduled jobs, etc.) do not have an authenticated
        # user associated with the request.  The backend shared library keeps a
        # ContextVar with the current user id and performs a defensive
        # ``int(...)`` cast when the SQLAlchemy session begins.
        try:
            uid = _current_user_id.get()
        except LookupError:
            uid = None

        try:
            int(uid)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            logger.debug(
                "Setting default system user id for background invocation",
                user_id=uid,
            )
            _current_user_id.set(0)
        response = get_response(event)
        return response
    except Exception as ie:
        logger.error(f"{ie}\n" + traceback.format_exc())
        metrics.add_metric(
            name="unhandled_error",
            unit=MetricUnit.Count,
            value=1,
        )
        raise ie


# routes #####
# health check endpoint to see if API is working
@app.route("/")
def index():
    return {"health_check": "SUCCESS"}


@app.schedule(Rate(1, unit=Rate.DAYS))
def refresh_dynamo_eui_to_id_tbl(event=None):
    if get_runtime_config_param_value("enable_dynamo_eui_map_refresh", __IS_PROD):
        dynamo_table = init_dynamo_dev_eui_device_id_table(
            os.environ.get("DYNAMO_ID_EUI_TBL", "Unknown")
        )
        dynamo_table_item_count = dynamo_table.scan().get("ScannedCount", -1)
        return {"dynamo_refreshed": str(dynamo_table_item_count) + " items."}


@app.schedule(Rate(2, unit=Rate.HOURS))
def fetch_offline(event=None):
    # Don't request offline data if not production by default
    if get_runtime_config_param_value(
        "enable_standard_sensors_offline_data", __IS_PROD
    ):
        logger.info("About to start offline gaps check!")
        return offline_request_cron()


@app.schedule(Rate(15, unit=Rate.MINUTES))
def cron_clean_up_process_probe(event=None):
    if get_runtime_config_param_value("enable_process_probe_cleanup", __IS_PROD):
        value = clean_up_cooldown()
        metrics.flush_metrics()
        return value


@app.schedule(Rate(60, unit=Rate.MINUTES))
def fetch_all_gateways(event=None):
    if get_runtime_config_param_value("enable_gateway_telemetry", __IS_PROD):
        gateways = get_gateway_listing()
        if gateways is not None:
            return insert_gateways_sqs(gateways)
        else:
            logger.error("Unable to fetch gateway listing.")


@app.on_sqs_message(queue=ambient_queue_name, batch_size=1)
def on_sqs(event):
    if get_runtime_config_param_value("enable_standard_sensors_sqs", __IS_PROD):
        for record in event:
            uplink_new(record.body)
        metrics.flush_metrics()


@app.on_sqs_message(queue=process_queue_name, batch_size=1)
def on_process_sqs(event):
    if get_runtime_config_param_value("enable_process_probe_sqs", __IS_PROD):
        for record in event:
            uplink_new(record.body)
        metrics.flush_metrics()


# Process SQS queue elments for Gateways
@app.on_sqs_message(queue=gateway_queue_name, batch_size=1)
def on_gateway_sqs(event):
    if get_runtime_config_param_value("enable_gateway_telemetry_sqs", __IS_PROD):
        for record in event:
            update_gateway_stats(record.body)
        metrics.flush_metrics()
