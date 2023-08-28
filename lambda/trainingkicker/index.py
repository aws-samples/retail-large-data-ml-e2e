from aws_lambda_powertools import Logger
import json, boto3
from sagemaker import image_uris, script_uris, model_uris, hyperparameters
from sagemaker.estimator import Estimator
from urllib.parse import urlparse


logger = Logger(service="trainingkicker", level="DEBUG")
s3 = boto3.resource("s3")


def s3_path_join(*args):
    return "/".join(arg.strip("/") for arg in args)


def parse_s3_url(url):
    parsed = urlparse(url)
    if not parsed.netloc or not parsed.path:
        raise ValueError("URL could not be parsed")
    return parsed.netloc, parsed.path.lstrip("/")


def delete_empty_files(env):
    s3url = env.get("ML_SOURCE_S3URL_TRAINING")
    bucket_name, prefix = parse_s3_url(s3url)
    bucket = s3.Bucket(bucket_name)

    for obj in bucket.objects.filter(Prefix=prefix):
        if obj.size == 0:
            logger.info(f"Deleting {obj.key}...")
            obj.delete()


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    env = event.get("environments")
    delete_empty_files(env)
    train_model_id, train_model_version, train_scope = "lightgbm-regression-model", "*", "training"
    train_image_uri = image_uris.retrieve(
        region=None,
        framework=None,
        model_id=train_model_id,
        model_version=train_model_version,
        image_scope=train_scope,
        instance_type=env.get("TRAINING_INSTANCE_TYPE"),
    )
    logger.debug(f"train_image_uri={train_image_uri}")

    train_source_uri = script_uris.retrieve(model_id=train_model_id, model_version=train_model_version, script_scope=train_scope)
    logger.debug(f"train_source_uri={train_source_uri}")

    train_model_uri = model_uris.retrieve(model_id=train_model_id, model_version=train_model_version, model_scope=train_scope)
    logger.debug(f"train_model_uri={train_model_uri}")

    hyperparams = hyperparameters.retrieve_default(model_id=train_model_id, model_version=train_model_version)
    s3_output_location = env.get("TRAINING_OUT_S3URL")

    tabular_estimator = Estimator(
        role=env.get("ROLEARN_FOR_SAGEMAKER"),
        image_uri=train_image_uri,
        source_dir=train_source_uri,
        model_uri=train_model_uri,
        entry_point="transfer_learning.py",
        instance_count=1,
        instance_type=env.get("TRAINING_INSTANCE_TYPE"),
        max_run=360000,
        hyperparameters=hyperparams,
        output_path=s3_output_location,
    )
    logger.debug("Starting training")
    tabular_estimator.fit(env.get("ML_SOURCE_S3URL_TRAINING"), logs=True, wait=False, job_name=event.get("jobname"))
