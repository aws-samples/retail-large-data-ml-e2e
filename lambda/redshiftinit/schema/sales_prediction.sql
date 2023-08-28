--11

drop schema if exists sales_prediction;

create external schema sales_prediction
from data catalog
database '<SALES_PREDICTION_DATABASENAME>'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
;

--Spectrumの外部スキーマを全ユーザーからクエリ可能にしておくため、usage権限を不要
grant usage on schema sales_prediction to PUBLIC;