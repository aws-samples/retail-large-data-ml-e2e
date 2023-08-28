begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table transactions_temp
as
select * from transactions where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy transactions_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/transactions/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into transactions
using transactions_temp t
    on transactions.transaction_id = t.transaction_id
when matched then update set 
    store_id = t.store_id,
    customer_id = t.customer_id,
    total_amount = t.total_amount,
    tax_amount = t.tax_amount,
    payment_method = t.payment_method,
    transaction_timestamp = t.transaction_timestamp,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        transaction_id,
        store_id,
        customer_id,
        total_amount,
        tax_amount,
        payment_method,
        transaction_timestamp,
        created_at,
        updated_at
    ) values (
        t.transaction_id,
        t.store_id,
        t.customer_id,
        t.total_amount,
        t.tax_amount,
        t.payment_method,
        t.transaction_timestamp,
        t.created_at,
        t.updated_at
    )
;

end transaction;
