begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table transaction_details_temp
as
select * from transaction_details where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy transaction_details_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/transaction_details/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into transaction_details
using transaction_details_temp t
    on transaction_details.transaction_id = t.transaction_id
        and transaction_details.detail_no = t.detail_no
when matched then update set 
    product_id = t.product_id,
    quantity = t.quantity,
    unit_price = t.unit_price,
    sell_price = t.sell_price,
    discount_rate = t.discount_rate,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        transaction_id,
        detail_no,
        product_id,
        quantity,
        unit_price,
        sell_price,
        discount_rate,
        created_at,
        updated_at
    ) values (
        t.transaction_id,
        t.detail_no,
        t.product_id,
        t.quantity,
        t.unit_price,
        t.sell_price,
        t.discount_rate,
        t.created_at,
        t.updated_at
    )
;

end transaction;
