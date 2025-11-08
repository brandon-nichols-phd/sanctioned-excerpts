from backendlib.services.EmailService import EmailService, EMAIL_SRC
from chalicelib.services.SMSService import send_sms
from backendlib.models import AutomatedReport, ReportTemplate, WebappUser
from backendlib.utils import REVERSE_TEMPLATE_MAPPER
import logging


def send_alert(session, payload, template_class, location_id):
    reports = (
        session.query(AutomatedReport, ReportTemplate)
        .join(ReportTemplate, ReportTemplate.id == AutomatedReport.report_template_id)
        .filter(
            AutomatedReport.active.is_(True),
            AutomatedReport.locations == [location_id],
            AutomatedReport.report_template_id.in_(
                REVERSE_TEMPLATE_MAPPER[template_class]
            ),
        )
    )
    for report, template in reports:
        if EMAIL_SRC != "PROD":
            logging.info(f" {EMAIL_SRC} SKIPPING SENDING {template_class}")
            return

        phone_to = report.phone_to or []
        email_to = report.to or []
        email_cc = report.cc or []
        email_bcc = report.bcc or []
        users = set(phone_to + email_to + email_cc + email_bcc)

        if not users:
            logging.info(f" {EMAIL_SRC} No users set to receive alerts")
            return

        users_data = session.query(WebappUser).filter(
            WebappUser.id.in_(users), WebappUser.active.is_(True)
        )

        if "sms" in template.delivery_method:
            phone_numbers = [
                user.phone_number for user in users_data if user.id in phone_to
            ]
            if phone_numbers:
                send_sms(
                    phone_numbers=phone_numbers,
                    message=template.sms_string.format(**payload),
                )
        if report.to and "email" in template.delivery_method:
            to_emails = [user.email for user in users_data if user.id in email_to]
            cc_emails = [user.email for user in users_data if user.id in email_cc]
            bcc_emails = [user.email for user in users_data if user.id in email_bcc]

            if to_emails:
                EmailService.send_template_based_email(
                    template_id=template.send_grid_id,
                    from_email="cs@null.com",
                    to_emails=to_emails,
                    cc_emails=cc_emails,
                    bcc_emails=bcc_emails,
                    category=f"alert-{template_class}",
                )
