import os
from aws_lambda_powertools import Logger, Metrics, Tracer

stage = os.getenv("CHALICE_STAGE", "unknown")
service_base = os.getenv("POWERTOOLS_SERVICE_NAME", "UnknownService")

service_name = f"{service_base}-{stage}"

logger = Logger(service=service_name)
metrics = Metrics(namespace=service_name)
tracer = Tracer(service=service_name)
