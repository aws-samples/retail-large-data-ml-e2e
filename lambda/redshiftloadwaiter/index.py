from aws_lambda_powertools import Logger
import os, boto3

logger = Logger(service="loadWaiter", level="DEBUG")
rs = boto3.client("redshift-data")


def is_loading_completed(load_request_id):
    response = rs.describe_statement(Id=load_request_id)
    status = response["Status"]
    if status == "FAILED":
        logger.error(response)
        raise Exception()
    if status == "FINISHED":
        logger.debug(response)
        return True

    return False


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    request_id = event["id"]
    is_completed = is_loading_completed(request_id)
    if not is_completed:
        return False
