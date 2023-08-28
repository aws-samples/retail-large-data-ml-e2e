begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table stores_temp
as
select * from stores where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy stores_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/stores/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into stores
using stores_temp t
    on stores.store_id = t.store_id
when matched then update set 
    store_category_id = t.store_category_id,
    store_name = t.store_name,
    total_floor_area = t.total_floor_area,
    city = t.city,
    prefecture = t.prefecture,
    postal_code = t.postal_code,
    phone = t.phone,
    email = t.email,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        store_id,
        store_category_id,
        store_name,
        total_floor_area,
        city,
        prefecture,
        postal_code,
        phone,
        email,
        created_at,
        updated_at
    ) values (
        t.store_id,
        t.store_category_id,
        t.store_name,
        t.total_floor_area,
        t.city,
        t.prefecture,
        t.postal_code,
        t.phone,
        t.email,
        t.created_at,
        t.updated_at
    )
;

end transaction;
