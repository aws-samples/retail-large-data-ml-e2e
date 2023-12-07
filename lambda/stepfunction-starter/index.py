from aws_lambda_powertools import Logger
from datetime import datetime, timedelta, timezone
import os, boto3, json

logger = Logger(service="stepfunction-starter", level="DEBUG")
sfn = boto3.client("stepfunctions")

STEPFUNCTION_ARN = os.environ["STEPFUNCTION_ARN"]
REDSHIFT_WORKGROUP = os.environ["REDSHIFT_WORKGROUP"]
REDSHIFT_NAMESPACE = os.environ["REDSHIFT_NAMESPACE"]
REDSHIFT_DATABASENAME = os.environ["REDSHIFT_DATABASENAME"]
ROLEARN_TO_READ_DATASOURCE = os.environ["ROLEARN_TO_READ_DATASOURCE"]
ROLEARN_FOR_SAGEMAKER = os.environ["ROLEARN_FOR_SAGEMAKER"]
DATASOURCE_BUCKET_NAME = os.environ["DATASOURCE_BUCKET_NAME"]
ML_SOURCE_BUCKET_NAME = os.environ["ML_SOURCE_BUCKET_NAME"]
ML_TRAINING_OUT_BUCKET_NAME = os.environ["ML_TRAINING_OUT_BUCKET_NAME"]
ML_INFERENCE_OUT_BUCKET_NAME = os.environ["ML_INFERENCE_OUT_BUCKET_NAME"]
DESTINATION_BUCKET_NAME = os.environ["DESTINATION_BUCKET_NAME"]
TRAINING_INSTANCE_TYPE = os.environ["TRAINING_INSTANCE_TYPE"]
INFERENCE_INSTANCE_TYPE = os.environ["INFERENCE_INSTANCE_TYPE"]
INFERENCE_INSTANCE_COUNT = os.environ["INFERENCE_INSTANCE_COUNT"]
GLUE_CRAWLER = os.environ["GLUE_CRAWLER"]

JST = timezone(timedelta(hours=+9), "JST")


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    specified_date = event.get("processingDate")
    if specified_date is None:
        processing_date = (datetime.now(JST) - timedelta(days=1)).strftime(
            "%Y-%m-%d"
        )  # defaultは昨日
    else:
        processing_date = specified_date

    sfn_input = {
        "REDSHIFT_WORKGROUP": REDSHIFT_WORKGROUP,
        "REDSHIFT_NAMESPACE": REDSHIFT_NAMESPACE,
        "REDSHIFT_DATABASENAME": REDSHIFT_DATABASENAME,
        "ROLEARN_TO_READ_DATASOURCE": ROLEARN_TO_READ_DATASOURCE,
        "ROLEARN_FOR_SAGEMAKER": ROLEARN_FOR_SAGEMAKER,
        "DATASOURCE_BUCKET_NAME": DATASOURCE_BUCKET_NAME,
        "ML_SOURCE_S3URL_TRAINING": f"s3://{ML_SOURCE_BUCKET_NAME}/{processing_date}/train/",
        "ML_SOURCE_S3URL_INFERENCE": f"s3://{ML_SOURCE_BUCKET_NAME}/{processing_date}/inference/",
        "TRAINING_OUT_S3URL": f"s3://{ML_TRAINING_OUT_BUCKET_NAME}/{processing_date}/",
        "INFERENCE_OUT_S3URL": f"s3://{ML_INFERENCE_OUT_BUCKET_NAME}/{processing_date}/",
        "DESTINATION_S3URL": f"s3://{DESTINATION_BUCKET_NAME}/",
        "PROCESSING_DATE": processing_date,
        "TRAINING_INSTANCE_TYPE": TRAINING_INSTANCE_TYPE,
        "INFERENCE_INSTANCE_TYPE": INFERENCE_INSTANCE_TYPE,
        "INFERENCE_INSTANCE_COUNT": INFERENCE_INSTANCE_COUNT,
        "GLUE_CRAWLER": GLUE_CRAWLER,
    }
    sfn.start_execution(stateMachineArn=STEPFUNCTION_ARN, input=json.dumps(sfn_input))
