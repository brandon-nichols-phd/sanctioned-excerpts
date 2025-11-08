import os
import subprocess
import sys
import json

CIRCLE_BRANCH = os.environ["CIRCLE_BRANCH"]
CIRCLE_BUILD_NUM = os.environ["CIRCLE_BUILD_NUM"]

DEPLOY_DEPENDENCIES = ["DbConfigs", "psycopg2", "webapp_dependencies"]
DEPLOY_FUNCTIONS = [
    f"webapp_{CIRCLE_BRANCH}_backend_get_goals",
]


RUNTIME = "python3.6"

deploy_lambda_command = [
    "aws",
    "lambda",
    "publish-layer-version",
    "--output",
    "json",
    "--compatible-runtime",
    RUNTIME,
    f"--layer-name",
    f"webapp-lambda-{CIRCLE_BRANCH}",
    "--description",
    '"Webapp backend lambda source"',
    f"--content",
    f"S3Bucket=webapp-lambda-backend-src,S3Key={CIRCLE_BRANCH}-{CIRCLE_BUILD_NUM}.zip",
]

print(deploy_lambda_command)
stream = subprocess.run(
    deploy_lambda_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
if stream.returncode != 0:
    print(f"FAILED: {stream}")
    sys.exit(stream.returncode)
details = json.loads(stream.stdout.decode())
layer_versions = [details["LayerVersionArn"]]

print(layer_versions)

get_layers = [
    "aws",
    "lambda",
    "list-layers",
    "--compatible-runtime",
    f"{RUNTIME}",
    "--output",
    "json",
]

stream = subprocess.run(get_layers, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
if stream.returncode != 0:
    print(f"FAILED: {stream}")
    sys.exit(stream.returncode)
layers = json.loads(stream.stdout.decode())["Layers"]


for layer in layers:
    if layer["LayerName"] in DEPLOY_DEPENDENCIES:
        layer_versions.append(layer["LatestMatchingVersion"]["LayerVersionArn"])

if len(layer_versions) != len(DEPLOY_DEPENDENCIES) + 1:
    print("CANNOT locate all deploy dependencies. Failing")
    sys.exit(-1)
pretty_versions = "\n\t".join(layer_versions)
print(f"Using layers --- {pretty_versions}")

for function in DEPLOY_FUNCTIONS:
    deploy_command = (
        [
            "aws",
            "lambda",
            "update-function-configuration",
            "--function-name",
            function,
            "--layers",
        ]
        + layer_versions
        + ["--output", "json", "--runtime", RUNTIME]
    )
    stream = subprocess.run(
        deploy_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if stream.returncode != 0:
        print(f"FAILED to deploy {function}: {stream}")
        sys.exit(stream.returncode)
    print(f"Deployed {function}")
