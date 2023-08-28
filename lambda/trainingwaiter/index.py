from aws_lambda_powertools import Logger
import boto3

logger = Logger(service="trainingwaiter", level="DEBUG")
client = boto3.client("sagemaker")


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    job_name = event["jobname"]

    response = client.describe_training_job(TrainingJobName=job_name)
    status = response["TrainingJobStatus"]
    if status == "Failed" or status == "Stopped":
        logger.error(response)
        raise Exception()
    if status == "Completed":
        logger.debug(response)
        return True
    return False
