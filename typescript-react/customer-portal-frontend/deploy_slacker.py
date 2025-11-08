from urllib import request
import datetime
import json
import sys


def send_slack(stage, application, branch, error_msg):
    if "PROD" == stage:
        SLACK_URL = "https://hooks.slack.com/"
    else:
        SLACK_URL = "https://hooks.slack.com/"
    req = request.Request(
        SLACK_URL,
        data=json.dumps(
            {
                "text": f"*{stage.upper()} {application}*: {datetime.datetime.now() - datetime.timedelta(hours=4)}: "
                + error_msg
                + f" {branch}"
            }
        ).encode("ascii"),
        headers={"Content-Type": "application/json"},
    )
    request.urlopen(req)


if len(sys.argv) != 5:
    raise Exception(
        f"Not enough aguments {sys.argv} expects stage, application, branch, message"
    )

stage = sys.argv[1]
application = sys.argv[2]
branch = sys.argv[3]
message = sys.argv[4]

send_slack(stage, application, branch, message)
