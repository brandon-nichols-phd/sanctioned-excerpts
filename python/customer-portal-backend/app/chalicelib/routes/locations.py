from chalice import Blueprint, Response, BadRequestError, ForbiddenError
from chalicelib.services import PermissionService
from chalicelib.services.GoalService import GoalService
from chalicelib.services import LocationService
from chalicelib.authorizer import auth
import leangle
from chalicelib.authorizer import get_authorized_user_id, get_agent_data, get_admin_pw_flag
from chalicelib.services.logging.DataInteractionLoggerService import DataInteractionLoggerService
from chalicelib.services.logging.utils import INTERACTION_TYPE
from datetime import datetime
from backendlib.models import WebappDataInteraction
from backendlib.utils import wrap_data_response
bp_locations = Blueprint(__name__)

def create_log_obj(interaction_type_id, user_id, user_agent, source_ip):
    return WebappDataInteraction(
        interaction_type_id = interaction_type_id,
        interaction_when = datetime.now(),
        user_id = user_id,
        user_agent = user_agent,
        source_ip = source_ip
    )

def current_user_id():
    return get_authorized_user_id(bp_locations.current_request)

def current_admin_pw_flag():
    return get_admin_pw_flag(bp_locations.current_request)

@bp_locations.route('/my-locations', methods=['GET'], authorizer=auth)
@leangle.describe.response(200, description='Get goals for location', schema='UserListResponseSchema')
def get_my_locations_with_goals_summary():  
    user_id = current_user_id()
    admin_pw_flag = current_admin_pw_flag()

    user_agent, source_ip = get_agent_data(bp_locations.current_request)
    log_obj = create_log_obj(INTERACTION_TYPE.FETCH_ALL_MY_LOCATIONS, user_id, user_agent, source_ip)

    #no permission needed to view my locations - passing empty array will return all LGs this user is affiliated with 
    current_permissions = PermissionService.get_lgb_permissions(user_id)
    lg_ids_ok = current_permissions.keys()
       
    recs = GoalService.get_locations_with_goals_summary(lg_ids_ok) 
    final_result = wrap_data_response(recs)

    print("====== will attempt to log fetching location list interaction ===========")
    DataInteractionLoggerService.log(log_obj, admin_pw_flag)
    return Response(body=final_result, status_code=200)

@bp_locations.route('/my-locations/{locationId}', methods=['GET'], authorizer=auth)
@leangle.describe.response(200, description='Get goals for location', schema='UserListResponseSchema')
def get_my_location_details(locationId):
    user_id = current_user_id()  
    admin_pw_flag = current_admin_pw_flag()
    user_agent, source_ip = get_agent_data(bp_locations.current_request)
    log_obj = create_log_obj(INTERACTION_TYPE.FETCH_LOCATION_DETAILS, user_id, user_agent, source_ip)

    try:
        loc_id = int(locationId)
    except:
        raise BadRequestError("Incorrect location id")

    has_permission = PermissionService.check_lgb_perms_based_on_l_ids(user_id, [], [loc_id])

    if not has_permission:
        raise ForbiddenError("The user does not have required permissions to perform this action")

    result = LocationService.get_my_location_details(user_id, locationId)
    final_result = wrap_data_response(result)
    print("====== will attempt to log fetching location details interaction ===========")
    DataInteractionLoggerService.log(log_obj, admin_pw_flag)
    return Response(body=final_result, status_code=200)


@bp_locations.route('/my-locations/{locationId}', methods=['POST'], authorizer=auth)
def update_location(locationId):

    user_id = current_user_id()
    admin_pw_flag = current_admin_pw_flag()
    user_agent, source_ip = get_agent_data(bp_locations.current_request)
    log_obj = create_log_obj(INTERACTION_TYPE.EDIT_LOCATION_DETAILS, user_id, user_agent, source_ip)

    try:
        loc_id = int(locationId)
    except:
        raise BadRequestError("Incorrect location id")

    has_permission = PermissionService.check_lgb_perms_based_on_l_ids(user_id, ['edit_location'], [loc_id])

    if not has_permission:
        raise ForbiddenError("The user does not have required permissions to perform this action")

    try:
        post_body = bp_locations.current_request.json_body
        update_schema = {}
        update_schema['name'] = post_body['name']
        update_schema['address'] = post_body['address']
        update_schema['contact_name'] = post_body['contactName']
        update_schema['email'] = post_body['email']
        update_schema['phone_number'] = post_body['phoneNumber']
        update_schema['timezone'] = post_body['timezone']
        update_schema['departmentDetails'] = post_body.get("departmentDetails")
        

        updated_location = LocationService.update_location(user_id, loc_id, update_schema, form_details= post_body.get("complianceForm", {}))

        result = wrap_data_response(updated_location)

        print("====== will attempt to log updating location interaction ===========")
        DataInteractionLoggerService.log(log_obj, admin_pw_flag)
        return Response(body=result, status_code=200)
    except Exception as e:
        raise e