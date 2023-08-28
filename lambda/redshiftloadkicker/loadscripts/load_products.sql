begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table products_temp
as
select * from products where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy products_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/products/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into products
using products_temp t
    on products.product_id = t.product_id
when matched then update set 
    product_name = t.product_name,
    category_id = t.category_id,
    description = t.description,
    unit_price = t.unit_price,
    barcode = t.barcode,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        product_id,
        product_name,
        category_id,
        description,
        unit_price,
        barcode,
        created_at,
        updated_at
    ) values (
        t.product_id,
        t.product_name,
        t.category_id,
        t.description,
        t.unit_price,
        t.barcode,
        t.created_at,
        t.updated_at
    )
;

end transaction;
