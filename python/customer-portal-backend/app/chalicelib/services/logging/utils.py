from backendlib.models import WebappDataInteraction
from datetime import datetime

class INTERACTION_TYPE:
    PDF_HANDWASHES_DASHBOARD = 1
    FETCH_OVERVIEW_CHARTS = 2
    FETCH_ACTIVITY_BY_PLACE_TABLES = 3
    FETCH_ACTIVITY_CHARTS = 4
    FETCH_TOD_BREAKDOWN_CHARTS = 5
    FETCH_ACTIVITY_BY_IND_TABLES = 6
    FETCH_DETAIL_REWASH_TABLES = 7
    FETCH_ALL_ACTIVITY_TABLES = 8
    CSV_ACTIVITY_BY_LOCATION_GROUP = 9
    CSV_ACTIVITY_BY_LOCATION = 10
    CSV_ACTIVITY_BY_STATION = 11
    CSV_ACTIVITY_BY_INDIVIDUAL = 12
    CSV_ACTIVITY_BY_INDIVIDUAL_AND_DATE = 13
    CSV_DETAIL_REWASH_RECOMMENDED = 14
    CSV_ALL_ACTIVITY = 15
    PDF_COMPLIANCE_DASHBOARD = 16
    FETCH_COMPLIANCE_SECTION = 17
    CSV_COMPLIANCE_AVG_BY_LOCATION = 18
    PDF_DEVICES_DASHBOARD = 19
    FETCH_DEVICE_ACTIVITY = 20
    CSV_DEVICE_ACTIVITY = 21
    FETCH_LOCATIONS_LIST_WITH_GOALS_STATUS = 22
    FETCH_GOALS_FOR_LOCATION = 23
    SET_GOALS_ATTEMPT = 24
    SET_GOALS = 25
    FETCH_ALL_MY_LOCATIONS = 26
    FETCH_LOCATION_DETAILS = 27
    FETCH_ALL_MY_LOCATION_GROUPS = 28
    IMPORT_EMPLOYEES = 29
    FETCH_ALL_USERS = 30
    FETCH_USER_DETAILS = 31
    CSV_COMPLIANCE_AVG_BY_LOCATION_GROUP = 32
    FETCH_ALL_EMPLOYEES = 33
    FETCH_EMPLOYEE_DETAILS = 34
    EDIT_USER_PROFILE = 35
    EDIT_USER_ACTIVATE = 36
    EDIT_USER_DEACTIVATE = 37
    EDIT_LOCATION_DETAILS = 38
    EDIT_EMPLOYEE_DETAILS = 39
    FETCH_WELLNESS_CHECK_OVERVIEW = 40
    FETCH_WELLNESS_CHECK_DETAILS = 41
    FETCH_WELLNESS_CHECK_QA = 42
    FETCH_WELLNESS_CHECK_EMPLOYEE_ANSWERS = 43
    FETCH_SENSOR_PERMISSIONS = 44
    FETCH_SENSOR_MODELS = 45
    FETCH_SENSOR_LIST = 46
    FETCH_SENSOR_DETAILS = 47
    EDIT_SENSOR_DETAILS = 48
    CREATE_SENSOR = 49
    FETCH_SENSORS = 50
    FETCH_SENSOR_OVERVIEW = 51
    FETCH_SENSOR_DATA = 52
    FETCH_SENSOR_TEMPLATE = 53
    FETCH_SENSOR_USERS = 54
    



def create_log_obj_short(interaction_type_id, user_id, user_agent, source_ip, **kwargs):
    interaction = WebappDataInteraction(
        interaction_type_id = interaction_type_id,
        interaction_when = datetime.now(),
        user_id = user_id,
        user_agent = user_agent,
        source_ip = source_ip,
    )
    interaction.request_group_id = kwargs.pop("req_id", None)
    interaction.request_arguments = kwargs

    return interaction

def create_log_obj(interaction_type_id, user_id, start_date, end_date, lg_ids, l_ids, s_ids, e_ids, req_group_id, user_agent, source_ip):
    return WebappDataInteraction(
        interaction_type_id = interaction_type_id,
        interaction_when = datetime.now(),
        user_id = user_id,
        filter_start_date = start_date,
        filter_end_date = end_date,
        filter_location_group_ids = lg_ids if len(lg_ids) else None,
        filter_location_ids = l_ids if len(l_ids) else None,
        filter_station_ids = s_ids if len(s_ids) else None,
        filter_employee_ids = e_ids if len(e_ids) else None,
        user_agent = user_agent,
        source_ip = source_ip,
        request_group_id = req_group_id
    )