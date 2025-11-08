import datetime
import logging
from datetime import timedelta
from dateutil.parser import parse
from chalice import Blueprint, Response, BadRequestError
from chalicelib.authorizer import auth
from chalicelib.authorizer import get_authorized_user_id, get_authorized_user_email
from chalicelib.services.PermissionService import get_approved_permissions_per_level, get_all_permissions
from backendlib.utils import parse_and_decamlize_params
from backendlib.utils import extract_filter_primary_key_and_vals
from backendlib.sessionmanager import get_session, render_query
from sqlalchemy import func, or_, and_
from backendlib.utils import format_as_java_time, json_zip
from backendlib.helpers.casing_converter import camelize
from backendlib.utils import decamelize
from backendlib.helpers.defaulter_dict import DefaultingDictList
from backendlib.helpers.android_lambda_helper import request_android_config
from backendlib.models import (
    Location,
    SensorModel,
    DeployedSensor,
    SensorAction,
    Department,
    WebappUser,
    SensorData,
    TriggeredAction,
    ReportTemplate,
    Customer,
    CustomerUserAffiliation,
    Department
)


def __convert_level_to_filters(arg_key):
    if arg_key is None:
        return None
    arg_key = arg_key.lower()
    if "employee" in arg_key:
        return None
    if "station" in arg_key:
        return 's_ids'
    if "department" in arg_key:
        return "d_ids"
    if "group" in arg_key:
        return "lg_ids"
    if "location" in arg_key:
        return "l_ids"
    return None

bp_corrective_action = Blueprint(__name__)

@bp_corrective_action.route("/sensor_alerts", methods=["GET"], authorizer=auth)
def get_corrective_action():
    user_id = get_authorized_user_id(bp_corrective_action.current_request)
    args = parse_and_decamlize_params(bp_corrective_action.current_request.query_params)
    level, targets = extract_filter_primary_key_and_vals(args)
    level = __convert_level_to_filters(level)
    if args.get("start_date") is None or args.get("end_date") is None:
        raise BadRequestError("startDate and endDate are required")
    filter_args = [TriggeredAction.created_when >= args.get("start_date"),
                   TriggeredAction.created_when <= parse(args.get("end_date")) + timedelta(days=1)]
    if level == 'd_ids':
        d_ids = get_approved_permissions_per_level(user_id=user_id,required_permissions=["view_sensors_and_actions"], output_level="d_ids",
                                                targets=targets, input_level=level)
        filter_args.append(DeployedSensor.department_id.in_(d_ids))
    else:
        l_ids = get_approved_permissions_per_level(user_id=user_id,required_permissions=["view_sensors_and_actions"], output_level="l_ids",
                                                targets=targets, input_level=level)
        filter_args.append(DeployedSensor.location_id.in_(l_ids))
    category = args.get("category")
    criticality = args.get("criticality")
    
    if category:
        filter_args.append(DeployedSensor.tag[0] == category)
    if criticality:
        filter_args.append(SensorAction.criticality == criticality)

    with get_session() as session:
        q = session.query(
            func.timezone(Location.timezone, TriggeredAction.alert_start_when).label("alert_start_when"),
            func.timezone(Location.timezone, TriggeredAction.created_when).label("created_when"),
            TriggeredAction.id.label("triggered_action_id"),
            TriggeredAction.is_out_of_range,
            TriggeredAction.sensor_action_id,
            TriggeredAction.sensor_id,
            TriggeredAction.value,
            TriggeredAction.unit,
            SensorAction.criticality,
            SensorAction.high_limit,
            SensorAction.low_limit,
            DeployedSensor.tag[1].label("category"),
            DeployedSensor.name.label("sensor_name"),
            Department.name.label("department_name"),
            Location.name.label("location_name"),
            SensorAction.data_type.label("event_type")
        ).join(
            SensorAction, SensorAction.id == TriggeredAction.sensor_action_id
        ).join(
            DeployedSensor, DeployedSensor.id == TriggeredAction.sensor_id
        ).outerjoin(
            Department, Department.id == DeployedSensor.department_id
        ).join(
            Location, Location.id == DeployedSensor.location_id
        ).filter(
            *filter_args
        )
        return dict(data=json_zip([ camelize (dict(row, alert_start_when=format_as_java_time(row.alert_start_when),
                          created_when=format_as_java_time(row.created_when)
                          ) ) for row in q]))
        




    