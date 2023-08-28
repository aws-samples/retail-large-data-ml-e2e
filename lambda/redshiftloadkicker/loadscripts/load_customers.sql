begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table customers_temp
as
select * from customers where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy customers_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/customers/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into customers
using customers_temp t
    on customers.customer_id = t.customer_id
when matched then update set 
    first_name = t.first_name,
    last_name = t.last_name,
    gender = t.gender,
    email = t.email,
    phone = t.phone,
    city = t.city,
    prefecture = t.prefecture,
    postal_code = t.postal_code,
    date_of_birth = t.date_of_birth,
    created_at = t.created_at,
    updated_at = t.update_at
when not matched then insert
    (
        customer_id,
        first_name,
        last_name,
        gender,
        email,
        phone,
        city,
        prefecture,
        postal_code,
        date_of_birth,
        created_at,
        updated_at
    ) values (
        t.customer_id,
        t.first_name,
        t.last_name,
        t.gender,
        t.email,
        t.phone,
        t.city,
        t.prefecture,
        t.postal_code,
        t.date_of_birth,
        t.created_at,
        t.updated_at
    )
;

end transaction;
