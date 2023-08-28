begin transaction;

--ロード対象のテーブルと同一構成の空の一時テーブルを作成
create temp table weather_temp
as
select * from weather where 0=1;

--一時テーブルにデータをロード
--s3のURIとIAM Roleは呼び出し元のプログラムからパラメータ渡しされることを想定
copy weather_temp
from 's3://<DATASOURCE_BUCKET_NAME>/<PROCESSING_DATE>/weather/'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
format CSV
;

--本テーブルにマージ
merge into weather
using weather_temp t
    on weather.weather_date = t.weather_date 
    and weather.prefecture = t.prefecture
when matched then update set 
    temp_max = t.temp_max,
    temp_min = t.temp_min,
    temp_ave = t.temp_ave,
    precipitation = t.precipitation,
    created_at = t.created_at,
    updated_at = t.updated_at
when not matched then insert
    (
        weather_date,
        prefecture,
        temp_max,
        temp_min,
        temp_ave,
        precipitation,
        created_at,
        updated_at
    ) values (
        t.weather_date,
        t.prefecture,
        t.temp_max,
        t.temp_min,
        t.temp_ave,
        t.precipitation,
        t.created_at,
        t.updated_at
    )
;

end transaction;
