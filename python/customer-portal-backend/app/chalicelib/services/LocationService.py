from sqlalchemy.sql.expression import outerjoin
from backendlib.schemas.users import UserSchema
from backendlib.models import (
    Department,
    Employee,
    Location,
    WebappWeeklyGoals,
    Station,
    ActiveForm,
    Form,
)
from chalice import NotFoundError, BadRequestError
from backendlib.sessionmanager import get_session
from datetime import datetime
from chalicelib.services import PermissionService
import uuid
from datetime import datetime
from sqlalchemy import or_
import traceback

user_schema = UserSchema()


def get_loc_names(loc_ids):
    with get_session() as session:
        result = (
            session.query(Location.id, Location.name)
            .filter(Location.id.in_(loc_ids))
            .all()
        )

        final = [
            {"locationId": loc_id, "locationName": loc_name}
            for loc_id, loc_name in result
        ]

    return final


def bulk_upload_employees(loc_id, items_to_add):
    now_timestamp = datetime.now()
    with get_session() as session:
        result = (
            session.query(
                Employee.employee_code, Employee.first_name, Employee.last_name
            )
            .filter(
                Employee.location_id == loc_id,
                Employee.employee_code != None,
                Employee.active == True,
            )
            .all()
        )

        existing_emp_codes = (
            [code for code, f_name, l_name in result] if len(result) > 0 else []
        )
        emp_codes_to_add = [x["CODE"] for x in items_to_add]
        already_existing_codes = list(
            set(existing_emp_codes).intersection(set(emp_codes_to_add))
        )

        if len(already_existing_codes) > 0:
            errorString = f"""Employees must have unique employee codes.\nThe following of the provided codes are already in use: {", ".join(already_existing_codes)}"""
            return False, errorString
        inserted = set()
        for item in items_to_add:
            f_name = item["FIRSTNAME"]
            l_name = item["LASTNAME"]
            code = item["CODE"]
            if code in inserted:
                raise BadRequestError(f"Duplicate user codes: {code}")
            generated_id = str(uuid.uuid4())
            emp = Employee(
                id=generated_id,
                location_id=loc_id,
                first_name=f_name,
                last_name=l_name,
                employee_code=code,
                active=True,
                registered_when=now_timestamp,
                last_edited_when=now_timestamp,
            )
            session.add(emp)
            inserted.add(code)
        session.commit()

    return True, "SUCCESS"


def get_my_location_details(user_id, loc_id):
    with get_session() as session:
        found_item = (
            session.query(
                Location.id,
                Location.name,
                Location.address,
                Location.contact_name,
                Location.email,
                Location.phone_number,
                Location.timezone,
                WebappWeeklyGoals.goals,
                Location.customer_id,
            )
            .filter(Location.id == loc_id)
            .outerjoin(WebappWeeklyGoals)
            .first()
        )

        c_id = found_item[8]
        if not found_item:
            raise NotFoundError("No result found..")

        loc_id_int = int(loc_id)

        all_location_edit = PermissionService.get_l_ids_with_given_lgb_perms(
            user_id, ["edit_location"]
        )
        all_goals_edit = PermissionService.get_l_ids_with_given_lgb_perms(
            user_id, ["set_goals"]
        )
        all_upload_employees = PermissionService.get_l_ids_with_given_lgb_perms(
            user_id, ["upload_employees"]
        )

        allow_location_edit = loc_id_int in all_location_edit
        allow_goals_edit = loc_id_int in all_goals_edit
        allow_upload_employees = loc_id_int in all_upload_employees

        department_info = (
            session.query(
                Department.name.label("departmentName"),
                Department.id.label("departmentId"),
                Station.id.label("stationId"),
                Station.name.label("stationName"),
                Department.contact_name.label("contactName"),
            )
            .outerjoin(Station, Station.department_id == Department.id)
            .filter(Department.location_id == loc_id)
        )

        form = (
            session.query(ActiveForm)
            .filter(ActiveForm.end_when == None, ActiveForm.location_id == loc_id_int)
            .first()
        )

        forms = session.query(
            Form.id, Form.form_type, Form.title, Form.owner_customer_id
        ).filter(
            Form.active == True,
            Form.owner_customer_id == c_id,
        )
        possible_forms = [dict(row) for row in forms]
        department_dict = {}
        for j in department_info:
            d = dict(j)
            d_info = department_dict.get(
                d["departmentId"],
                {
                    "departmentId": d["departmentId"],
                    "departmentName": d["departmentName"],
                    "contactName": d["contactName"],
                    "stations": [],
                },
            )
            d_info["stations"].append(
                {"stationId": d["stationId"], "stationName": d["stationName"]}
            )
            department_dict[d["departmentId"]] = d_info

        mapped_result = {
            "locationId": found_item[0],
            "name": found_item[1],
            "address": found_item[2],
            "contactName": found_item[3],
            "email": found_item[4],
            "phoneNumber": found_item[5],
            "timezone": found_item[6],
            "hasGoals": (found_item[7] != None),
            "customerId": c_id,
            "allowLocationEdit": allow_location_edit,
            "allowGoalsEdit": allow_goals_edit,
            "allowUploadEmployees": allow_upload_employees,
            "departmentDetails": list(department_dict.values()),
            "complianceForm": form._as_dict() if form else None,
            "possibleForms": possible_forms,
        }
        return mapped_result


def update_location(user_id, loc_id, update_schema, form_details):
    department_details = update_schema.pop("departmentDetails")
    compliance_form = form_details
    with get_session() as session:
        session.query(Location).filter(Location.id == loc_id).update(
            update_schema, synchronize_session="fetch"
        )
        for d in department_details:
            session.query(Department).filter(Department.id == d["departmentId"]).update(
                {"name": d["departmentName"], "contact_name": d["contactName"]}
            )
        set_compliance_form(session, loc_id, compliance_form)
        session.commit()
        return get_my_location_details(user_id, loc_id)


def set_compliance_form(session, location_id, form_details):
    current_form = session.query(ActiveForm).filter(
        ActiveForm.location_id == location_id, ActiveForm.end_when == None
    )
    did_update = False
    for form in current_form:
        if form.form_id == form_details.get("formId", None):
            did_update = True
            form.user_id_mode = form_details["userIdMode"]
            form.launch_on_scan = form_details["launchOnScan"]
            form.ends_with_scan = form_details["endsWithScan"]
            form.launch_after_scan = form_details["launchAfterScan"]
        else:
            form.end_when = datetime.now()
    if not did_update and form_details:
        session.add(
            ActiveForm(
                form_id=form_details["formId"],
                location_id=location_id,
                user_id_mode=form_details["userIdMode"],
                launch_on_scan=form_details["launchOnScan"],
                ends_with_scan=form_details["endsWithScan"],
                launch_after_scan=form_details["launchAfterScan"],
                created_when=datetime.now(),
            )
        )
    session.commit()
