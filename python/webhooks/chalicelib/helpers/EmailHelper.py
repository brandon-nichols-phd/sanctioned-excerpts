from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Category, Mail
from backendlib.secretsmanager import get_sendgrid_api_key as get_sendgrid_apikey
import logging


def send_template_based_email(
    template_id,
    from_email,
    to_emails,
    category,
    subject="",
    preheader="",
    email_data={},
    cc_emails=[],
    bcc_emails=[],
):
    to_emails = set(to_emails)
    cc_emails = set(cc_emails) - to_emails
    bcc_emails = (set(bcc_emails) - cc_emails) - to_emails
    message = Mail(from_email=from_email, to_emails=list(to_emails))
    for t in cc_emails:
        message.add_cc(t)
    for t in bcc_emails:
        message.add_bcc(t)
    message.template_id = template_id
    message.add_category(Category(category))
    subjects = {"subject": subject, "preheader": preheader}
    final_email_data = {**subjects, **email_data}
    message.dynamic_template_data = final_email_data

    sg = SendGridAPIClient(get_sendgrid_apikey())
    response = sg.send(message)

    logging.info(f"Sending: {message.get()}")

    final_response = (
        "success" if response.status_code == 202 else f"error: {response.status_code}"
    )
    return final_response
