import datetime
from chalice import Blueprint
from chalicelib.authorizer import auth
from chalicelib.authorizer import get_authorized_user_id
from chalicelib.services.PermissionService import (
    get_approved_permissions_per_level,
)
from backendlib.sessionmanager import get_session, render_query
from sqlalchemy import func, or_, and_, case, any_
from backendlib.utils import json_zip
from backendlib.helpers.casing_converter import camelize
from backendlib.utils import decamelize

from backendlib.models import (
    ReportConfig,
    ApprovalLog,
    Customer,
    DeployedSensor,
    Department,
    Location,
    SensorData,
    WebappUser,
    SensorUnitType,
)
from chalicelib.utils import logger

# Temp limits for default A3 Reports for Marriott
# TECHDEBT: Definitely only a matter of time before doing this type of thing causes yet another urgent issue.
DEFAULT_TEMP_LIMITS_C = {
    "fridge": {"high": 5, "low": None},
    "chiller": {"high": 5, "low": None},
    "freezer": {"high": -15, "low": None},
}


def check_unit_type_has_limits(unit_type):
    if unit_type is not None:
        category = unit_type.lower()

        matching_keys = [key for key in DEFAULT_TEMP_LIMITS_C if key in category]
    if matching_keys:
        most_specific_key = max(matching_keys, key=len)
        limits = DEFAULT_TEMP_LIMITS_C[most_specific_key]
    else:
        limits = dict(high=None, low=None)
    return limits


bp_reporting = Blueprint(__name__)

"""
This function gets all of the sensor approvals for a specified date.
General Requirements:
Report Generation
    1. Can only select one Location at time
    2. Can multiple selection departments
    3. Only select 1 date at a time
    4. Can select Only location or Only departments, Or Both
        a. Only Location:
            I. Generate report for all sensors in the location regardless of department
        b.  Only departments:
            I. Generate for a report for each deparment and append them into one file
        c. Both location and departments
            I. Generate Location report
            II. Generate department(s) report and append to location report.
Approval fetching:
    1. Can only do a single department or a single location at a time.
    2. Only select 1 date at a time
    3. If completed a sensor on a department level, it's approval shows up on the pure location generation

Args:
    location_id (_type_): _description_
    department_ids (_type_): List of departmetns to fetch
    report_config_id (_type_): _description_
    date (_type_): _description_
"""


@bp_reporting.route("/reporting/list-locations", methods=["GET"], authorizer=auth)
def list_locations():
    user_id = get_authorized_user_id(bp_reporting.current_request)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["generate_reports"], output_level="l_ids"
    )
    ret = dict()
    with get_session() as session:
        q = (
            session.query(
                Customer.id.label("customer_id"),
                Customer.name.label("customer_name"),
                Location.id.label("location_id"),
                Location.name.label("location_name"),
                Location.timezone.label("timezone"),
                Department.id.label("department_id"),
                Department.name.label("department_name"),
                func.sum(
                    case(value=DeployedSensor.active, whens={True: 1}, else_=0)
                ).label("sensor_count"),
            )
            .join(Customer, Customer.id == Location.customer_id)
            .outerjoin(Department, Department.location_id == Location.id)
            .outerjoin(
                DeployedSensor,
                DeployedSensor.location_id == Location.id
                and DeployedSensor.active == True,
            )
            .filter(Location.id.in_(l_ids))
            .group_by(
                Customer.id,
                Location.id,
                Department.id,
            )
        )
        for row in q:
            if row.location_id not in ret:
                ret[row.location_id] = {}
            ret[row.location_id]["location_id"] = row.location_id
            ret[row.location_id]["location_name"] = row.location_name
            ret[row.location_id]["timezone"] = row.timezone
            ret[row.location_id]["sensor_count"] = row.sensor_count
            ret[row.location_id]["customer_id"] = row.customer_id
            ret[row.location_id]["customer_name"] = row.customer_name
            departments_key = "departments"
            if row.department_id is not None:
                if ret[row.location_id].get(departments_key, None) is None:
                    ret[row.location_id][departments_key] = []
                ret[row.location_id][departments_key].append(
                    {
                        "department_name": row.department_name,
                        "department_id": row.department_id,
                    }
                )

    return_items = [camelize(value) for value in list(ret.values())]
    return dict(data=json_zip(return_items))


@bp_reporting.route("/reporting/list-reports", methods=["GET"], authorizer=auth)
def list_reports():
    return_items = [value for value in report_list_helper().values()]
    return dict(data=json_zip(camelize(return_items)))


def report_list_helper():
    user_id = get_authorized_user_id(bp_reporting.current_request)
    l_ids = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["generate_reports"], output_level="l_ids"
    )
    with get_session() as session:
        q = session.query(Location.customer_id).filter(Location.id.in_(l_ids))
        customers = set([x.customer_id for x in q])
        q_reports = session.query(
            ReportConfig.cadence,
            ReportConfig.name,
            ReportConfig.timing,
            ReportConfig.id,
            ReportConfig.reading_unit,
            ReportConfig.sensor_unit_type_ids,
            ReportConfig.customer_id,
        ).filter(ReportConfig.customer_id.in_(customers))
        to_ret = {row.id: dict(row) for row in q_reports}
        return to_ret


@bp_reporting.route("/reporting/approve-report", methods=["POST"], authorizer=auth)
def approve_a_day():
    """
    Expects as input {
        report_id: #
        report_date: date
        entries: [
            {
            sensor_id,
            reading_id,
            corrective_action,
            override_time,
            override_value,
            report_config_entry_index
            }
        ]
    }
    Returns:
        dict: success=True
    """
    args = decamelize(bp_reporting.current_request.json_body)
    user_id = get_authorized_user_id(bp_reporting.current_request)
    if int(args["report_id"]) not in report_list_helper():
        raise Exception("You do not have permission to use this report")

    to_insert = [
        ApprovalLog(
            report_config_id=args["report_id"],
            signer_id=user_id,
            report_date=args["report_date"],
            signed_when=datetime.datetime.now(),
            sensor_id=entry["sensor_id"],
            report_config_entry_index=entry["report_config_entry_index"],
            override_value=entry.get("override_value", None),
            corrective_action=entry["corrective_action"],
            reading_id=entry["reading_id"],
            override_time=(
                func.to_timestamp(entry["override_time"])
                if entry["override_time"]
                else None
            ),
        )
        for entry in args["entries"]
    ]
    sensor_ids = set([e["sensor_id"] for e in args["entries"]])
    approved_lids = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["generate_reports"], output_level="l_ids"
    )
    with get_session() as session:
        used_lids = set()
        for row in session.query(DeployedSensor.location_id).filter(
            DeployedSensor.id.in_(sensor_ids)
        ):
            used_lids.add(row.location_id)
        unapproved_lids = used_lids - approved_lids
        if unapproved_lids:
            raise Exception(
                f"Invalid permissions on L_ids {unapproved_lids} - approved: {approved_lids}"
            )
        session.add_all(to_insert)
    return dict(data=json_zip(dict(success=True)))


@bp_reporting.route("/reporting/approve-report", methods=["GET"], authorizer=auth)
def get_a_day():
    """
        Get a given reports approval day
        Expects: Location/Department_id, Date, Report_id
    Returns:
        dict(): {
            report_timing: JSON -- relevant fields are table, and checks
            readings: [{
                sensor_id
                sensor_name
                department_id,
                location_id,
                sensor_reading
                sensor_unit,
                sensor_check_id
                created_when
                sensor_active
            } ... ]
            signed:  [ApprovalLogs +signer_name for that date]
        }
    """
    args = decamelize(bp_reporting.current_request.query_params)
    if int(args["report_id"]) not in report_list_helper():
        raise Exception("You do not have permission to use this report")

    user_id = get_authorized_user_id(bp_reporting.current_request)
    l_id = args["location_id"]
    d_id = args.get("department_id", None)
    request_date = args["date"]
    if l_id:
        approved = get_approved_permissions_per_level(
            user_id=user_id,
            required_permissions=["generate_reports"],
            output_level="l_ids",
            ids=[l_id],
        )
    else:
        approved = get_approved_permissions_per_level(
            user_id=user_id,
            required_permissions=["generate_reports"],
            output_level="d_ids",
            ids=[d_id],
        )
    if not approved:
        raise Exception(
            f"Invalid request missing permission for the given parameters {user_id}"
        )

    with get_session() as session:
        """
        Get the most recent signed logs for each sensor, config, index combo
        """
        approval_log = [
            dict(
                a._as_dict(),
                signer_name=f"{first_name} {last_name}",
                reading_when=reading_when,
                reading_value=reading_value,
                reading_id=r_id,
            )
            for a, reading_when, reading_value, r_id, first_name, last_name in session.query(
                ApprovalLog,
                SensorData.created_when.label("reading_when"),
                SensorData.sensor_value.label("reading_value"),
                SensorData.id.label("reading_id"),
                WebappUser.first_name,
                WebappUser.last_name,
            )
            .distinct(
                ApprovalLog.sensor_id,
                ApprovalLog.report_config_entry_index,
                ApprovalLog.report_config_id,
            )
            .join(DeployedSensor, DeployedSensor.id == ApprovalLog.sensor_id)
            .join(WebappUser, WebappUser.id == ApprovalLog.signer_id)
            .outerjoin(SensorData, SensorData.id == ApprovalLog.reading_id)
            .filter(
                ApprovalLog.report_date == request_date,
                ApprovalLog.report_config_id == args["report_id"],
                or_(l_id is None, l_id == DeployedSensor.location_id),
                or_(d_id is None, d_id == DeployedSensor.department_id),
            )
            .order_by(
                ApprovalLog.sensor_id,
                ApprovalLog.report_config_entry_index,
                ApprovalLog.report_config_id,
                ApprovalLog.signed_when.desc(),
            )
        ]
        payload = dict(
            __get_readings_timing(session=session, request_date=request_date, **args),
            signed=approval_log,
            approved=str(approval_log),
        )
        return dict(data=json_zip(camelize(payload)))


def __get_readings_timing(
    session, report_id, request_date, location_id=None, department_id=None, **kwargs
):
    filters = []
    if location_id:
        filters.append(DeployedSensor.location_id == location_id)
    if department_id:
        filters.append(DeployedSensor.department_id == department_id)

    report_timing, unit_type_id_list = (
        session.query(ReportConfig.timing, ReportConfig.sensor_unit_type_ids)
        .filter(ReportConfig.id == report_id)
        .first()
    )
    readings = []
    or_filter = []
    if unit_type_id_list is not None:
        for unit_type_id in unit_type_id_list:
            or_filter.append(DeployedSensor.unit_type_id == unit_type_id)
        filters.append(or_(*or_filter))

        for i, check in enumerate(report_timing["checks"]):
            readings += [
                dict(reading, sensor_check_id=i)
                for reading in __get_check(
                    session=session,
                    filters=filters,
                    start=request_date + " " + check["start_time"],
                    end=request_date + " " + check["end_time"],
                    sensor_check_id=i,
                )
            ]

    return dict(report_timing=report_timing, readings=readings)


def __get_check(session, filters, start, end, sensor_check_id):
    """
    list of objects
                sensor_id
                sensor_name
                department_id,
                location_id,
                sensor_reading
                sensor_unit,
                sensor_check_id
                created_when

    Args:
        session (_type_): _description_
        filters (_type_): _description_
        start (_type_): _description_
        end (_type_): _description_
    """

    time_q_str_format = "%Y-%m-%d %H:%M:%S"
    check_start = None
    check_end = end
    check_start_nominal = datetime.datetime.strptime(start, time_q_str_format)
    if sensor_check_id > 0:
        check_start_dt = check_start_nominal - datetime.timedelta(hours=2)
        check_start = check_start_dt.strftime(time_q_str_format)

    else:
        check_start = start

    # DATA TYPE comes from the sensors report type!
    check_filters = list(filters) + [
        DeployedSensor.active == True,
    ]
    check_window_readings = (
        session.query(
            DeployedSensor.name.label("sensor_name"),
            DeployedSensor.tag.label("category"),
            DeployedSensor.department_id,
            DeployedSensor.location_id,
            DeployedSensor.active,
            DeployedSensor.id.label("sensor_id"),
            SensorData.sensor_value.label("sensor_reading"),
            SensorData.sensor_unit,
            SensorData.created_when,
            SensorData.local_created_when,
            SensorData.id.label("reading_id"),
            SensorUnitType.unit_type.label("unit_type"),
        )
        .join(Location, DeployedSensor.location_id == Location.id)
        .outerjoin(
            SensorData,
            and_(
                DeployedSensor.id == SensorData.sensor_id,
                DeployedSensor.report_data_type == SensorData.data_type,
                SensorData.local_created_when >= check_start,
                SensorData.local_created_when <= check_end,
            ),
        )
        .outerjoin(SensorUnitType, SensorUnitType.id == DeployedSensor.unit_type_id)
        .filter(
            *check_filters,
        )
        .order_by(DeployedSensor.id, SensorData.local_created_when.asc())
    )
    by_sensor = {}

    ret = {}
    for row in check_window_readings:
        if row.sensor_id in by_sensor:
            by_sensor[row.sensor_id].append(dict(row, out_of_range=False))
        else:
            by_sensor[row.sensor_id] = [dict(row, out_of_range=False)]

    for sensor_id in by_sensor:
        oor_start = None
        end_dt = None
        oor_interval_found = False
        last_oor_interval_reading = None
        last_ir_reading = None
        last_oor_reading = None
        n_readings = len(by_sensor[sensor_id])
        if n_readings > 0:
            for check_reading in by_sensor[sensor_id]:
                most_recent_reading = check_reading
                try:
                    sensor_category = check_reading["unit_type"].lower()
                except Exception as e:
                    logger.error(
                        f"No unit type for A3 for sensor_id {sensor_id} reading {check_reading}: {e}"
                    )
                limits = check_unit_type_has_limits(sensor_category)
                if limits.get("high", None) is not None:
                    # TECH DEBT: As it stands, no lower limits are ever set for A3
                    temp_limit = limits.get("high", None)
                    current_reading = check_reading["sensor_reading"]
                    if current_reading is not None and current_reading > temp_limit:
                        last_oor_reading = check_reading
                        oor_start = (
                            last_oor_reading["local_created_when"]
                            if oor_start is None
                            else oor_start
                        )
                        start_dt = oor_start
                        end_dt = last_oor_reading["local_created_when"]
                        oor_interval = end_dt - start_dt
                        if oor_interval >= datetime.timedelta(hours=2):
                            oor_interval_found = True
                            last_oor_interval_reading = last_oor_reading
                    else:
                        oor_start = None
                        end_dt = None
                        last_ir_reading = check_reading

                    # Determine
                    non_alert_reading_to_use = use_in_range_or_out_of_range(
                        last_ir_reading,
                        last_oor_reading,
                        time_q_str_format,
                        check_start_nominal,
                    )
                    if oor_interval_found and last_oor_interval_reading:
                        offset_naive_lcw_str = datetime.datetime.strftime(
                            last_oor_interval_reading["local_created_when"],
                            time_q_str_format,
                        )
                        offset_naive_lcw = datetime.datetime.strptime(
                            offset_naive_lcw_str, time_q_str_format
                        )
                        if offset_naive_lcw >= check_start_nominal:
                            last_oor_interval_reading["out_of_range"] = True
                            ret[sensor_id] = last_oor_interval_reading
                        elif non_alert_reading_to_use is not None:
                            ret[sensor_id] = non_alert_reading_to_use
                    elif non_alert_reading_to_use is not None:
                        ret[sensor_id] = non_alert_reading_to_use
                    else:
                        ret[sensor_id] = check_reading
                else:
                    ret[sensor_id] = most_recent_reading

    return ret.values()


def reading_eligible_for_check(reading, time_format, check_start):
    if reading["local_created_when"] is None:
        return False
    # Have to make it offset naive
    offset_naive_reading_dt_str = datetime.datetime.strftime(
        reading["local_created_when"], time_format
    )

    offset_naive_reading_dt = datetime.datetime.strptime(
        offset_naive_reading_dt_str, time_format
    )

    return True if offset_naive_reading_dt >= check_start else False


def use_in_range_or_out_of_range(in_range, out_of_range, time_format, check_start):
    in_range_eligible = in_range is not None and reading_eligible_for_check(
        in_range, time_format, check_start
    )
    out_of_range_eligible = out_of_range is not None and reading_eligible_for_check(
        out_of_range, time_format, check_start
    )
    return (
        in_range
        if in_range_eligible
        else out_of_range if out_of_range_eligible else None
    )
