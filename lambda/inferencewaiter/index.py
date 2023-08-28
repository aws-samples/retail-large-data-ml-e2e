from aws_lambda_powertools import Logger
import boto3

logger = Logger(service="inferencewaiter", level="DEBUG")
client = boto3.client("sagemaker")


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    job_name = event["jobname"]

    response = client.describe_transform_job(TransformJobName=job_name)
    status = response["TransformJobStatus"]
    if status == "Failed" or status == "Stopped":
        logger.error(response)
        raise Exception()
    if status == "Completed":
        logger.debug(response)
        return True
    return False
