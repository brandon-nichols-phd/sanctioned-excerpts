from sqlalchemy.ext.declarative import declarative_base
from chalice import Chalice, Rate
from chalice import CORSConfig
import sentry_sdk
from sentry_sdk import set_user, set_tag
import os
from backendlib.sessionmanager import initialize as session_initialize
from sentry_sdk.integrations.chalice import ChaliceIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from backendlib.services.AuthService import AuthService
from backendlib.services.UserService import UserService

import traceback
from chalice.app import ConvertToMiddleware
from chalicelib.authorizer import bp_authorizer
from chalicelib.routes.users import bp_users
from chalicelib.routes.filters import bp_filters
from chalicelib.routes.compliance import bp_compliance
from chalicelib.routes.goals import bp_goals
from chalicelib.routes.locations import bp_locations
from chalicelib.routes.location_groups import bp_location_groups
from chalicelib.routes.devices import bp_devices
from chalicelib.routes.handwashes_dashboard import bp_handwashes_dashboard
from chalicelib.routes.auth import bp_auth
from chalicelib.routes.upload import bp_upload
from chalicelib.routes.scan_images import bp_scan_images
from chalicelib.routes.logging import bp_logging
from chalicelib.routes.employees import bp_employees
from chalicelib.routes.forms import bp_forms
from chalicelib.routes.api import bp_api
from chalicelib.routes.sensors_crud import bp_sensors
from chalicelib.routes.corrective_action import bp_corrective_action
from chalicelib.routes.cooldown import bp_cooldown
from chalicelib.routes.reporting import bp_reporting
from chalicelib.routes.user_redux import bp_users_redux
from chalicelib.utils import logger, metrics, tracer

region = os.environ.get("REGION", "UnknownRegion")
stage = os.environ.get("EMAIL_SRC", "Unknown")


sentry_sdk.init(
    dsn="",
    integrations=[
        AwsLambdaIntegration(timeout_warning=True),
        SqlalchemyIntegration(),
        ChaliceIntegration(),
    ],
    sample_rate=1.0 if stage == "PROD" else 0,
    enable_tracing=True,
    traces_sample_rate=0.2 if stage == "PROD" else 0,
    environment=stage,
)


metrics.set_default_dimensions(environment=stage)


Base = declarative_base()
metadata = Base.metadata
app = Chalice(app_name="app")
app.debug = True

app.register_middleware(ConvertToMiddleware(logger.inject_lambda_context))
app.register_middleware(
    ConvertToMiddleware(tracer.capture_lambda_handler(capture_response=False))
)

cors_config = CORSConfig(
    allow_origin=os.environ.get("ALLOWED_ORIGIN"), allow_credentials=True
)
app.api.cors = cors_config


@app.middleware("all")
def initialize_user_session(event, get_response):
    try:
        user_id = app.current_request.context["authorizer"]["user_id"]
        set_user(dict(id=user_id))
    except Exception:
        set_user(dict(id="Unknown"))
    session_initialize(app)
    return response


@app.middleware("http")
def initialize_sentry(event, get_response):
    logger.structure_logs(append=True, request_path=event.path)
    logger.info("Request event", request=event.to_dict())

    with sentry_sdk.start_transaction(
        op="CustomerWebApp HTTP Request", name=f"{event.method}: {event.path}"
    ):
        set_tag(key="cw_path", value=event.path)
        response = None
        try:
            response = get_response(event)
            logger.info(response.status_code)
            if response.status_code != 200:
                logger.error("Error on request", error=response.body)
                response.body = {"error": str(response.body)}

        except Exception as ie:
            logger.error("Error on request", error=ie, traceback=traceback.format_exc())
            if response is not None:
                response.status_code = 500
                if stage == "PROD":
                    response.body = "Error occurred"
                else:
                    response.body = traceback.format_exc()
        finally:
            return response


app.register_blueprint(bp_authorizer)
app.register_blueprint(bp_auth)


app.register_blueprint(bp_goals)
app.register_blueprint(bp_locations)
app.register_blueprint(bp_devices)
app.register_blueprint(bp_upload)
app.register_blueprint(bp_logging)
app.register_blueprint(bp_forms)
app.register_blueprint(bp_api)
app.register_blueprint(bp_sensors)
app.register_blueprint(bp_reporting)


# cron jobs #######
# We only want to run this in a single region since we will be sharing the same DB across all regions
if "us-east-1" in region:

    @app.schedule(Rate(24, unit=Rate.HOURS))
    def remove_expired_tokens_cron(event):
        try:
            print("==> Deleting expired refresh tokens <==")
            AuthService.remove_expired_refresh_tokens()
            print("==> Success <==")

            print("==> Deleting expired password reset tokens <==")
            UserService.remove_expired_password_reset_tokens()
            print("==> Success <==")

        except Exception as e:
            print(f"Something went wrong: {e}")

        return


# routes #####
# health check endpoint to see if API is working
@app.route("/")
def index():
    return {"health_check": "SUCCESS"}
