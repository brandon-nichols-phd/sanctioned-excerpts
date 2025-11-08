from dialpad import DialpadClient
from backendlib.secretsmanager import get_dialpad_token
import re
import logging

__DP_CLIENT = DialpadClient(token=get_dialpad_token())
__DP_USER_ID = ""
__DP_DEPARTMENT_ID = ""


def to_e164(phone_number):
    cleaned = re.sub("[^0-9]", "", phone_number)
    # already internationally formatted
    if phone_number[0] == "+":
        return "+" + cleaned
    # Us
    if len(cleaned) == 11 and cleaned[0] == "1":
        return "+" + cleaned
    if len(cleaned) == 10:
        return "+1" + cleaned

    logging.error(
        f"COULD NOT PARSE THE FOLLOWING PHONE NUMBER: {phone_number} -> {cleaned}"
    )
    return None


def send_sms(phone_numbers, message):
    """_summary_

    Args:
        phone_numbers (list): List of E.164 formatted phone numbers. If a number is not of this format it
                              is assumed to be North America +1 number
        message (String):  the text message to send
    """
    if len(message) >= 1500:
        logging.error(
            f"CANNOT SEND MESSAGE! {len(message)} exceeds the lenth of 1500 \n{message}"
        )
        return
    cleaned_numbers = [to_e164(phone) for phone in phone_numbers if to_e164(phone)]
    if not cleaned_numbers:
        logging.info(f"No valid phone numbers for this Request -> {message}")
        return
    for number in cleaned_numbers:
        try:
            response_code = __DP_CLIENT.sms.send_sms(
                user_id=__DP_USER_ID,
                to_numbers=[number],
                text=message,
                sender_group_id=__DP_DEPARTMENT_ID,
                sender_group_type="department",
            )
            logging.info(f"Got a response {response_code}")
        except Exception as e:
            logging.error(f"Failed to properly handle number {number} - {e}")
