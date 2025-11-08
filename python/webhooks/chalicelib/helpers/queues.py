from aws_lambda_powertools import Logger
import os
import boto3

logger = Logger()
sqs = boto3.client("sqs")

# Used for ambient temp sensors
ambient_queue_name = f"queue.fifo"
ambient_queue_url = f"https://sqs.{ambient_queue_name}"

try:
    queue_reponse = sqs.create_queue(
        QueueName=ambient_queue_name,
        Attributes={
            "DelaySeconds": "0",
            "FifoQueue": "true",
            "ContentBasedDeduplication": "true",
        },
    )
except Exception as e:
    logger.error(
        f"Failed to create the queue {ambient_queue_name} due to lack of permissions should work on deploy {e}"
    )

# Used for process probe sensors
process_queue_name = f"process_queue.fifo"
process_queue_url = f"https://sqs.{process_queue_name}"

try:
    queue_reponse = sqs.create_queue(
        QueueName=process_queue_name,
        Attributes={
            "DelaySeconds": "0",
            "FifoQueue": "true",
            "ContentBasedDeduplication": "true",
        },
    )
except Exception as e:
    logger.error(
        f"Failed to create the queue {process_queue_name} due to lack of permissions should work on deploy {e}"
    )

# Used for gateway connection stats
gateway_queue_name = f"gw-queue"
gateway_queue_url = f"https://sqs.{gateway_queue_name}"

try:
    queue_reponse = sqs.create_queue(
        QueueName=gateway_queue_name,
        Attributes={
            "DelaySeconds": "0",
        },
    )
except Exception as e:
    logger.error(
        f"Failed to create the queue {gateway_queue_name} due to lack of permissions should work on deploy {e}"
    )
