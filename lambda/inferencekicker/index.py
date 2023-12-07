from aws_lambda_powertools import Logger
import boto3
from sagemaker import image_uris, script_uris, Session, model
from urllib.parse import urlparse


logger = Logger(service="inferencekicker", level="DEBUG")
s3 = boto3.resource("s3")


def s3_path_join(*args):
    return "/".join(arg.strip("/") for arg in args)


def parse_s3_url(url):
    parsed = urlparse(url)
    if not parsed.netloc or not parsed.path:
        raise ValueError("URL could not be parsed")
    return parsed.netloc, parsed.path.lstrip("/")


def delete_empty_files(url):
    bucket_name, prefix = parse_s3_url(url)
    bucket = s3.Bucket(bucket_name)
    for obj in bucket.objects.filter(Prefix=prefix):
        if obj.size == 0:
            logger.info(f"Deleting {obj.key}...")
            obj.delete()
    return bucket_name


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    env = event.get("environments")
    dataset_url = env.get("ML_SOURCE_S3URL_INFERENCE")
    bucket_name = delete_empty_files(dataset_url)
    model_url = s3_path_join(
        env.get("TRAINING_OUT_S3URL"), event.get("jobname"), "output", "model.tar.gz"
    )
    train_model_id, train_model_version = "lightgbm-regression-model", "*"
    deploy_image_uri = image_uris.retrieve(
        region=None,
        framework=None,
        image_scope="inference",
        model_id=train_model_id,
        model_version=train_model_version,
        instance_type=env.get("INFERENCE_INSTANCE_TYPE"),
    )
    deploy_source_uri = script_uris.retrieve(
        model_id=train_model_id,
        model_version=train_model_version,
        script_scope="inference",
    )
    sm_model = model.Model(
        deploy_image_uri,
        model_data=model_url,
        role=env.get("ROLEARN_FOR_SAGEMAKER"),
        predictor_cls=None,
        sagemaker_session=Session(default_bucket=bucket_name),
        source_dir=deploy_source_uri,
        entry_point="inference.py",
    )
    sm_transformer = sm_model.transformer(
        instance_count=int(env.get("INFERENCE_INSTANCE_COUNT", 1)),
        instance_type=env.get("INFERENCE_INSTANCE_TYPE"),
        output_path=s3_path_join(env.get("INFERENCE_OUT_S3URL"), event.get("jobname")),
    )
    sm_transformer.transform(
        dataset_url,
        job_name=event.get("jobname"),
        content_type="text/csv",
        split_type="Line",
        wait=False,
    )
