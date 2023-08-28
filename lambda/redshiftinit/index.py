from aws_lambda_powertools import Logger
import os, boto3, time

logger = Logger(service="redhiftseeder", level="DEBUG")
rs = boto3.client("redshift-data")

REDSHIFT_WORKGROUP = os.environ["REDSHIFT_WORKGROUP"]
REDSHIFT_NAMESPACE = os.environ["REDSHIFT_NAMESPACE"]
REDSHIFT_DATABASENAME = os.environ["REDSHIFT_DATABASENAME"]
SALES_PREDICTION_DATABASENAME = os.environ["SALES_PREDICTION_DATABASENAME"]
ROLEARN_TO_READ_DATASOURCE = os.environ["ROLEARN_TO_READ_DATASOURCE"]
SECRET_ARN = os.environ["SECRET_ARN"]


def exec_statement(
    sql,
    by_admin,
    database=REDSHIFT_DATABASENAME,
):
    if by_admin:
        response = rs.execute_statement(SecretArn=SECRET_ARN, Database=database, Sql=sql, WorkgroupName=REDSHIFT_WORKGROUP)
    else:
        response = rs.execute_statement(Database=database, Sql=sql, WorkgroupName=REDSHIFT_WORKGROUP)

    id = response["Id"]
    while True:
        response = rs.describe_statement(Id=id)
        status = response["Status"]
        if status == "FAILED":
            logger.error(response)
            raise Exception()
        if status == "FINISHED":
            logger.debug(response)
            break
        time.sleep(5)
    return


def run_query_from_file(path, by_admin=False):
    print(path)
    with open(path, "r") as f:
        sql = f.read()
        sql = sql.replace("<SALES_PREDICTION_DATABASENAME>", SALES_PREDICTION_DATABASENAME)
        sql = sql.replace("<ROLEARN_TO_READ_DATASOURCE>", ROLEARN_TO_READ_DATASOURCE)
        exec_statement(sql, by_admin)


@logger.inject_lambda_context
def handler(event, context):
    logger.debug(event)
    print("===")
    print(event)
    run_query_from_file("schema/weather.sql")
    run_query_from_file("schema/categories.sql")
    run_query_from_file("schema/products.sql")
    run_query_from_file("schema/store_categories.sql")
    run_query_from_file("schema/stores.sql")
    run_query_from_file("schema/event_magnitudes.sql")
    run_query_from_file("schema/event_calendar.sql")
    run_query_from_file("schema/customers.sql")
    run_query_from_file("schema/transactions.sql")
    run_query_from_file("schema/transaction_details.sql")
    run_query_from_file("schema/daily_quantity.sql")
    run_query_from_file("schema/features.sql")
    run_query_from_file("schema/sales_prediction.sql", True)  # これは外部テーブルのSchema作成なので、adminで作成
