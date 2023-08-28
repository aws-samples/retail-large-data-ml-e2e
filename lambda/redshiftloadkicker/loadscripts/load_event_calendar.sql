begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table event_calendar_temp
as
select * from event_calendar where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy event_calendar_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/event_calendar/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into event_calendar
using event_calendar_temp t
    on event_calendar.event_date = t.event_date
when matched then update set 
    is_holiday = t.is_holiday,
    event_name = t.event_name,
    event_description = t.event_description,
    event_magnitude_id = t.event_magnitude_id,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        event_date,
        is_holiday,
        event_name,
        event_description,
        event_magnitude_id,
        created_at,
        updated_at
    ) values (
        t.event_date,
        t.is_holiday,
        t.event_name,
        t.event_description,
        t.event_magnitude_id,
        t.created_at,
        t.updated_at
    )
;

end transaction;
