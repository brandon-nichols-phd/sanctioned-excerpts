from chalice import Blueprint, Response, BadRequestError, ForbiddenError
from chalicelib.services import PermissionService, LocationService
from chalicelib.authorizer import auth, get_authorized_user_id, get_agent_data, get_admin_pw_flag
import leangle
from chalicelib.services.logging.DataInteractionLoggerService import DataInteractionLoggerService
from chalicelib.services.logging.utils import INTERACTION_TYPE
from datetime import datetime
from backendlib.models import WebappDataInteraction

bp_upload = Blueprint(__name__)

def create_log_obj(interaction_type_id, user_id, user_agent, source_ip):
    return WebappDataInteraction(
        interaction_type_id = interaction_type_id,
        interaction_when = datetime.now(),
        user_id = user_id,
        user_agent = user_agent,
        source_ip = source_ip
    )

def current_user_id():
    return get_authorized_user_id(bp_upload.current_request)

def current_admin_pw_flag():
    return get_admin_pw_flag(bp_upload.current_request)


def q_post_body():
    post_body =  bp_upload.current_request.json_body
    if ('uploadCategory' not in post_body) or(post_body['uploadCategory'] != 'EMPLOYEES'):
        raise BadRequestError("Incorrect upload category")
    if ('additionalData' not in post_body) or ('locationId' not in post_body['additionalData']):
        raise BadRequestError("Incorrect upload location")
    if ('file' not in post_body):
        raise BadRequestError("Incorrect upload data structure")

    return post_body['additionalData']['locationId'], post_body['file']


@bp_upload.route('/locations-for-bulk-upload', methods=['GET'], authorizer=auth)
@leangle.describe.response(200, description='Get goals for location', schema='UserListResponseSchema')
def get_locations_for_bulk_upload():      
    user_id = current_user_id()
    loc_ids = PermissionService.get_l_ids_with_given_lgb_perms(user_id, ['upload_employees'])

    if len(loc_ids) == 0:
        raise ForbiddenError("The user does not have required permissions to perform this action")

    recs = LocationService.get_loc_names(loc_ids)
    final_result = {
        'data': recs
    }
    return Response(body=final_result, status_code=200)


@bp_upload.route('/bulk-upload', methods=['POST'], authorizer=auth)
@leangle.describe.response(200, description='Get goals for location', schema='UserListResponseSchema')
def bulk_upload():      
    loc_id, items_to_add = q_post_body()
    user_id = current_user_id()
    admin_pw_flag = current_admin_pw_flag()

    user_agent, source_ip = get_agent_data(bp_upload.current_request)
    log_obj = create_log_obj(INTERACTION_TYPE.IMPORT_EMPLOYEES, user_id, user_agent, source_ip)

    has_permissions = PermissionService.check_lgb_perms_based_on_l_ids(user_id, ['upload_employees'], [loc_id])

    if not has_permissions:
        raise ForbiddenError("The user does not have required permissions to perform this action")    

    is_success, msg = LocationService.bulk_upload_employees(loc_id, items_to_add) 

    final_result = {'data': msg}
    final_status_code = 200 if is_success else 409

    if is_success:
        DataInteractionLoggerService.log(log_obj, admin_pw_flag)

    return Response(body=final_result, status_code=final_status_code)
