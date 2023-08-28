from aws_lambda_powertools import Logger
from datetime import datetime, timedelta, timezone
import os, boto3

logger = Logger(service="loadKicker", level="DEBUG")
rs = boto3.client("redshift-data")

JST = timezone(timedelta(hours=+9), "JST")


def run_query_from_file(path, processing_date, env):
    print(path)
    with open(path, "r") as f:
        sql = f.read()
        sql = sql.replace("<ROLEARN_TO_READ_DATASOURCE>", env.get("ROLEARN_TO_READ_DATASOURCE"))
        sql = sql.replace("<DATASOURCE_BUCKET_NAME>", env.get("DATASOURCE_BUCKET_NAME"))
        sql = sql.replace("<PROCESSING_DATE>", processing_date)
        sql = sql.replace("<ML_SOURCE_S3URL_TRAINING>", env.get("ML_SOURCE_S3URL_TRAINING"))
        sql = sql.replace("<ML_SOURCE_S3URL_INFERENCE>", env.get("ML_SOURCE_S3URL_INFERENCE"))
        logger.debug(sql)
        response = rs.execute_statement(Database=env.get("REDSHIFT_DATABASENAME"), Sql=sql, WorkgroupName=env.get("REDSHIFT_WORKGROUP"))
        logger.debug(response)
        return response["Id"]


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    env = event.get("environments")
    specified_date = env.get("PROCESSING_DATE")
    if specified_date is None:
        processing_date = (datetime.now(JST) - timedelta(days=1)).strftime("%Y-%m-%d")  # defaultは昨日
    else:
        processing_date = specified_date

    request_id = run_query_from_file(f"loadscripts/{event['scriptName']}.sql", processing_date, env)

    logger.debug("requested loading!!")
    logger.debug(request_id)
    return {"id": request_id}
