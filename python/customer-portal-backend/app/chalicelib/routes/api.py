from chalice import BadRequestError, Blueprint
from backendlib.sessionmanager import get_session, render_query
from collections import defaultdict
from chalicelib.authorizer import auth_api, auth
from datetime import datetime, timedelta, timezone

from chalicelib.services.PermissionService import get_approved_permissions_per_level
from chalicelib.services.ApiService import (
    create_api_jwt,
    read_api_access,
    update_api_access,
)
from backendlib.helpers.defaulter_dict import DefaultingDictList
from sqlalchemy.sql import func, and_, case

from backendlib.models import (
    DeviceStatusMostRecent,
    LOCAL_TZ_DEVICE,
    Location,
    Station,
    Department,
    API_DEPARTMENT_ID,
    API_LOCATION_ID,
    API_STATION_ID,
    DeviceStatus,
    Scan,
    LOCAL_SCAN_TIME,
    Employee,
    API_EMPLOYEE_ID,
    HANDS_PRESENT,
    PrintedLabels,
    WebappUser,
    EMPLOYEE_NAME,
    DeployedSensor,
    SensorAction,
    SensorData,
    SensorUnitType,
    TriggeredAction,
    VendorLocationMapping,
)
from backendlib.utils import json_zip
from chalicelib.services.GoalService import get_open_close_dicts
import os
import datetime
import pytz
import logging
from dateutil.parser import parse
from backendlib.helpers.casing_converter import camelize, decamelize
import base64
import zlib
import json
from sqlalchemy.orm import aliased

bp_api = Blueprint(__name__)

__IS_PROD = "pathspot.app" in os.environ.get("DOMAIN")


def convert_utc_to_local(utc_dt, location_timezone):
    return func.timezone(location_timezone, utc_dt)
  

def serialize_datetime(dt):
    if dt is None:
        return None
    return f"{dt.replace(tzinfo=None)}"


def get_operational_time_window(target_date, timezone_str, detailed_scan_goal):
    """Get operational time window based on reset_time from detailed_scan_goal per day of week
    detailed_scan_goal is structured per day of week. Extract reset_time for the specific
    day of the week from target_date. If reset_time is set, use that time on target_date
    until just before that same time the next day. If not set, use midnight to midnight.

    Returns:
        tuple: (utc_start, utc_end, local_start, local_end)
    """
    try:
        local_tz = pytz.timezone(timezone_str)
    except:
        local_tz = pytz.utc

    # Get day of week (0=Monday, 6=Sunday)
    day_of_week = target_date.weekday()
    day_names = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]
    day_name = day_names[day_of_week]

    # Parse reset_time from detailed_scan_goal JSON for the specific day
    reset_time = None
    if detailed_scan_goal:
        try:
            goal_data = (
                json.loads(detailed_scan_goal)
                if isinstance(detailed_scan_goal, str)
                else detailed_scan_goal
            )
            # Try both lowercase (current format) and capitalized (new format) day names
            day_config = goal_data.get(day_name, {}) or goal_data.get(
                day_name.capitalize(), {}
            )
            reset_time = day_config.get("reset_time")
        except (json.JSONDecodeError, TypeError, AttributeError):
            pass

    # Set operational window start time
    if reset_time:
        try:
            # Parse reset_time (expected format like "06:00" or "6:00:00")
            time_parts = reset_time.split(":")
            reset_hour = int(time_parts[0])
            reset_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
            window_start = local_tz.localize(
                datetime.datetime.combine(
                    target_date, datetime.time(reset_hour, reset_minute, 0, 0)
                )
            )
            # End is just before the same time next day
            next_day = target_date + datetime.timedelta(days=1)
            window_end = local_tz.localize(
                datetime.datetime.combine(
                    next_day, datetime.time(reset_hour, reset_minute, 0, 0)
                )
            ) - datetime.timedelta(microseconds=1)
        except (ValueError, TypeError):
            # Invalid reset_time format, fall back to midnight-midnight
            reset_time = None

    if not reset_time:
        # Default: midnight to midnight
        window_start = local_tz.localize(
            datetime.datetime.combine(target_date, datetime.time(0, 0, 0, 0))
        )
        window_end = local_tz.localize(
            datetime.datetime.combine(target_date, datetime.time(23, 59, 59, 999999))
        )

    # Convert to UTC for database queries
    utc_start = window_start.astimezone(pytz.utc)
    utc_end = window_end.astimezone(pytz.utc)

    return utc_start, utc_end, window_start, window_end


def serialize_dict(d):
    r = {}
    l = []
    for k, v in d.items():
        try:
            if k.startswith("real_"):
                continue
        except:
            pass
        if isinstance(v, dict):
            v = serialize_dict(v)
        elif isinstance(v, datetime.datetime):
            v = serialize_datetime(v)
        if isinstance(k, int):
            l.append(v)
        else:
            r[k] = v
    return r or l


def b64zip(payload):
    compressed_bytes = base64.b64encode(zlib.compress(payload.encode("utf-8")))
    compressed_payload = compressed_bytes.decode("utf-8")
    return compressed_payload


def get_dates_from_query_params(query_params):
    if not query_params or (
        "date" not in query_params
        and ("start_date" not in query_params or "end_date" not in query_params)
    ):
        raise BadRequestError(
            "A query param of 'date' or 'start_date/end_date' are required"
        )
    start_date = query_params.get("start_date")
    end_date = query_params.get("end_date")
    single_date = query_params.get("date")

    is_single_date = False
    if not start_date and not end_date:
        is_single_date = True
        start_date = single_date
        end_date = single_date

    # Strict YYYY-MM-DD format validation
    def validate_date_format(date_str, param_name):
        if not date_str:
            raise ValueError(f"{param_name} is required")
        try:
            # Only accept YYYY-MM-DD format
            parsed_date = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            return parsed_date
        except ValueError:
            raise ValueError(
                f"Invalid date format for {param_name}. Please use YYYY-MM-DD format."
            )

    start_date_parsed = validate_date_format(
        start_date, "start_date" if not is_single_date else "date"
    )
    end_date_parsed = validate_date_format(
        end_date, "end_date" if not is_single_date else "date"
    )

    # Only allow past dates and today
    today = datetime.datetime.now().date()
    if start_date_parsed.date() > today:
        raise BadRequestError(
            f"Date cannot be in the future. Please use today or earlier dates."
        )
    if end_date_parsed.date() > today:
        raise BadRequestError(
            f"Date cannot be in the future. Please use today or earlier dates."
        )

    start_date = datetime.datetime.combine(start_date_parsed.date(), datetime.time(0))
    end_date = datetime.datetime.combine(end_date_parsed.date(), datetime.time(0))

    return start_date, end_date, is_single_date


@bp_api.middleware("http")
def wrap_response(event, get_response):
    """Generic wrapper to base64 zip all if it uses /api

    Args:
        event (AWSEvent): intiating event
        get_response (function): function that is being wrapped

    Returns:
        dict: base 64 encoded payload wrapped in a dictionary.
    """
    # logging.info(f"Got a request for {bp_api.current_request.context['resourcePath']}")
    if not bp_api.current_request.context["resourcePath"].startswith("/api"):
        return get_response(event)

    # Check if raw JSON is requested (skip compression)
    query_params = bp_api.current_request.query_params or {}
    raw_response = query_params.get("raw", "").lower() in ["true", "1", "yes"]

    response = get_response(event)
    # if not __IS_PROD:
    #     return response
    if response.status_code != 200:
        return response

    # Skip compression if raw response is requested
    if raw_response:
        if not isinstance(response.body, str):
            # Convert to camelCase but don't compress
            response.body = camelize(response.body)
        return response

    # Apply normal compression
    if isinstance(response.body, str):
        response.body = {"data": b64zip(response.body)}
    else:
        response.body = {"data": json_zip(camelize(response.body))}

    return response


@bp_api.route("/api-management", methods=["POST"], authorizer=auth)
def create_api_token():
    user_id = bp_api.current_request.context["authorizer"]["principalId"]
    json_body = decamelize(bp_api.current_request.json_body)
    if json_body is None:
        raise BadRequestError("A json body is required for this request")
    if "expiration" not in json_body:
        raise BadRequestError("An expiration is required for all tokens")
    if "name" not in json_body:
        raise BadRequestError("A name is required for all tokens")
    permissions = {
        k: v
        for k, v in json_body.items()
        if k.startswith("read") and isinstance(v, bool)
    }

    return create_api_jwt(
        user_id,
        name=json_body["name"],
        expiration=parse(json_body["expiration"]),
        **permissions,
    )


@bp_api.route("/api-management", methods=["GET"], authorizer=auth)
def list_all_api_tokens():
    user_id = bp_api.current_request.context["authorizer"]["principalId"]
    return read_api_access(user_id)


@bp_api.route("/api-management/{token_id}", methods=["POST"], authorizer=auth)
def update_api_token(token_id):
    json_body = decamelize(bp_api.current_request.json_body)
    user_id = bp_api.current_request.context["authorizer"]["principalId"]
    if json_body is None:
        raise BadRequestError("A json body is required for this request")

    update_api_access(
        user_id,
        token_id=token_id,
        permissions=json_body,
        active=json_body.get("active", True),
        name=json_body.get("name", True),
    )

    return read_api_access(user_id)


@bp_api.route("/api/device_status", methods=["GET"], authorizer=auth_api)
def device_status(internal_call=False):
    """Fetch the most recent device status in a variety of formats for all stations the associated user has access to

    Returns:
        list(dict()): List of dict
    """
    user_id = bp_api.current_request.context["authorizer"]["principalId"]
    approved_stations = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["view_devices"], output_level="s_ids"
    )
    if not approved_stations:
        return {}
    # logging.info(f" Checking {user_id} - {approved_stations}")
    with get_session() as session:
        q = (
            session.query(
                Station.name.label("station_name"),
                Department.name.label("department_name"),
                Location.name.label("location_name"),
                Station.id.label("real_station_id"),
                API_STATION_ID,
                API_DEPARTMENT_ID,
                API_LOCATION_ID,
                LOCAL_TZ_DEVICE.label("local_most_recent_ping"),
                DeviceStatus.status_when.label("utc_most_recent_ping"),
                Location.timezone,
                func.date_part("epoch", DeviceStatus.status_when).label(
                    "epoch_seconds"
                ),
            )
            .select_from(Station)
            .join(Location, Location.id == Station.location_id)
            .outerjoin(Department, Department.id == Station.department_id)
            .outerjoin(
                DeviceStatusMostRecent, DeviceStatusMostRecent.station_id == Station.id
            )
            .outerjoin(
                DeviceStatus,
                DeviceStatus.id == DeviceStatusMostRecent.device_status_id,
            )
            .filter(Station.id.in_(approved_stations), Station.active == True)
        )
        ret = {row.real_station_id: dict(row) for row in q}
        # logging.info(f"Got: {ret}")
        if not internal_call:
            return serialize_dict(ret)
        else:
            return ret


@bp_api.route("/api/scan_details", methods=["GET"], authorizer=auth_api)
def scan_details(internal_call=False):
    """Fetch the list of scans on a day

    Returns:
        list(dict()): lidst of all scan events on the given day
    """

    user_id = bp_api.current_request.context["authorizer"]["principalId"]

    start_date, end_date, _ = get_dates_from_query_params(
        bp_api.current_request.query_params
    )

    permissions = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["view_handwashes"]
    )
    approved_stations = permissions.get("s_ids")
    approved_locations = permissions.get("l_ids")

    REWASH_ROW = aliased(Scan)

    with get_session() as session:
        q = (
            session.query(
                LOCAL_SCAN_TIME.label("local_scan_time"),
                Scan.created_when.label("utc_scan_time"),
                func.date_part("epoch", Scan.created_when).label("epoch_seconds"),
                case(value=Scan.result, whens={0: True}, else_=False).label("is_clean"),
                Location.id.label("real_location_id"),
                Department.id.label("real_department_id"),
                Employee.id.label("real_employee_id"),
                Station.id.label("real_station_id"),
                Location.timezone,
                API_STATION_ID,
                API_DEPARTMENT_ID,
                API_LOCATION_ID,
                API_EMPLOYEE_ID,
                Station.name.label("station_name"),
                Location.name.label("location_name"),
                Department.name.label("department_name"),
                EMPLOYEE_NAME,
                (and_(REWASH_ROW.result == 0, Scan.result == 1)).label("has_rewash"),
            )
            .join(Station, Station.id == Scan.station_id)
            .join(Location, Location.id == Station.location_id)
            .outerjoin(Department, Department.id == Station.department_id)
            .outerjoin(Employee, Employee.id == Scan.employee_id)
            .outerjoin(
                REWASH_ROW,
                Scan.event_list[func.cardinality(Scan.event_list)] == REWASH_ROW.id,
            )
            .filter(
                Scan.created_when >= start_date.astimezone(pytz.utc),
                Scan.created_when
                < (
                    end_date.astimezone(pytz.utc) + datetime.timedelta(days=1, hours=12)
                ),
                HANDS_PRESENT,
                Station.active,
                Scan.station_id.in_(approved_stations),
            )
            .order_by(LOCAL_SCAN_TIME.desc())
        )

        d = q.all()

    date_list = [
        start_date + datetime.timedelta(days=x)
        for x in range((end_date - start_date).days + 1)
    ]

    data = []
    data_by_target_date = {}
    l_open, d_open = get_open_close_dicts(approved_locations)

    for target_date in date_list:
        # BEGINS TARGET DATE CODE
        if not approved_locations:
            if internal_call:
                return [], {}, {}
            return []

        dow = target_date.strftime("%a")

        l_open_close = {
            l_id: {
                "open_time": target_date
                + v.get(dow, {}).get("start_td", datetime.timedelta(seconds=0)),
                "close_time": target_date
                + v.get(dow, {}).get("end_td", datetime.timedelta(seconds=0)),
            }
            for l_id, v in l_open.items()
        }

        d_open_close = {
            d_id: {
                "open_time": target_date
                + v.get(dow, {}).get("start_td", datetime.timedelta(seconds=0)),
                "close_time": target_date
                + v.get(dow, {}).get("end_td", datetime.timedelta(seconds=0)),
            }
            for d_id, v in d_open.items()
        }

        def is_operational(row):
            if row.real_department_id and row.real_department_id in d_open_close:
                start = d_open_close[row.real_department_id]["open_time"]
                end = d_open_close[row.real_department_id]["close_time"]
            else:
                start = l_open_close[row.real_location_id]["open_time"]
                end = l_open_close[row.real_location_id]["close_time"]
            return row.local_scan_time < end and row.local_scan_time >= start

        def is_scan_acceptable(row):
            if row.local_scan_time.date() == target_date.date() or is_operational(row):
                return True
            return False

        def serialize_row(row, internal, dow):
            r = dict(row, during_operational_hours=is_operational(row))
            if not internal:
                r.update(
                    dict(
                        local_scan_time=serialize_datetime(row.local_scan_time),
                        utc_scan_time=serialize_datetime(row.utc_scan_time),
                        pull_date=f"{target_date.date()}",
                    )
                )
            for k in list(r.keys()):
                if k.startswith("real_"):
                    if r[k] is None:
                        r[k.split("real_")[-1]] = None
                    if not internal:
                        r.pop(k)
                elif k == "employee_name" and r[k] == " ":
                    r[k] = None
                    # ovveride the null hashing because that's breaking in SQL alchemy
            return r

        target_date_data = [
            serialize_row(row, internal_call, dow)
            for row in d
            if is_scan_acceptable(row)
        ]

        data = data + target_date_data
        data_by_target_date[target_date.strftime("%Y-%m-%d")] = {
            "data": target_date_data,
            "l_open_close": l_open_close,
            "d_open_close": d_open_close,
        }

    if internal_call:
        return data_by_target_date
    return data


def __store_in_lists(lists, key, value, is_open):
    for l in lists:
        l["all_scans"][key].append(value)
        if is_open:
            l["operational_hours_scans"][key].append(value)


def calc_employee_gap(start_time, end_time, scan_times):
    sorted_times = list(scan_times)
    sorted_times.sort()  # ascending order

    if start_time is not None and sorted_times[0] > start_time:
        sorted_times.insert(0, start_time)
    if end_time is not None and sorted_times[-1] < end_time:
        sorted_times.append(end_time)

    if len(sorted_times) == 1:
        return (end_time - start_time).total_seconds()

    gaps = []
    current = sorted_times[0]
    for t in sorted_times[1:]:
        gap = (t - current).total_seconds()
        current = t
        gaps.append(gap)
    return sum(map(lambda x: x**2, gaps)) / sum(gaps)


def __calculate_metrics(source_dict, start_times, end_times):
    """Times are assumed to be localized time. So we can shift to UTC/ get Epoch

    Args:
        source_dict (_type_): _description_
        start_times (_type_): _description_
        end_times (_type_): _description_

    Returns:
        _type_: _description_
    """
    result = DefaultingDictList()
    for s_id, s_open_close in source_dict.items():
        for k, s_values in s_open_close.items():
            scan_times = list(s_values["scan_time"])
            scan_times.sort(key=lambda x: x["local_scan_time"])
            result[s_id][f"{k}_first_scan"] = scan_times[0]
            result[s_id][f"{k}_last_scan"] = scan_times[-1]
            result[s_id][f"{k}_avg_seconds_between_scans"] = calc_employee_gap(
                start_time=start_times.get(s_id),
                end_time=end_times.get(s_id),
                scan_times=map(lambda x: x["local_scan_time"], scan_times),
            )
            result[s_id][f"{k}_total_washes"] = len(scan_times)
            result[s_id][f"{k}_total_contaminated"] = len(
                s_values.get("contam_times", [])
            )
            result[s_id][f"{k}_total_with_rewash"] = len(
                s_values.get("rewash_times", [])
            )

    return result


def __generate_dummy_metrics(open_close, target_date):
    dummy_times = {
        "local_scan_time": None,
        "utc_scan_time": None,
        "epoch_seconds": 0,
        "pull_date": target_date,
    }
    gap = (open_close["close_time"] - open_close["open_time"]).total_seconds()
    return {
        "all_scans_first_scan": dummy_times,
        "all_scans_last_scan": dummy_times,
        "all_scans_avg_seconds_between_scans": gap,
        "all_scans_total_washes": 0,
        "all_scans_total_contaminated": 0,
        "all_scans_total_with_rewash": 0,
        "operational_hours_scans_first_scan": dummy_times,
        "operational_hours_scans_last_scan": dummy_times,
        "operational_hours_scans_avg_seconds_between_scans": gap,
        "operational_hours_scans_total_washes": 0,
        "operational_hours_scans_total_contaminated": 0,
        "operational_hours_scans_total_with_rewash": 0,
    }


def __is_offline(status_dict, close_time):
    return status_dict.get("local_most_recent_ping") is None or status_dict.get(
        "local_most_recent_ping"
    ) - close_time < datetime.timedelta(hours=1)


def __prepoulate_empty_struct(data, statuses, l_open_close, d_open_close, target_date):
    ret = DefaultingDictList()
    for row in data:
        s_id = row.real_station_id
        d_id = row.real_department_id
        l_id = row.real_location_id
        l_target = ret["locations"][l_id]
        l_target["location_name"] = row.location_name
        l_target["location_id"] = row.location_id
        l_target["timezone"] = row.timezone
        l_target["metrics"] = __generate_dummy_metrics(l_open_close[l_id], target_date)
        if d_id:
            d_target = l_target["departments"][d_id]
            d_target["department_name"] = row.department_name
            d_target["department_id"] = (
                row.department_id if row.real_department_id is not None else None
            )
            d_target["metrics"] = __generate_dummy_metrics(
                l_open_close[l_id], target_date
            )
            s_target = d_target["stations"][s_id]
            s_target["metrics"] = d_target["metrics"]
            s_target["offline_one_hour"] = __is_offline(
                statuses.get(s_id, {}), d_open_close[d_id]["close_time"]
            )
            d_target["offline_one_hour"] = (
                d_target.get("offline_one_hour", False) or s_target["offline_one_hour"]
            )
            l_target["offline_one_hour"] = (
                l_target.get("offline_one_hour", False) or d_target["offline_one_hour"]
            )
        else:
            s_target = l_target["stations"][s_id]
            s_target["metrics"] = l_target["metrics"]
            s_target["offline_one_hour"] = __is_offline(
                statuses.get(s_id, {}), l_open_close[l_id]["close_time"]
            )
            l_target["offline_one_hour"] = (
                l_target.get("offline_one_hour", False) or s_target["offline_one_hour"]
            )
        s_target["station_name"] = row.station_name
        s_target["station_id"] = row.station_id
    return ret


@bp_api.route("/api/label_details", methods=["GET"], authorizer=auth_api)
def labels_details(
    internal_call=False, start_date=None, end_date=None, location_id=None, user_id=None
):
    if not internal_call:
        request = bp_api.current_request
        query_params = request.query_params or {}
        user_id = request.context["authorizer"]["principalId"]
        start_date, end_date, is_single_date = get_dates_from_query_params(query_params)
        location_id = query_params.get("location_id")
    else:
        if not (start_date and end_date and user_id):
            return {"error": "Missing required params for internal call"}
        is_single_date = start_date == end_date

    permissions = get_approved_permissions_per_level(
        user_id=user_id, required_permissions=["assign_labels"]
    )
    approved_locations = permissions.get("l_ids", [])
    if not approved_locations:
        return {
            "status": "error",
            "message": "User does not have permissions for these locations",
        }

    if location_id:
        try:
            location_id = int(location_id)
        except ValueError:
            return {"error": "Invalid location_id"}

    with get_session() as session:
        q = (
            session.query(
                PrintedLabels.id.label("print_id"),
                Location.id.label("location_id"),
                Location.name.label("location_name"),
                PrintedLabels.item_name,
                PrintedLabels.category_name,
                PrintedLabels.phase_name,
                PrintedLabels.print_count,
                PrintedLabels.print_when.label("utc_print_when"),
                PrintedLabels.expiration_when.label("utc_expiration_when"),
                WebappUser.first_name,
                WebappUser.last_name,
                Location.timezone.label("location_timezone"),
            )
            .select_from(PrintedLabels)
            .join(Location, Location.id == PrintedLabels.location_id)
            .join(WebappUser, WebappUser.id == PrintedLabels.user_id)
            .filter(
                convert_utc_to_local(PrintedLabels.print_when, Location.timezone)
                >= start_date,
                convert_utc_to_local(PrintedLabels.print_when, Location.timezone)
                < end_date + timedelta(days=1),
                PrintedLabels.location_id.in_(approved_locations),
            )
        )

        if location_id:
            q = q.filter(PrintedLabels.location_id == location_id)

        results = q.all()
    output = {}
    for row in results:
        date_key = row.utc_print_when.strftime("%Y-%m-%d")
        user_name = (
            f"{row.first_name} {row.last_name}"
            if row.first_name and row.last_name
            else row.first_name
        )
        output.setdefault(date_key, {}).setdefault(row.location_id, []).append(
            {
                "location_name": row.location_name,
                "print_id": row.print_id,
                "item_name": row.item_name,
                "category_name": row.category_name,
                "phase_name": row.phase_name,
                "print_count": row.print_count,
                "utc_print_when": row.utc_print_when.isoformat(),
                "utc_expiration_when": (
                    row.utc_expiration_when.isoformat()
                    if row.utc_expiration_when
                    else None
                ),
                "location_timezone": row.location_timezone,
                "user_full_name": user_name,
            }
        )

    if is_single_date:
        return {
            "status": "success",
            "data": output.get(start_date.strftime("%Y-%m-%d"), {}),
        }

    return {"status": "success", "data": output}


@bp_api.route("/api/sensor_metrics", methods=["GET"], authorizer=auth_api)
def sensor_metrics(internal_call=False, location_id=None, user_id=None):
    if not internal_call:
        request = bp_api.current_request
        query_params = request.query_params or {}
        user_id = request.context["authorizer"]["principalId"]
        location_id = query_params.get("location_id")
    else:
        if not (location_id and user_id):
            return {"error": "Missing required params for internal call"}

    try:
        location_id = int(location_id)
    except (ValueError, TypeError):
        return {"error": "Invalid location_id"}

    permissions = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_sensors_and_actions"],
    )
    approved_locations = permissions.get("l_ids", [])
    if not approved_locations or location_id not in approved_locations:
        return {
            "status": "error",
            "message": "User does not have permissions for these locations",
        }

    with get_session() as session:
        # obtain most recent temp reading time
        sensor_data_sub = (
            session.query(
                SensorData.sensor_id,
                func.max(SensorData.created_when).label("last_temp_reading_time_utc"),
            )
            .join(DeployedSensor, DeployedSensor.id == SensorData.sensor_id)
            .filter(
                SensorData.data_type == DeployedSensor.report_data_type,
                DeployedSensor.location_id == location_id,
                DeployedSensor.active == True,
                DeployedSensor.sensor_model_id == 2,
            )
            .group_by(SensorData.sensor_id)
            .subquery()
        )
        # obtain sensor metrics for the most recent temp reading time
        sensor_max = (
            session.query(
                DeployedSensor.id.label("sensor_id"),
                DeployedSensor.name.label("sensor_name"),
                DeployedSensor.public_addr.label("sensor_eui"),
                DeployedSensor.tag.label("sensor_tag"),
                SensorUnitType.unit_type.label("sensor_unit_type"),
                Location.id.label("location_id"),
                Location.name.label("location_name"),
                Location.timezone.label("location_timezone"),
                DeployedSensor.report_data_type.label("primary_sensor"),
                sensor_data_sub.c.last_temp_reading_time_utc,
            )
            .join(Location, DeployedSensor.location_id == Location.id)
            .join(SensorUnitType, DeployedSensor.unit_type_id == SensorUnitType.id)
            .outerjoin(
                sensor_data_sub, DeployedSensor.id == sensor_data_sub.c.sensor_id
            )
            .filter(DeployedSensor.active == True, Location.id == location_id)
            .cte("sensor_max")
        )

        # obtain most recent sensor action details - this will help us determine if its alerting or not.
        alert_max = (
            session.query(
                TriggeredAction.sensor_id.label("sensor_id"),
                TriggeredAction.sensor_action_id.label("alert_id"),
                SensorAction.criticality.label("alert_criticality"),
                TriggeredAction.data_type.label("alerting_sensor"),
                SensorAction.high_limit,
                SensorAction.low_limit,
                SensorAction.duration.label("time_to_alert"),
                func.max(TriggeredAction.created_when).label("alert_time"),
            )
            .join(SensorAction, SensorAction.id == TriggeredAction.sensor_action_id)
            .join(DeployedSensor, DeployedSensor.id == TriggeredAction.sensor_id)
            .filter(
                SensorAction.active == True,
                DeployedSensor.active == True,
                DeployedSensor.location_id == location_id,
            )
            .group_by(
                TriggeredAction.sensor_id,
                TriggeredAction.sensor_action_id,
                SensorAction.criticality,
                TriggeredAction.data_type,
                SensorAction.high_limit,
                SensorAction.low_limit,
                SensorAction.duration,
            )
            .cte("alert_max")
        )

        sd = aliased(SensorData)
        ta = aliased(TriggeredAction)

        query = (
            session.query(
                sensor_max.c.location_id,
                sensor_max.c.location_name,
                sensor_max.c.location_timezone,
                sensor_max.c.sensor_id,
                sensor_max.c.sensor_eui,
                sensor_max.c.sensor_name,
                sensor_max.c.sensor_tag,
                sensor_max.c.sensor_unit_type,
                sensor_max.c.primary_sensor,
                sd.sensor_value.label("last_temp_reading"),
                sd.sensor_unit,
                sensor_max.c.last_temp_reading_time_utc,
                case([(ta.id.isnot(None), True)], else_=False).label("has_alert"),
                alert_max.c.alert_id,
                alert_max.c.alert_criticality,
                alert_max.c.alerting_sensor,
                ta.value.label("alert_temp"),
                ta.unit.label("alert_temp_unit"),
                alert_max.c.high_limit,
                alert_max.c.low_limit,
                ta.is_out_of_range,
                ta.consumed_when.label("last_alert_sent_time_utc"),
                case(
                    [
                        (
                            and_(
                                ta.alert_start_when
                                < func.now() - alert_max.c.time_to_alert,
                                ta.is_out_of_range == True,
                            ),
                            True,
                        )
                    ],
                    else_=False,
                ).label("is_alerting"),
            )
            .outerjoin(alert_max, sensor_max.c.sensor_id == alert_max.c.sensor_id)
            .outerjoin(
                sd,
                and_(
                    sd.sensor_id == sensor_max.c.sensor_id,
                    sd.created_when == sensor_max.c.last_temp_reading_time_utc,
                    sd.data_type == sensor_max.c.primary_sensor,
                ),
            )
            .outerjoin(
                ta,
                and_(
                    ta.sensor_action_id == alert_max.c.alert_id,
                    ta.created_when == alert_max.c.alert_time,
                ),
            )
            .order_by(sensor_max.c.last_temp_reading_time_utc.desc())
        )

        rows = query.all()

    # format output to have alerts nested as a list within sensor
    output = defaultdict(lambda: defaultdict(dict))
    for row in rows:
        date_key = (
            row.last_temp_reading_time_utc.strftime("%Y-%m-%d")
            if row.last_temp_reading_time_utc
            else "unknown"
        )
        loc_key = str(row.location_id)
        sensor_key = str(row.sensor_id)

        if sensor_key not in output[date_key][loc_key]:
            output[date_key][loc_key][sensor_key] = {
                "location_name": row.location_name,
                "location_timezone": row.location_timezone,
                "sensor_id": row.sensor_id,
                "sensor_eui": row.sensor_eui,
                "sensor_name": row.sensor_name,
                "sensor_tag": row.sensor_tag,
                "sensor_unit_type": row.sensor_unit_type,
                "primary_sensor": row.primary_sensor,
                "last_temperature_reading": row.last_temp_reading,
                "last_temperature_reading_time": (
                    row.last_temp_reading_time_utc.isoformat()
                    if row.last_temp_reading_time_utc
                    else None
                ),
                "alerts": [],
            }
        if row.alert_id:
            output[date_key][loc_key][sensor_key]["alerts"].append(
                {
                    "alert_id": row.alert_id,
                    "alert_criticality": row.alert_criticality,
                    "alerting_sensor": row.alerting_sensor,
                    "alert_temp": row.alert_temp,
                    "alert_temp_unit": row.alert_temp_unit,
                    "high_limit": row.high_limit,
                    "low_limit": row.low_limit,
                    "is_out_of_range": row.is_out_of_range,
                    "last_alert_sent_time_utc": (
                        row.last_alert_sent_time_utc.isoformat()
                        if row.last_alert_sent_time_utc
                        else None
                    ),
                    "is_alerting": row.is_alerting,
                }
            )
    final_output = {
        date: {
            location: list(sensors.values()) for location, sensors in loc_group.items()
        }
        for date, loc_group in output.items()
    }

    return {"status": "success", "data": final_output}


@bp_api.route("/api/location_metrics", methods=["GET"], authorizer=auth_api)
def location_metrics():
    # TODO query and fill an empty structure for offline locations
    start_date, end_date, is_single_date = get_dates_from_query_params(
        bp_api.current_request.query_params
    )

    scan_data_by_target_date = scan_details(internal_call=True)
    user_id = bp_api.current_request.context["authorizer"]["principalId"]

    approved = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_devices", "view_handwashes"],
        output_level="l_ids",
    )

    if not approved:
        return DefaultingDictList()

    statuses = device_status(internal_call=True)

    with get_session() as session:
        q = (
            session.query(
                Location.id.label("real_location_id"),
                Location.name.label("location_name"),
                API_LOCATION_ID,
                Location.timezone,
                Department.id.label("real_department_id"),
                Department.name.label("department_name"),
                API_DEPARTMENT_ID,
                Station.id.label("real_station_id"),
                Station.name.label("station_name"),
                API_STATION_ID,
            )
            .select_from(Location)
            .outerjoin(Station, Station.location_id == Location.id)
            .outerjoin(Department, Department.id == Station.department_id)
            .filter(Station.active == True, Location.id.in_(approved))
        )

        data = q.all()

    all_data = {}
    date_list = [
        start_date + datetime.timedelta(days=x)
        for x in range((end_date - start_date).days + 1)
    ]
    for target_date in date_list:
        target_date_key = target_date.strftime("%Y-%m-%d")
        scan_data = scan_data_by_target_date[target_date_key]
        scans = scan_data["data"]
        l_open_close = scan_data["l_open_close"]
        d_open_close = scan_data["d_open_close"]
        ret = __prepoulate_empty_struct(
            data=data,
            statuses=statuses,
            l_open_close=l_open_close,
            d_open_close=d_open_close,
            target_date=target_date_key,
        )
        station_stores = DefaultingDictList()
        department_stores = DefaultingDictList()
        location_stores = DefaultingDictList()
        anonymized_ids = {}

        s_parent = {}
        d_parent = {}
        s_to_d = {}
        # I get screwed by No departments.
        for scan in scans:
            d_id = scan["real_department_id"]
            l_id = scan["real_location_id"]
            s_id = scan["real_station_id"]
            e_id = scan["real_employee_id"]
            anonymized_ids[l_id] = scan["location_id"]
            anonymized_ids[d_id] = scan["department_id"]
            # Pre allocate our result structure based on all scans
            ret["locations"][l_id]["location_name"] = scan["location_name"]
            ret["locations"][l_id]["location_id"] = scan["location_id"]
            ret["locations"][l_id]["timezone"] = scan["timezone"]

            if d_id is not None:
                d_parent[d_id] = l_id
                s_to_d[s_id] = d_id
                ret["locations"][l_id]["departments"][d_id]["department_name"] = scan[
                    "department_name"
                ]
                ret["locations"][l_id]["departments"][d_id]["department_id"] = scan[
                    "department_id"
                ]
                ret["locations"][l_id]["departments"][d_id]["stations"][s_id][
                    "station_name"
                ] = scan["station_name"]
                ret["locations"][l_id]["departments"][d_id]["stations"][s_id][
                    "station_id"
                ] = scan["station_id"]

            else:
                ret["locations"][l_id]["stations"][s_id]["station_name"] = scan[
                    "station_name"
                ]
                ret["locations"][l_id]["stations"][s_id]["station_id"] = scan[
                    "station_id"
                ]

            s_parent[s_id] = l_id

            scan_time = dict(
                local_scan_time=scan["local_scan_time"],
                utc_scan_time=scan["utc_scan_time"],
                epoch_seconds=scan["epoch_seconds"],
                pull_date=target_date_key,
            )
            is_open = scan["during_operational_hours"]
            l_store = location_stores[l_id]
            d_store = department_stores[d_id]
            s_store = station_stores[s_id]
            targets = [l_store, d_store, s_store]
            __store_in_lists(targets, "scan_time", scan_time, is_open)
            if scan["is_clean"]:
                __store_in_lists(targets, "clean_times", scan_time, is_open)
            else:
                __store_in_lists(targets, "contam_times", scan_time, is_open)
                if scan["has_rewash"]:
                    __store_in_lists(targets, "rewash_times", scan_time, is_open)

        department_stores = department_stores.to_dict()
        location_stores = location_stores.to_dict()
        department_stores.pop(None, None)

        l_start = {l_id: v["open_time"] for l_id, v in l_open_close.items()}
        l_close = {l_id: v["close_time"] for l_id, v in l_open_close.items()}
        d_start = {d_id: v["open_time"] for d_id, v in d_open_close.items()}
        d_close = {d_id: v["close_time"] for d_id, v in d_open_close.items()}
        station_start = {s_id: l_start[l_id] for s_id, l_id in s_parent.items()}
        station_close = {s_id: l_close[l_id] for s_id, l_id in s_parent.items()}

        for s_id, d_id in s_to_d.items():
            if not d_id or d_id not in d_start:
                continue
            station_start[s_id] = d_start[d_id]
            station_close[s_id] = d_close[d_id]

        location_result = __calculate_metrics(
            location_stores, start_times=l_start, end_times=l_close
        )
        department_results = __calculate_metrics(
            department_stores, start_times=d_start, end_times=d_close
        )
        station_results = __calculate_metrics(
            station_stores, start_times=station_start, end_times=station_close
        )

        # move calculated results into the result structure
        for l_key, l_value in location_result.items():
            ret["locations"][l_key]["metrics"] = l_value

        for d_id, d_data in department_results.items():
            l_id = d_parent[d_id]
            ret["locations"][l_id]["departments"][d_id]["metrics"] = d_data

        for s_id, s_data in station_results.items():
            d_id = s_to_d.get(s_id)
            l_id = s_parent[s_id]
            if d_id is not None:
                ret["locations"][l_id]["departments"][d_id]["stations"][s_id][
                    "metrics"
                ] = s_data
            else:
                ret["locations"][l_id]["stations"][s_id]["metrics"] = s_data
        all_data[target_date_key] = serialize_dict(ret.to_dict())

    if is_single_date:
        return all_data[start_date.strftime("%Y-%m-%d")]

    return all_data


@bp_api.route("/api/dfs_metrics", methods=["GET"], authorizer=auth_api)
def dfs_metrics():
    """DFS metrics API endpoint for McDonald's integration

    Query params:
    - date: Single date (YYYY-MM-DD) OR
    - start_date & end_date: Date range (YYYY-MM-DD)
    - location_ids: Optional comma-separated list of dfs_vendor_location_ids
    - raw: Optional boolean (true/false) to return raw JSON instead of compressed

    Returns:
        JSON with metrics for each location&date combination
        Default: Compressed base64/zlib response
        With raw=true: Raw JSON response
    """
    query_params = bp_api.current_request.query_params or {}
    user_id = bp_api.current_request.context["authorizer"]["principalId"]

    # Handle date range - default to yesterday if not provided
    if (
        "start_date" not in query_params
        and "end_date" not in query_params
        and "date" not in query_params
    ):
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        start_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date
    else:
        try:
            start_date, end_date, _ = get_dates_from_query_params(query_params)
        except (ValueError, BadRequestError) as e:
            return {"error": "Invalid date format. Please use YYYY-MM-DD format."}

    # Get location filter if provided
    location_filter = query_params.get("location_ids")
    dfs_location_ids = []
    if location_filter:
        dfs_location_ids = [
            loc.strip() for loc in location_filter.split(",") if loc.strip()
        ]
        if not dfs_location_ids:
            return {"error": "Invalid location_ids parameter"}

    # Get user's approved locations
    permissions = get_approved_permissions_per_level(
        user_id=user_id,
        required_permissions=["view_handwashes", "view_devices"],
        output_level="l_ids",
    )
    approved_locations = permissions or []

    if not approved_locations:
        return {"error": "No accessible locations"}

    try:
        with get_session() as session:
            # Build query to get location mappings
            q = (
                session.query(
                    Location.id.label("location_id"),
                    Location.name.label("location_name"),
                    Location.timezone,
                    Location.scan_goal,
                    Location.detailed_scan_goal,
                    VendorLocationMapping.dfs_vendor_location_id.label(
                        "dfs_vendor_location_id"
                    ),
                )
                .select_from(Location)
                .outerjoin(
                    VendorLocationMapping,
                    and_(
                        VendorLocationMapping.location_id == Location.id,
                        VendorLocationMapping.active == True,
                    ),
                )
                .filter(Location.id.in_(approved_locations))
            )

        # Filter by requested location IDs if provided
        if dfs_location_ids:
            q = q.filter(
                VendorLocationMapping.dfs_vendor_location_id.in_(dfs_location_ids)
            )

        location_mappings = {row.location_id: row for row in q.all()}

        if not location_mappings:
            return {"error": "No matching locations found"}

        # Build results grouped by location
        results = []
        date_list = [
            start_date + datetime.timedelta(days=x)
            for x in range((end_date - start_date).days + 1)
        ]

        # Get scan data for all dates
        all_scan_data = {}
        all_device_data = {}

        for target_date in date_list:
            scan_data = get_location_scan_metrics(
                session, list(location_mappings.keys()), target_date
            )
            device_statuses = get_device_status_for_locations(
                session, list(location_mappings.keys()), target_date
            )
            all_scan_data[target_date] = scan_data
            all_device_data[target_date] = device_statuses

        # Group by location
        for location_id, mapping in location_mappings.items():
            date_entries = []

            # Add date entries
            for target_date in date_list:
                date_key = target_date.strftime("%Y%m%d")  # Format: 20250101

                location_data = all_scan_data[target_date].get(location_id, {})
                device_data = all_device_data[target_date].get(location_id, {})

                # Get operational time window based on reset_time for this day of week
                timezone_str = mapping.timezone or "UTC"
                detailed_scan_goal = mapping.detailed_scan_goal

                utc_start, utc_end, local_start, local_end = (
                    get_operational_time_window(
                        target_date, timezone_str, detailed_scan_goal
                    )
                )

                # Keep the times in local timezone with proper ISO format
                start_time_str = local_start.isoformat()
                end_time_str = local_end.isoformat()

                # Create date entry object
                date_entry = {
                    date_key: {
                        "localOperationalStartTime": start_time_str,
                        "localOperationalEndTime": end_time_str,
                        "operationalCompletedPercent": round(
                            calculate_completed_percent(
                                location_data, mapping.scan_goal
                            ),
                            2,
                        ),
                        "operationalContaminatedPercent": round(
                            calculate_rewash_recommended_percent(location_data), 2
                        ),
                        "operationalRewashPercent": round(
                            calculate_rewash_percent(location_data), 2
                        ),
                        "offlineDevice": check_offline_devices(
                            device_data, target_date
                        ),
                    }
                }

                date_entries.append(date_entry)

            # Create location object with locationUuid and dates array
            location_result = {
                "locationUuid": mapping.dfs_vendor_location_id,
                "dates": date_entries,
            }
            results.append(location_result)

        return results
    except Exception as e:
        logging.error(f"Database error in dfs_metrics: {e}")
        return {"error": "Internal server error"}


def get_location_scan_metrics(
    session, location_ids, target_date, location_mappings=None
):
    """Get scan metrics for specified locations on a given date

    IMPORTANT: This function needs to be called per location with proper timezone handling
    since each location may have different timezones and reset_times affecting the UTC scan time range.
    """
    # Get location timezone and detailed_scan_goal info first
    location_tz_query = session.query(
        Location.id.label("location_id"), Location.timezone, Location.detailed_scan_goal
    ).filter(Location.id.in_(location_ids))

    location_data = {row.location_id: row for row in location_tz_query.all()}

    results = {}

    # Process each location separately due to timezone and reset_time differences
    for location_id in location_ids:
        location_info = location_data.get(location_id)
        timezone_str = location_info.timezone if location_info else "UTC"
        detailed_scan_goal = location_info.detailed_scan_goal if location_info else None

        # Get operational time window based on reset_time for this day of week
        utc_start, utc_end, local_start, local_end = get_operational_time_window(
            target_date, timezone_str, detailed_scan_goal
        )

        # Query scans for contamination event analysis using event_list
        contamination_data = analyze_contamination_events(
            session, location_id, utc_start, utc_end
        )
        results[location_id] = contamination_data

    return results


def analyze_contamination_events(session, location_id, utc_start, utc_end):
    """Analyze contamination events using the event_list array structure

    The event_list on a contaminated scan contains IDs of subsequent scans that are part of the resolution attempt.
    - Resolved Event: The event_list contains scans where the final scan result is clean (0)
    - Unresolved Event: No event_list or the event chain doesn't end with a clean result

    Returns:
        dict: Contains total_scans, clean_scans, contamination_events, resolved_events, unresolved_events
    """

    # Get basic scan counts and contaminated scans with their event_list
    scans_query = (
        session.query(Scan.id, Scan.result, Scan.event_list)
        .join(Station, Station.id == Scan.station_id)
        .filter(
            Station.location_id == location_id,
            Station.active == True,
            Scan.created_when >= utc_start,
            Scan.created_when < utc_end,
            HANDS_PRESENT,
        )
    ).all()

    if not scans_query:
        return {
            "location_id": location_id,
            "total_scans": 0,
            "clean_scans": 0,
            "contaminated_scans": 0,
            "contamination_events": 0,
            "resolved_events": 0,
            "unresolved_events": 0,
        }

    # Process scans
    total_scans = len(scans_query)
    clean_scans = sum(1 for scan in scans_query if scan.result == 0)
    contaminated_scans = sum(1 for scan in scans_query if scan.result == 1)
    contamination_events = 0
    resolved_events = 0
    unresolved_events = 0

    # Create a lookup for scan results by ID
    scan_results = {scan.id: scan.result for scan in scans_query}

    # Group scans by their event_list to identify unique contamination events
    event_chains = {}
    for scan in scans_query:
        if scan.result == 1 and scan.event_list:
            event_key = tuple(scan.event_list)
            if event_key not in event_chains:
                event_chains[event_key] = []
            event_chains[event_key].append(scan)

    # Process each unique contamination event
    for event_list, scans_in_event in event_chains.items():
        contamination_events += 1

        final_event_id = event_list[-1]
        final_result = scan_results.get(final_event_id)

        if final_result == 0:
            resolved_events += 1
        else:
            unresolved_events += 1

    return {
        "location_id": location_id,
        "total_scans": total_scans,
        "clean_scans": clean_scans,
        "contaminated_scans": contaminated_scans,
        "contamination_events": contamination_events,
        "resolved_events": resolved_events,
        "unresolved_events": unresolved_events,
    }


def get_device_status_for_locations(session, location_ids, target_date):
    """Get device status for offline detection

    Check if devices were offline since before the end of the operational window
    """
    # Get location timezone and detailed_scan_goal info first
    location_tz_query = session.query(
        Location.id.label("location_id"), Location.timezone, Location.detailed_scan_goal
    ).filter(Location.id.in_(location_ids))

    location_data = {row.location_id: row for row in location_tz_query.all()}

    results = {}

    # Process each location separately due to timezone and reset_time differences
    for location_id in location_ids:
        location_info = location_data.get(location_id)
        timezone_str = location_info.timezone if location_info else "UTC"
        detailed_scan_goal = location_info.detailed_scan_goal if location_info else None

        # Get operational time window based on reset_time for this day of week
        utc_start, utc_end_of_day, local_start, local_end = get_operational_time_window(
            target_date, timezone_str, detailed_scan_goal
        )

        # Check that ALL devices have pinged AFTER the reference end time
        q = (
            session.query(
                Location.id.label("location_id"),
                func.count(Station.id).label("total_stations"),
                func.count(DeviceStatus.id).label("stations_with_status"),
                func.count(
                    case(
                        [(DeviceStatus.status_when > utc_end_of_day, Station.id)],
                        else_=None,
                    )
                ).label("stations_with_pings_after_end"),
            )
            .select_from(Location)
            .join(Station, Station.location_id == Location.id)
            .outerjoin(
                DeviceStatusMostRecent, DeviceStatusMostRecent.station_id == Station.id
            )
            .outerjoin(
                DeviceStatus, DeviceStatus.id == DeviceStatusMostRecent.device_status_id
            )
            .filter(Location.id == location_id, Station.active == True)
            .group_by(Location.id)
        )

        result = q.first()
        if result:
            result_dict = dict(result)
            result_dict["reference_end_time"] = utc_end_of_day
            results[location_id] = result_dict
        else:
            # No device data found
            results[location_id] = {
                "location_id": location_id,
                "total_stations": 0,
                "stations_with_status": 0,
                "stations_with_pings_after_end": 0,
                "reference_end_time": utc_end_of_day,
            }

    return results


def calculate_completed_percent(location_data, scan_goal=None):
    """Calculate completion percentage based on daily scan goal from location table"""
    total_scans = location_data.get("total_scans", 0) or 0
    daily_goal = scan_goal or 100  # Fallback to 100 if no scan_goal provided
    return (total_scans / daily_goal) * 100 if daily_goal > 0 else 0.0


def calculate_rewash_recommended_percent(location_data):
    """Calculate percentage of contaminated scans out of total scans"""
    total_scans = location_data.get("total_scans", 0) or 0
    contaminated_scans = location_data.get("contaminated_scans", 0) or 0
    return (contaminated_scans / total_scans) * 100 if total_scans > 0 else 0.0


def calculate_rewash_percent(location_data):
    """Calculate percentage of contamination events that were resolved"""
    contamination_events = location_data.get("contamination_events", 0) or 0
    resolved_events = location_data.get("resolved_events", 0) or 0
    return (
        (resolved_events / contamination_events) * 100
        if contamination_events > 0
        else 100.0
    )


def check_offline_devices(device_data, target_date):
    """Check if any devices were offline as of the end of the specified date

    Returns True if ANY device's most recent ping was on or before the reference end time.
    Only returns False if ALL devices have pinged AFTER the reference end time.
    """
    total_stations = device_data.get("total_stations", 0)
    stations_with_status = device_data.get("stations_with_status", 0)
    stations_with_pings_after_end = device_data.get("stations_with_pings_after_end", 0)

    # If no stations or no stations with any status data, consider offline
    if total_stations == 0 or stations_with_status == 0:
        return True

    # If not all stations with status have pinged after the reference end, consider offline
    return stations_with_pings_after_end < stations_with_status
