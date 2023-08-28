begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table categories_temp
as
select * from categories where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy categories_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/categories/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into categories
using categories_temp t
    on categories.category_id = t.category_id
when matched then update set 
    category_level = t.category_level,
    category_name = t.category_name,
    parent_category_id = t.parent_category_id,
    description = t.description,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        category_id,
        category_level,
        category_name,
        parent_category_id,
        description,
        created_at,
        updated_at
    ) values (
        t.category_id,
        t.category_level,
        t.category_name,
        t.parent_category_id,
        t.description,
        t.created_at,
        t.updated_at
    )
;

end transaction;
