from aws_lambda_powertools import Logger
import boto3, os, json, io
from urllib.parse import urlparse
import pandas as pd


logger = Logger(service="postinference", level="DEBUG")
s3 = boto3.resource("s3")
glue = boto3.client("glue")


def s3_path_join(*args):
    return "/".join(arg.strip("/") for arg in args)


def parse_s3_url(url):
    parsed = urlparse(url)
    if not parsed.netloc or not parsed.path:
        raise ValueError("URL could not be parsed")
    return parsed.netloc, parsed.path.lstrip("/")


def delete_files(dest_bucket_name, dest_filekey):
    if "/" in dest_filekey:
        directory_name = dest_filekey.rsplit("/", 1)[0] + "/"
    else:
        return

    bucket = s3.Bucket(dest_bucket_name)
    objects_to_delete = [{"Key": obj.key} for obj in bucket.objects.filter(Prefix=directory_name)]
    if objects_to_delete:
        bucket.delete_objects(Delete={"Objects": objects_to_delete})


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    env = event.get("environments")
    data_bucket_name, data_prefix = parse_s3_url(env.get("ML_SOURCE_S3URL_INFERENCE"))
    out_bucket_name, out_prefix = parse_s3_url(env.get("INFERENCE_OUT_S3URL"))
    dest_bucket_name, dest_prefix = parse_s3_url(env.get("DESTINATION_S3URL"))

    for obj in s3.Bucket(data_bucket_name).objects.filter(Prefix=data_prefix):
        filename = os.path.basename(obj.key)
        dt = env.get("PROCESSING_DATE")

        dest_filekey = f"year={dt[:4]}/month={dt[5:7]}/day={dt[8:10]}/{filename}.out.csv"
        data_filekey = s3_path_join(data_prefix, filename)
        out_filekey = s3_path_join(out_prefix, event.get("jobname"), filename + ".out")

        logger.debug(f"dest_filekey:{dest_filekey}")
        logger.debug(f"data_filekey:{data_filekey}")
        logger.debug(f"out_filekey:{out_filekey}")

        logger.debug(f"Get inference input data from {data_bucket_name} {data_filekey}")
        csv_obj = s3.Object(data_bucket_name, data_filekey)
        csv_data = pd.read_csv(
            io.StringIO(csv_obj.get()["Body"].read().decode()), usecols=[0, 1], header=None
        )  # usecols are product_id, store_id

        logger.debug(f"Get prediction data from {out_bucket_name}, {out_filekey}")
        json_obj = s3.Object(out_bucket_name, out_filekey)
        json_data = json.loads(json_obj.get()["Body"].read().decode())

        logger.debug(f"Uploading file to {dest_bucket_name} {dest_filekey}.out.csv")
        csv_data["processingdate"] = env.get("PROCESSING_DATE")
        csv_data["prediction"] = json_data["prediction"]
        csv_buffer = io.StringIO()
        csv_data.to_csv(csv_buffer, index=False, header=None)
        delete_files(dest_bucket_name, dest_filekey)
        s3.Object(dest_bucket_name, dest_filekey).put(Body=csv_buffer.getvalue())
    response = glue.start_crawler(Name=env.get("GLUE_CRAWLER"))
