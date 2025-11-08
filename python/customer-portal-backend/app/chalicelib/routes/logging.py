from chalice import Blueprint, Response
from chalicelib.authorizer import auth
from chalicelib.authorizer import get_authorized_user_id, get_agent_data, get_admin_pw_flag
from chalicelib.services.logging.DataInteractionLoggerService import DataInteractionLoggerService
from datetime import datetime
from backendlib.models import WebappDataInteraction

bp_logging = Blueprint(__name__)

# 1	"PDF_HANDWASHES_DASHBOARD"
# 16	"PDF_COMPLIANCE_DASHBOARD"
# 19	"PDF_DEVICES_DASHBOARD"
# 9	"CSV_ACTIVITY_BY_LOCATION_GROUP"
# 10	"CSV_ACTIVITY_BY_LOCATION"
# 11	"CSV_ACTIVITY_BY_STATION"
# 12	"CSV_ACTIVITY_BY_INDIVIDUAL"
# 13	"CSV_ACTIVITY_BY_INDIVIDUAL_AND_DATE"
# 14	"CSV_DETAIL_REWASH_RECOMMENDED"
# 15	"CSV_ALL_ACTIVITY"
# 18	"CSV_COMPLIANCE_AVG_BY_LOCATION"
# 21	"CSV_DEVICE_ACTIVITY"
# 32    "CSV_COMPLIANCE_AVG_BY_LOCATION_GROUP"

def validate_interaction_type_id(i_id):
    try:
        int_i_type_id = int(i_id)
        return int_i_type_id in (1,16,19,9,10,11,12,13,14,15,18,21,32)
    except:
        return False 
    

def current_user_id():
    return get_authorized_user_id(bp_logging.current_request)

def current_admin_pw_flag():
    return get_admin_pw_flag(bp_logging.current_request)

@bp_logging.route('/logging/{i_id}', methods=['GET'], authorizer=auth)
def log_data_interaction(i_id):  
    admin_pw_flag = current_admin_pw_flag()
    user_id = current_user_id()
    user_agent, source_ip = get_agent_data(bp_logging.current_request)
    interaction_type_id_ok = validate_interaction_type_id(i_id)

    if interaction_type_id_ok:
        new_log_entry = WebappDataInteraction(
            interaction_type_id = int(i_id),
            interaction_when = datetime.now(),
            user_id = user_id,
            user_agent = user_agent,
            source_ip = source_ip
        )
        DataInteractionLoggerService.log(new_log_entry, admin_pw_flag)

    return Response(body={"result": "success"}, status_code=200)

