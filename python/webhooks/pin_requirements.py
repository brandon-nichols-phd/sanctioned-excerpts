import requests
import re
import sys
import boto3
from botocore.exceptions import ClientError
import json
from pathlib import Path


# Different secret session because github secrets do not change across environments
secret_name = "Github-PAT"
region_name = "us-east-1"
gh_session = boto3.session.Session()
client = gh_session.client(service_name="secretsmanager", region_name=region_name)
try:
    get_secret_value_response = client.get_secret_value(SecretId=secret_name)
except ClientError as e:
    print("Could not retrieve Github secrets")
    raise e

gh_secrets = json.loads(get_secret_value_response["SecretString"])


# === CONFIGURATION ===
REPO = ""
PACKAGE_NAME = ""
REQUIREMENTS_FILE = "requirements.txt"
LOCK_FILE = "requirements.lock.txt"

REQUIREMENT_REGEX = re.compile(
    rf"^git\+https://github.com/{re.escape(REPO)}\.git@.*(#egg={re.escape(PACKAGE_NAME)})?$"
)


def get_latest_commit_sha(branch: str) -> str:
    print(f"Fetching latest commit SHA from branch '{branch}'...")
    pat = gh_secrets.get("Action PAT", " ")
    if not pat:
        raise RuntimeError("Missing GITHUB PAT")

    url = f"https://api.github.com/repos/{REPO}/commits/{branch}"
    headers = {
        "Authorization": f"Bearer {pat}",
        "Accept": "application/vnd.github+json",
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    return response.json()["sha"]


def update_requirements_file(sha: str):
    print(f"Updating {REQUIREMENTS_FILE} with SHA {sha}")
    new_line = f"git+https://github.com/{REPO}.git@{sha}"

    updated_lines = []
    found = False

    with open(REQUIREMENTS_FILE, "r") as f:
        for line in f:
            if REQUIREMENT_REGEX.match(line.strip()):
                updated_lines.append(new_line + "\n")
                found = True
            else:
                updated_lines.append(line)

    if not found:
        print(
            "Did not find a matching line to replace in requirements.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(REQUIREMENTS_FILE, "w") as f:
        f.writelines(updated_lines)

    print(f"✅ Updated {REQUIREMENTS_FILE}")


def write_lock_file():
    print(f"🔒 Writing {LOCK_FILE}...")
    content = Path(REQUIREMENTS_FILE).read_text()
    Path(LOCK_FILE).write_text(content)
    print(f"✅ Wrote {LOCK_FILE}")


def main():
    if len(sys.argv) != 2:
        print("Usage: python pin_requirements.py <branch>")
        sys.exit(1)

    branch = sys.argv[1]
    sha = get_latest_commit_sha(branch)
    # validate_commit_locally(sha)
    update_requirements_file(sha)
    write_lock_file()


if __name__ == "__main__":
    main()
