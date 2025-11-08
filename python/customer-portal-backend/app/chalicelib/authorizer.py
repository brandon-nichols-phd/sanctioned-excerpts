from chalice import Blueprint
from chalice import AuthResponse, AuthRoute
from backendlib.services.UserService import UserService
from chalicelib.services.ApiService import validate_api_jwt
from backendlib.secretsmanager import get_jwt_secret
import jwt
import base64
from datetime import timedelta
from backendlib.sessionmanager import initialize as initialize_session
import logging

bp_authorizer = Blueprint(__name__)


@bp_authorizer.authorizer(ttl_seconds=5)
def auth(auth_request):
    logging.info("In auth")


def get_agent_data(current_request):
    user_agent = current_request.context["identity"].get("userAgent")
    source_ip = current_request.context["identity"]["sourceIp"]
    return user_agent, source_ip


def get_authorized_user_id(current_request):
    return current_request.context["authorizer"]["principalId"]


def get_authorized_user_email(current_request):
    return current_request.context["authorizer"]["userEmail"]


def get_admin_pw_flag(current_request):
    pw_flag = current_request.context["authorizer"]["adminPW"]
    return True if str(pw_flag).upper() == "TRUE" else False


class AuthorizedUser(object):
    def __init__(self, request):
        self.user_agent, self.source_ip = get_agent_data(request)
        self.user_id = get_authorized_user_id(request)
        self.user_email = get_authorized_user_email(request)
        self.admin_pw_flag = get_admin_pw_flag(request)


@bp_authorizer.authorizer(ttl_seconds=5)
def auth_api(auth_request):
    """Generate an AWS AuthResponse Object based on the API request
        Note:
            1. This only supports GET requests currently,
            2. routes are of the form /api/<permission name>
                - permission_name is the column name without the "read_" at the front
                - columns must contain "read_" at the beginning to auto populate
    Args:
        auth_request (Object): Passed into the request via AWS

    Returns:
        AuthResponse: Limited auth permissions. Adds user_id to principal_id, and adds context of the ApiAccess object
    """
    user_id, permissions = validate_api_jwt(auth_request.token)
    if not user_id or not permissions:
        logging.info("Failed to authenticate")
        return AuthResponse(routes=["/"], principal_id="unauthenticated")

    return AuthResponse(
        routes=[
            AuthRoute(path=f"/api/{k.split('read_')[1]}", methods=["GET"])
            for k, v in permissions.items()
            if k.startswith("read") and v
        ],
        context=dict(user_id=user_id, **permissions),
    )
