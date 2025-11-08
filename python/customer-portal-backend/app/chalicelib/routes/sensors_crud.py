import datetime
import logging
from datetime import timedelta
from dateutil.parser import parse
from chalice import Blueprint, Response, BadRequestError
from collections import defaultdict
from chalicelib.authorizer import auth
from chalicelib.authorizer import get_authorized_user_id, get_authorized_user_email
from chalicelib.services.PermissionService import (
    get_approved_permissions_per_level,
    get_all_permissions,
)
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
    Department,
    SensorUnitType,
)
import uuid
from chalicelib.authorizer import (
    get_authorized_user_id,
    get_agent_data,
    get_admin_pw_flag,
)
from chalicelib.services.logging.DataInteractionLoggerService import (
    DataInteractionLoggerService,
)
from chalicelib.services.logging.utils import INTERACTION_TYPE, create_log_obj_short
from csv import DictWriter
import io
from sqlalchemy.orm import aliased

bp_sensors = Blueprint(__name__)


def __convert_level_to_filters(arg_key):
    if arg_key is None:
        return None
    arg_key = arg_key.lower()
    if "employee" in arg_key:
        return None
    if "station" in arg_key:
        return "s_ids"
    if "department" in arg_key:
        return "d_ids"
    if "group" in arg_key:
        return "lg_ids"
    if "location" in arg_key:
        return "l_ids"
    return None


def __log_interaction(arg_params, interaction_type):
    if arg_params is None:
        arg_params = bp_sensors.current_request.query_params
    if arg_params is None:
        arg_params = {}
    user_id = get_authorized_user_id(bp_sensors.current_request)
    admin_pw_flag = get_admin_pw_flag(bp_sensors.current_request)
    user_agent, source_ip = get_agent_data(bp_sensors.current_request)
    log_obj = create_log_obj_short(
        interaction_type_id=interaction_type,
        user_id=user_id,
        user_agent=user_agent,
        source_ip=source_ip,
        **arg_params,
    )
    DataInteractionLoggerService.log(log_obj, admin_pw_flag)
    return user_id


@bp_sensors.route("/sensors/supress-alerts", methods=["POST"], authorizer=auth)
def suppress_sensor_alert():
    """params:
    sensorId: sensor_id to suppress
    suppressUntil : <string datetime>

    Raises:
        BadRequestError: _description_
    """
    user_id = get_authorized_user_id(bp_sensors.current_request)
    args = decamelize(bp_sensors.current_request.json_body)
    __log_interaction(args, INTERACTION_TYPE.EDIT_SENSOR_DETAILS)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["edit_sensors"], output_level="l_ids"
    )
    suppress_until = args["suppress_until"]
    with get_session() as session:
        sensor = (
            session.query(DeployedSensor)
            .filter(
                DeployedSensor.location_id.in_(l_ids),
                DeployedSensor.id == args["sensor_id"],
            )
            .first()
        )
        if sensor is None:
            raise BadRequestError(f"Invalid permissions or sensor does not exist")
        sensor_alerts = session.query(SensorAction).filter(
            SensorAction.deployed_sensor_id == sensor.id, SensorAction.active == True
        )
        for action in sensor_alerts:
            action.suppress_until = suppress_until


@bp_sensors.route("/sensors/permissions", methods=["GET"], authorizer=auth)
def get_permissions():
    user_id = get_authorized_user_id(bp_sensors.current_request)
    __log_interaction(None, INTERACTION_TYPE.FETCH_SENSOR_PERMISSIONS)

    perms = get_all_permissions(user_id=user_id)["l_ids"]

    ret = {
        "view_sensors_and_actions": {
            l: {"value": l, "departments": []}
            for l in perms["view_sensors_and_actions"]
        },
        "edit_sensors": {
            l: {"value": l, "departments": []} for l in perms["edit_sensors"]
        },
        "edit_actions": {
            l: {"value": l, "departments": []} for l in perms["edit_actions"]
        },
        "available_tags": {},
    }

    all_lids = set(
        list(perms["view_sensors_and_actions"])
        + list(perms["edit_sensors"])
        + list(perms["edit_actions"])
    )

    with get_session() as session:
        q = (
            session.query(
                Location.name.label("location_name"),
                Location.id,
                Department.id.label("department_id"),
                Department.name.label("department_name"),
                DeployedSensor.tag,
            )
            .outerjoin(Department, Department.location_id == Location.id)
            .outerjoin(DeployedSensor, DeployedSensor.location_id == Location.id)
            .filter(Location.id.in_(all_lids))
        )

        for row in q:
            if row.tag and isinstance(row.tag, list):
                for tag in row.tag:
                    if tag:
                        ret["available_tags"][tag] = {"value": tag, "label": tag}

            for perm_name in [
                "view_sensors_and_actions",
                "edit_sensors",
                "edit_actions",
            ]:
                if row.id in ret[perm_name]:
                    to_update = ret[perm_name][row.id]
                    to_update["label"] = row.location_name

                    if row.department_id:
                        department_entry = {
                            "value": row.department_id,
                            "label": row.department_name,
                        }
                        if department_entry not in to_update["departments"]:
                            to_update["departments"].append(department_entry)

    ret["available_tags"] = list(ret["available_tags"].values())

    for key in ["view_sensors_and_actions", "edit_sensors", "edit_actions"]:
        ret[key] = list(ret[key].values())

    return dict(data=json_zip(camelize(ret)))


@bp_sensors.route("/sensors/models", methods=["GET"], authorizer=auth)
def get_models():
    user_id = get_authorized_user_id(bp_sensors.current_request)
    __log_interaction(None, INTERACTION_TYPE.FETCH_SENSOR_MODELS)

    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
    )
    if not l_ids:
        raise BadRequestError("Invalid request")
    with get_session() as session:
        q = session.query(SensorModel)
        response = []
        for sm in q:
            response.append(sm.as_json())
    return dict(data=json_zip(camelize(response)))


@bp_sensors.route("/sensors/unit-types", methods=["GET"], authorizer=auth)
def get_sensor_unit_types():
    """
    Returns all active sensor unit types grouped by unit_type_group
    in the expected JSON structure using 'unitTypeGroup' and 'types'.
    """
    with get_session() as session:
        unit_types = session.query(
            SensorUnitType.active,
            SensorUnitType.description,
            SensorUnitType.id,
            SensorUnitType.unit_type,
            SensorUnitType.unit_type_group,
        ).filter(SensorUnitType.active == True)
        response = [dict(row) for row in unit_types]
    return dict(data=json_zip(camelize(response)))


@bp_sensors.route("/sensors/list", methods=["GET"], authorizer=auth)
def list_sensors():
    user_id = get_authorized_user_id(bp_sensors.current_request)
    __log_interaction(None, INTERACTION_TYPE.FETCH_SENSOR_LIST)
    if bp_sensors.current_request.query_params:
        args = parse_and_decamlize_params(bp_sensors.current_request.query_params)
        level, targets = extract_filter_primary_key_and_vals(args)
        level = __convert_level_to_filters(level)
    else:
        level, targets = None, None
    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
        targets=targets,
        input_level=level,
    )
    if not l_ids:
        raise BadRequestError("Invalid request")
    response = []
    with get_session() as session:
        q = (
            session.query(
                DeployedSensor.name.label("sensor_name"),
                DeployedSensor.id.label("sensor_id"),
                Location.name.label("location_name"),
                DeployedSensor.sensor_model_id,
                Location.id.label("location_id"),
                Department.name.label("department_name"),
                Department.id.label("department_id"),
                DeployedSensor.public_addr,
                DeployedSensor.tag,
                DeployedSensor.last_modified_when,
                DeployedSensor.active,
                func.count(SensorAction.id).label("sensor_action_count"),
                SensorUnitType.unit_type.label("unit_type_name"),
            )
            .outerjoin(
                SensorAction,
                and_(
                    DeployedSensor.id == SensorAction.deployed_sensor_id,
                    SensorAction.active,
                ),
            )
            .join(Location, Location.id == DeployedSensor.location_id)
            .outerjoin(Department, Department.id == DeployedSensor.department_id)
            .outerjoin(SensorUnitType, SensorUnitType.id == DeployedSensor.unit_type_id)
            .group_by(
                DeployedSensor.name,
                DeployedSensor.id,
                Location.name,
                Location.id,
                Department.name,
                Department.id,
                DeployedSensor.last_modified_when,
                DeployedSensor.active,
                SensorUnitType.unit_type,
            )
            .filter(DeployedSensor.location_id.in_(l_ids))
        )
        [
            response.append(
                camelize(
                    dict(
                        row,
                        last_modified_when=format_as_java_time(row.last_modified_when),
                    )
                )
            )
            for row in q
        ]
    return dict(data=json_zip(camelize(response)))


@bp_sensors.route("/sensors/crud/{sensor_id}", methods=["GET"], authorizer=auth)
def get_sensor(sensor_id):
    __log_interaction(dict(sensor_id=sensor_id), INTERACTION_TYPE.FETCH_SENSOR_DETAILS)

    user_id = get_authorized_user_id(bp_sensors.current_request)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
    )
    if not l_ids:
        raise BadRequestError("Invalid request")

    with get_session() as session:
        users = {
            t.id: t
            for t in session.query(
                WebappUser.id,
                WebappUser.first_name,
                WebappUser.last_name,
                WebappUser.email,
                WebappUser.phone_number,
            )
        }
        q = (
            session.query(
                DeployedSensor,
                SensorAction,
                SensorModel,
                Department.name.label("department_name"),
                Location.name.label("location_name"),
                SensorUnitType.unit_type.label("unit_type_name"),
            )
            .outerjoin(
                SensorAction,
                and_(
                    DeployedSensor.id == SensorAction.deployed_sensor_id,
                    SensorAction.active,
                ),
            )
            .join(Location, Location.id == DeployedSensor.location_id)
            .outerjoin(Department, Department.id == DeployedSensor.department_id)
            .join(SensorModel, SensorModel.id == DeployedSensor.sensor_model_id)
            .outerjoin(SensorUnitType, SensorUnitType.id == DeployedSensor.unit_type_id)
            .filter(
                DeployedSensor.location_id.in_(l_ids), DeployedSensor.id == sensor_id
            )
        )
        response = {}
        for ds, sa, sm, dep_name, loc_name, unit_type_name in q:
            entry = response.get(
                ds.id,
                dict(
                    ds.as_json(),
                    sensor_id=ds.id,
                    actions=[],
                    sensor_model=sm.as_json(),
                    department_name=dep_name,
                    location_name=loc_name,
                    unit_type=unit_type_name,
                ),
            )
            response[ds.id] = entry
            if sa is not None:
                entry["actions"].append(sa.as_json(users))
        return dict(data=json_zip(camelize(response)))


@bp_sensors.route("/sensors/crud/{sensor_id}", methods=["POST"], authorizer=auth)
def sensor_update(sensor_id):
    # logged in helper
    if not sensor_id:
        raise BadRequestError("A sensor_id is required")
    sensor_id = _sensor_crud_helper(sensor_id=sensor_id)
    return get_sensor(sensor_id)


@bp_sensors.route("/sensors/crud", methods=["POST"], authorizer=auth)
def sensor_create():
    # Logged in helper
    sensor_id = _sensor_crud_helper(sensor_id=None)
    return get_sensor(sensor_id)


def __action_crud_helper(session, sensor_id, actions):
    # This is insecure and most only be called with validated actions:
    for a in actions:
        if not a["high_limit"]:
            try:
                int(a["high_limit"])
            except Exception:
                a["high_limit"] = None
        if not a["low_limit"]:
            try:
                int(a["low_limit"])
            except Exception:
                a["low_limit"] = None
        if a["high_limit"] is None and a["low_limit"] is None:
            continue
        a["deployed_sensor_id"] = sensor_id
        if a.get("data_type"):
            a["data_type"] = a["data_type"].upper()
        if a.get("criticality"):
            a["criticality"] = a["criticality"].upper()
        if "id" not in a or a["id"] is None:
            action = SensorAction(
                id=str(uuid.uuid4()),
                created_when=datetime.datetime.now(),
                last_modified_when=datetime.datetime.now(),
                active=a.pop("active", True),
                **a,
            )
            session.add(action)
        else:
            session.query(SensorAction).filter(SensorAction.id == a["id"]).update(a)
    session.commit()


def _sensor_crud_helper(sensor_id):
    user_id = get_authorized_user_id(bp_sensors.current_request)
    perms = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["edit_sensors"]
    )
    l_ids = perms["l_ids"]
    d_ids = perms["d_ids"]
    if not l_ids:
        raise BadRequestError("Invalid request")
    json_body = decamelize(bp_sensors.current_request.json_body)
    if sensor_id is not None:
        __log_interaction(
            dict(sensor_id=sensor_id, **json_body), INTERACTION_TYPE.EDIT_SENSOR_DETAILS
        )
    else:
        __log_interaction(json_body, INTERACTION_TYPE.CREATE_SENSOR)

    if "location_id" not in json_body or "sensor_model_id" not in json_body:
        raise BadRequestError("You must have a sensor model and location")
    if json_body["location_id"] not in l_ids:
        raise BadRequestError(
            "Invalid request. You don't have permission on the given location"
        )
    if "department_id" in json_body and json_body["department_id"] not in d_ids:
        raise BadRequestError(
            "Invalid request. You don't have permission on the given department"
        )
    # Still misses the check if the department _id is in the location_id

    sensor_settings = dict(
        **json_body,
        created_when=datetime.datetime.now(),
        last_modified_when=datetime.datetime.now(),
    )
    if "tag" in sensor_settings:
        sensor_settings["tag"] = [a for a in sensor_settings["tag"] if a]
    actions = sensor_settings.pop("actions", [])

    with get_session() as session:
        if sensor_id is None:
            sensor = DeployedSensor(id=str(uuid.uuid4()), **sensor_settings)
            session.add(sensor)
            session.commit()
            session.refresh(sensor)
            sensor_id = sensor.id
        else:
            sensor_settings.pop("created_when")
            sensor = (
                session.query(DeployedSensor)
                .filter(
                    DeployedSensor.id == sensor_id,
                    DeployedSensor.location_id.in_(l_ids),
                )
                .update(sensor_settings)
            )
        __action_crud_helper(session=session, sensor_id=sensor_id, actions=actions)
    # Need to parse all of the actions too

    # send current sensor config to device
    request_android_config(location_id=json_body["location_id"])
    return sensor_id


def get_all_sas(session):
    q = (
        session.query(
            SensorAction.deployed_sensor_id,
            SensorAction.data_type,
            SensorAction.high_limit.label("sensor_max"),
            SensorAction.low_limit.label("sensor_min"),
            SensorAction.duration,
            SensorAction.suppress_until,
        )
        .filter(SensorAction.active == True)
        .order_by(SensorAction.criticality.desc())
    )
    ret = {}
    for r in q:
        try:
            dur = r.duration.total_seconds() / 60
        except Exception:
            dur = 0
        ret[(r.deployed_sensor_id, r.data_type)] = dict(r, duration_minutes=dur)
        ret[(r.deployed_sensor_id, r.data_type)].pop("duration", None)
    return ret


# intermediate copy so match current implementation
@bp_sensors.route("/sensors", methods=["GET"], authorizer=auth)
def get_sensors():
    user_id = get_authorized_user_id(bp_sensors.current_request)
    args = parse_and_decamlize_params(bp_sensors.current_request.query_params)
    __log_interaction(args, INTERACTION_TYPE.FETCH_SENSORS)

    level, targets = extract_filter_primary_key_and_vals(args)
    level = __convert_level_to_filters(level)
    start_date = args.get("start_date", None)
    end_date = args.get("end_date", None)
    if start_date is None or end_date is None:
        raise BadRequestError(
            f"Must include valid ['startDate', 'endDate']: [{start_date}, {end_date}] given."
        )

    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
        input_level=level,
        ids=targets,
    )
    if not l_ids:
        raise BadRequestError("Unapproved")
    with get_session() as session:
        q = (
            session.query(
                SensorData.local_created_when.label("created_when_local"),
                SensorData.created_when,
                Location.id.label("location_id"),
                Location.name.label("location_name"),
                DeployedSensor.name.label("sensor_name"),
                SensorData.sensor_id,
                SensorData.data_type.label("event_type"),
                SensorData.sensor_value,
                SensorData.sensor_unit,
            )
            .join(DeployedSensor, DeployedSensor.id == SensorData.sensor_id)
            .join(Location, Location.id == DeployedSensor.location_id)
            .filter(
                Location.id.in_(l_ids),
                SensorData.local_created_when >= args["start_date"],
                SensorData.local_created_when
                < parse(args["end_date"]) + timedelta(days=1),
                DeployedSensor.active == True,
            )
        )
        sensor_actions = get_all_sas(session)
        response = []
        for row in q:
            r = dict(row)
            r["created_when_local"] = format_as_java_time(row.created_when_local)
            r.pop("created_when")
            r["created_when_epoch"] = row.created_when.timestamp()
            r.update(
                sensor_actions.get(
                    (row.sensor_id, row.event_type),
                    {"sensor_min": None, "sensor_max": None, "duration_minutes": None},
                )
            )
            if r["sensor_unit"] == "C":
                r["sensor_unit"] = "F"
                r["sensor_value"] = r["sensor_value"] * 1.8 + 32
                if r["sensor_max"] is not None:
                    r["sensor_max"] = r["sensor_max"] * 1.8 + 32
                if r["sensor_min"] is not None:
                    r["sensor_min"] = r["sensor_min"] * 1.8 + 32
            response.append(r)
    return dict(data=json_zip(camelize(response)))


@bp_sensors.route("/sensors-overview", methods=["GET"], authorizer=auth)
def get_sensors_overview():
    user_id = get_authorized_user_id(bp_sensors.current_request)
    email = get_authorized_user_email(bp_sensors.current_request)
    args = parse_and_decamlize_params(bp_sensors.current_request.query_params)
    __log_interaction(args, INTERACTION_TYPE.FETCH_SENSOR_OVERVIEW)

    level, targets = extract_filter_primary_key_and_vals(args)
    level = __convert_level_to_filters(level)
    filters = [
        DeployedSensor.active == True,
    ]
    if level == "d_ids":
        d_ids = get_approved_permissions_per_level(
            user_id=user_id,
            required_permissions=["view_sensors_and_actions"],
            output_level="d_ids",
            input_level=level,
            ids=targets,
        )
        filters.append(DeployedSensor.department_id.in_(d_ids))
        if not d_ids:
            raise BadRequestError("Unapproved")

    else:
        l_ids = get_approved_permissions_per_level(
            user_id=user_id,
            required_permissions=["view_sensors_and_actions"],
            output_level="l_ids",
            input_level=level,
            ids=targets,
        )
        filters.append(DeployedSensor.location_id.in_(l_ids))
        # Exclude cooldown
        filters.append(DeployedSensor.sensor_model_id != 3)
        if not l_ids:
            raise BadRequestError("Unapproved")

    three_days_ago_dt = datetime.datetime.now() - datetime.timedelta(days=3)
    three_days_ago_str = three_days_ago_dt.isoformat()
    with get_session() as session:
        q_sensors = (
            session.query(
                DeployedSensor.id.label("sensor_id"),
                DeployedSensor.name.label("sensor_name"),
                DeployedSensor.tag,
                DeployedSensor.sensor_model_id,
                DeployedSensor.report_data_type,
                Location.name.label("location_name"),
                Location.id.label("location_id"),
            )
            .join(Location, Location.id == DeployedSensor.location_id)
            .filter(*filters)
        )

        # Pre-camelizing payload, doing it all at the end bottlenecks the request
        sensors = [camelize(dict(row)) for row in q_sensors]
        q_data = (
            session.query(
                SensorData.created_when,
                SensorData.data_type,
                SensorData.sensor_unit,
                SensorData.sensor_value,
                DeployedSensor.id.label("sensor_id"),
            )
            .distinct(SensorData.data_type, DeployedSensor.id)
            .outerjoin(
                DeployedSensor,
                (SensorData.sensor_id == DeployedSensor.id),
            )
            .order_by(
                SensorData.data_type,
                DeployedSensor.id,
                SensorData.created_when.desc(),
            )
            .filter(
                *filters,
                SensorData.created_when > three_days_ago_str,
            )
        )
        # Pre-camelizing payload, doing it all at the end bottlenecks the request
        sensor_data = [camelize(dict(row)) for row in q_data]
        TriggeredActionAlias = aliased(TriggeredAction)

        latest_ta_subq = (
            session.query(
                TriggeredActionAlias.id.label("ta_id"),
                TriggeredActionAlias.sensor_action_id.label("ta_sensor_action_id"),
                TriggeredActionAlias.is_out_of_range,
                TriggeredActionAlias.value,
                TriggeredActionAlias.data_type,
                TriggeredActionAlias.status,
                TriggeredActionAlias.consumed_when,
                TriggeredActionAlias.alert_start_when,
                TriggeredActionAlias.created_when,
            )
            .distinct(TriggeredActionAlias.sensor_action_id)
            .order_by(
                TriggeredActionAlias.sensor_action_id,
                TriggeredActionAlias.created_when.desc(),
            )
            .subquery()
        )
        q_actions = (
            session.query(
                DeployedSensor.id.label("sensor_id"),
                latest_ta_subq.c.is_out_of_range.label("ta_is_oor"),
                latest_ta_subq.c.value.label("ta_value"),
                latest_ta_subq.c.data_type.label("ta_data_type"),
                latest_ta_subq.c.status.label("ta_status"),
                latest_ta_subq.c.consumed_when.label("ta_consumed_when"),
                latest_ta_subq.c.alert_start_when.label("ta_alert_start_when"),
                latest_ta_subq.c.created_when.label("ta_created_when"),
                SensorAction.id.label("sa_id"),
                SensorAction.criticality,
                SensorAction.high_limit,
                SensorAction.low_limit,
                SensorAction.duration,
                SensorAction.alert_in_c,
                SensorAction.recurrence,
                SensorAction.data_type,
                SensorAction.active.label("sa_active"),
                SensorAction.suppress_until,
                SensorAction.last_reading_when,
                SensorAction.start_oor_sensor_data_id.label("sa_start_datum_id"),
            )
            .join(
                SensorAction,
                (SensorAction.deployed_sensor_id == DeployedSensor.id),
            )
            .outerjoin(
                latest_ta_subq, SensorAction.id == latest_ta_subq.c.ta_sensor_action_id
            )
            .order_by(SensorAction.created_when.desc(), SensorAction.id)
            .filter(*filters, SensorAction.active == True)
        )
        # Pre-camelizing data, doing it at the end bottlenecks the request
        action_data = [camelize(dict(row)) for row in q_actions]
        return_data = dict(
            data=json_zip(
                {
                    "sensors": sensors,
                    "sensorData": sensor_data,
                    "actionData": action_data,
                }
            )
        )
    return {**return_data}


@bp_sensors.route("/sensors/suppress/{sensorId}", methods=["POST"], authorizer=auth)
def suppress(sensorId):
    user_id = get_authorized_user_id(bp_sensors.current_request)
    email = get_authorized_user_email(bp_sensors.current_request)
    args = bp_sensors.current_request.json_body
    __log_interaction(
        dict(sensor_id=sensorId, **args), INTERACTION_TYPE.EDIT_SENSOR_DETAILS
    )

    suppress_until = args.get("suppressUntil", None)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["edit_actions"], output_level="l_ids"
    )
    if not l_ids:
        raise BadRequestError("No edit action permissions")
    with get_session() as session:
        q = (
            session.query(SensorAction)
            .select_from(DeployedSensor)
            .join(
                SensorAction,
                SensorAction.deployed_sensor_id == DeployedSensor.id
                and SensorAction.active == True,
            )
            .filter(
                DeployedSensor.id == sensorId, DeployedSensor.location_id.in_(l_ids)
            )
        )
        for sa in q:
            sa.suppress_until = func.to_timestamp(suppress_until)


@bp_sensors.route("/sensors/{sensorId}", methods=["GET"], authorizer=auth)
def get_sensor_data(sensorId):
    user_id = get_authorized_user_id(bp_sensors.current_request)
    email = get_authorized_user_email(bp_sensors.current_request)
    args = parse_and_decamlize_params(bp_sensors.current_request.query_params)
    print(f"Args in get sensor data are: {args}")
    __log_interaction(
        dict(sensor_id=sensorId, **args), INTERACTION_TYPE.FETCH_SENSOR_DATA
    )

    level, targets = extract_filter_primary_key_and_vals(args)
    level = __convert_level_to_filters(level)
    if args.get("start_date") is None or args.get("end_date") is None:
        raise BadRequestError(f'Must include valid ["startDate", "endDate"]')

    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
        input_level=level,
        ids=targets,
    )
    if not l_ids:
        raise BadRequestError(
            f"User is not authorized to access this endpoint {email} {user_id}"
        )

    start_date = datetime.datetime.strptime(args["start_date"], "%Y-%m-%d")
    # Parse to datetime and add a day
    end_date = datetime.datetime.strptime(args["end_date"], "%Y-%m-%d") + timedelta(
        days=1
    )

    print(f"Start date is: {start_date}, end_date is: {end_date}")
    with get_session() as session:
        q_sensor_data = (
            session.query(
                SensorData.data_type,
                SensorData.local_created_when.label("local_created_when"),
                SensorData.created_when,
                DeployedSensor.name.label("sensor_name"),
                DeployedSensor.id.label("sensor_id"),
                Location.id.label("location_id"),
                Location.name.label("location_name"),
                SensorData.sensor_unit,
                SensorData.sensor_value,
            )
            .join(DeployedSensor, DeployedSensor.id == SensorData.sensor_id)
            .join(Location, Location.id == DeployedSensor.location_id)
            .filter(
                SensorData.sensor_id == sensorId,
                DeployedSensor.location_id.in_(l_ids),
                SensorData.local_created_when >= start_date,
                SensorData.local_created_when < end_date,
            )
            .order_by(SensorData.data_type, SensorData.created_when.desc())
        )

        static_data = dict()
        extract_once_keys = ["location_id", "location_name", "sensor_id", "sensor_name"]

        for row in q_sensor_data:
            rd = dict(row)
            rd["created_when_epoch"] = row.created_when.timestamp()
            static_data.update(
                {
                    k: rd[k]
                    for k in extract_once_keys
                    if k not in static_data and rd.get(k) is not None
                }
            )
            data_type = rd["data_type"]
            if data_type in list(static_data.keys()):
                static_data[data_type]["data"].append(rd["sensor_value"])
                # static_data[data_type]["unit"].append(rd["sensor_unit"])
                static_data[data_type]["time_epoch"].append(rd["created_when_epoch"])
                static_data[data_type]["time_local"].append(
                    format_as_java_time(rd["local_created_when"])
                )
            else:
                static_data[data_type] = {
                    "data": [rd["sensor_value"]],
                    "unit": rd["sensor_unit"],
                    "time_epoch": [rd["created_when_epoch"]],
                    "time_local": [format_as_java_time(rd["local_created_when"])],
                }

        if not len(list(static_data.keys())) > 0:
            raise BadRequestError(
                "You lack permission for this sensor or there is no data"
            )

    return dict(data=json_zip(camelize(static_data)))


@bp_sensors.route("/sensors/templates", methods=["GET"], authorizer=auth)
def get_sensor_data():
    __log_interaction(None, INTERACTION_TYPE.FETCH_SENSOR_TEMPLATE)
    with get_session() as session:
        q = session.query(ReportTemplate.id, ReportTemplate.name).filter(
            ReportTemplate.report_type == "REALTIME_SENSOR"
        )
        return dict(data=json_zip(camelize([dict(r) for r in q])))


@bp_sensors.route("/sensors/users/{location_id}", methods=["GET"], authorizer=auth)
def get_users(location_id):
    __log_interaction(
        dict(location_id=location_id), INTERACTION_TYPE.FETCH_SENSOR_USERS
    )

    user_id = get_authorized_user_id(bp_sensors.current_request)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
    )
    location_id = int(location_id)
    if location_id not in l_ids:
        logging.info("Not approved")
        raise BadRequestError(
            f"Not approved to access users for this location {location_id}"
        )
    with get_session() as session:
        q = (
            session.query(
                WebappUser.id,
                WebappUser.email,
                WebappUser.phone_number,
                WebappUser.first_name,
            )
            .select_from(Location)
            .join(Customer, Customer.id == Location.customer_id)
            .join(
                CustomerUserAffiliation,
                CustomerUserAffiliation.customer_id == Customer.id,
            )
            .join(WebappUser, WebappUser.id == CustomerUserAffiliation.user_id)
            .filter(WebappUser.active == True, Location.id == location_id)
        )
        return dict(data=json_zip(camelize([dict(r) for r in q])))


@bp_sensors.route("/sensors/export", methods=["GET"], authorizer=auth)
def export_sensors():
    """Generates a CSV file on the backend for exporting all Sensors and Actions


    Requires 'view_sensors_actions' permission

    All user_ids are converted to Emails/phone numbers for rendering.
    Sensor actions are inflated out per sensor.

    Raises:
        BadRequestError: On invalid permissions or no sensors
    Returns:
        dict: data=b64zipped(dict(csv_file=file_contents))
    """
    __log_interaction(dict(), INTERACTION_TYPE.FETCH_SENSORS)
    user_id = get_authorized_user_id(bp_sensors.current_request)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
        output_level="l_ids",
    )
    if not l_ids:
        raise BadRequestError(
            "User doesn't have permission to access sensors on any location"
        )
    with get_session() as session:
        all_users = {
            u.id: dict(u)
            for u in session.query(
                WebappUser.id, WebappUser.email, WebappUser.phone_number
            )
        }
        q = (
            session.query(
                DeployedSensor.public_addr.label("Sensor ID"),
                DeployedSensor.name.label("Sensor Name"),
                Location.name.label("Location"),
                Department.name.label("Department"),
                DeployedSensor.tag[1].label("Category"),
                SensorAction.criticality.label("Alert Criticality"),
                SensorAction.high_limit.label("Alert High Limit"),
                SensorAction.low_limit.label("Alert Low Limit"),
                SensorAction.duration.label("Alert Suppression"),
                SensorAction.recurrence.label("Alert Recurrence"),
                SensorAction.to.label("Emails To"),
                SensorAction.cc.label("Emails CC"),
                SensorAction.bcc.label("Emails BCC"),
                SensorAction.phone_to.label("SMS #"),
            )
            .join(Location, Location.id == DeployedSensor.location_id)
            .outerjoin(Department, Department.id == DeployedSensor.department_id)
            .outerjoin(
                SensorAction,
                SensorAction.deployed_sensor_id == DeployedSensor.id
                and SensorAction.active == True,
            )
            .filter(
                DeployedSensor.location_id.in_(l_ids), DeployedSensor.active == True
            )
        )

        response = []
        for row in q:
            to_add = dict(row)
            to_add["Emails To"] = (
                (
                    "; ".join(
                        [all_users[u_id]["email"] for u_id in to_add["Emails To"]]
                    )
                    if to_add["Emails To"]
                    else None
                ),
            )
            to_add["Emails CC"] = (
                (
                    "; ".join(
                        [all_users[u_id]["email"] for u_id in to_add["Emails CC"]]
                    )
                    if to_add["Emails CC"]
                    else None
                ),
            )
            to_add["Emails BCC"] = (
                (
                    "; ".join(
                        [all_users[u_id]["email"] for u_id in to_add["Emails BCC"]]
                    )
                    if to_add["Emails BCC"]
                    else None
                ),
            )
            to_add["SMS #"] = (
                (
                    "; ".join([all_users[u_id]["email"] for u_id in to_add["SMS #"]])
                    if to_add["SMS #"]
                    else None
                ),
            )
            to_add["Alert Suppression"] = (
                f"{to_add['Alert Suppression']}"
                if to_add["Alert Suppression"]
                else None
            )
            to_add["Alert Recurrence"] = (
                f"{to_add['Alert Recurrence']}" if to_add["Alert Recurrence"] else None
            )
            response.append(to_add)
    if not response:
        raise BadRequestError("No Sensors found")

    with io.StringIO() as in_memory_file:
        output = DictWriter(in_memory_file, fieldnames=list(response[0].keys()))
        output.writeheader()
        output.writerows(response)
        in_memory_file.flush()
        in_memory_file.seek(0)
        return dict(data=json_zip(dict(csv_file=in_memory_file.read())))

        # Need to do a CSVDictWriter and an in memory file that we base64 and send.
