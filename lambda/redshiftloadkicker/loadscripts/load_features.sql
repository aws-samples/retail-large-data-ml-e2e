begin transaction;

create temp table features_temp
as
select * from features where false;


INSERT INTO features_temp 
WITH all_1w AS (
  SELECT 
    ds.product_id,
    ds.store_id,
    MEDIAN(ds.total_quantity) OVER (PARTITION BY ds.product_id, ds.store_id) AS med,
    AVG(ds.total_quantity) OVER (PARTITION BY ds.product_id, ds.store_id) AS avg,
    VAR_SAMP(ds.total_quantity) OVER (PARTITION BY ds.product_id, ds.store_id) AS var
  FROM daily_quantity ds
  WHERE ds.transaction_date > DATE('<PROCESSING_DATE>') - interval '7 days'
  AND ds.transaction_date <= DATE('<PROCESSING_DATE>')
),
all_2w AS (
  SELECT
    ds.product_id,
    ds.store_id,
    MEDIAN(ds.total_quantity) OVER (PARTITION BY ds.product_id, ds.store_id) AS med,
    AVG(ds.total_quantity) OVER (PARTITION BY ds.product_id, ds.store_id) AS avg,
    VAR_SAMP(ds.total_quantity) OVER (PARTITION BY ds.product_id, ds.store_id) AS var
  FROM daily_quantity ds
  WHERE ds.transaction_date > DATE('<PROCESSING_DATE>') - interval '14 days'
  AND ds.transaction_date <= DATE('<PROCESSING_DATE>')
)
SELECT 
  ds_today.product_id,
  ds_today.store_id,
  ds_today.transaction_date,
  ds_today.total_quantity AS total_quantity_today,
  ds_1day.total_quantity AS total_quantity_1day,
  ds_2day.total_quantity AS total_quantity_2day,
  ds_7day.total_quantity AS total_quantity_7day,
  ds_14day.total_quantity AS total_quantity_14day,
  all_1w.med AS ft_sales_1w_med,
  all_1w.avg AS ft_sales_1w_mean,
  all_1w.var AS ft_sales_1w_var,
  all_2w.med AS ft_sales_2w_med,
  all_2w.avg AS ft_sales_2w_mean,
  all_2w.var AS ft_sales_2w_var,
  ec.event_magnitude_id AS ft_calendar_eventtype,
  ec.is_holiday AS ft_calendar_holiday,
  ds_today.ft_store_storetype,
  ds_today.ft_store_space,
  ds_today.ft_item_cat1,
  ds_today.ft_item_cat2,
  ds_today.ft_item_cat3,
  ds_today.ft_item_price,
  ds_today.ft_sales_discountrate,
  w.temp_max AS ft_temp_max,
  w.temp_min AS ft_temp_min,
  w.temp_ave AS ft_temp_ave,
  w.precipitation AS ft_precipitation
FROM 
  daily_quantity ds_today
  JOIN weather w ON ds_today.transaction_date = w.weather_date AND ds_today.prefecture = w.prefecture
  JOIN daily_quantity ds_1day ON ds_today.transaction_date - INTERVAL '1 days'  = ds_1day.transaction_date AND ds_1day.product_id = ds_today.product_id AND ds_1day.store_id = ds_today.store_id
  JOIN daily_quantity ds_2day ON ds_today.transaction_date - INTERVAL '2 days'  = ds_2day.transaction_date AND ds_2day.product_id = ds_today.product_id AND ds_2day.store_id = ds_today.store_id
  JOIN daily_quantity ds_7day ON ds_today.transaction_date - INTERVAL '5 days'  = ds_7day.transaction_date AND ds_7day.product_id = ds_today.product_id AND ds_7day.store_id = ds_today.store_id
  JOIN daily_quantity ds_14day ON ds_today.transaction_date - INTERVAL '12 days'  = ds_14day.transaction_date AND ds_14day.product_id = ds_today.product_id AND ds_14day.store_id = ds_today.store_id
  JOIN all_1w ON ds_today.product_id = all_1w.product_id AND ds_today.store_id = all_1w.store_id
  JOIN all_2w ON ds_today.product_id = all_2w.product_id AND ds_today.store_id = all_2w.store_id
LEFT JOIN 
  event_calendar ec ON ds_today.transaction_date = ec.event_date
WHERE
   ds_today.transaction_date = DATE('<PROCESSING_DATE>')
GROUP BY 
  ds_today.product_id, 
  ds_today.store_id, 
  ds_today.transaction_date,  
  ds_today.total_quantity,
  ds_1day.total_quantity,
  ds_2day.total_quantity,
  ds_7day.total_quantity,
  ds_14day.total_quantity,
  all_1w.med,
  all_1w.avg,
  all_1w.var,
  all_2w.med,
  all_2w.avg,
  all_2w.var,
  ec.event_magnitude_id,
  ec.is_holiday,
  ds_today.ft_store_storetype,
  ds_today.ft_store_space,
  ds_today.ft_item_cat1,
  ds_today.ft_item_cat2,
  ds_today.ft_item_cat3,
  ds_today.ft_item_price,
  ds_today.ft_sales_discountrate,
  w.temp_max,
  w.temp_min,
  w.temp_ave,
  w.precipitation;


merge into features
using features_temp t
  on features.product_id = t.product_id 
    and features.store_id = t.store_id
    and features.transaction_date = t.transaction_date
when matched then update set 
  ft_sales_today = t.ft_sales_today,
  ft_sales_1d_ago = t.ft_sales_1d_ago,
  ft_sales_2d_ago = t.ft_sales_2d_ago,
  ft_sales_7d_ago = t.ft_sales_7d_ago,
  ft_sales_14d_ago = t.ft_sales_14d_ago,
  ft_sales_1w_med = t.ft_sales_1w_med,
  ft_sales_1w_mean = t.ft_sales_1w_mean,
  ft_sales_1w_var = t.ft_sales_1w_var,
  ft_sales_2w_med = t.ft_sales_2w_med,
  ft_sales_2w_mean = t.ft_sales_2w_mean,
  ft_sales_2w_var = t.ft_sales_2w_var,
  ft_calendar_eventtype = t.ft_calendar_eventtype,
  ft_calendar_holiday = t.ft_calendar_holiday,
  ft_store_storetype = t.ft_store_storetype,
  ft_store_space = t.ft_store_space,
  ft_item_cat1 = t.ft_item_cat1,
  ft_item_cat2 = t.ft_item_cat2,
  ft_item_cat3 = t.ft_item_cat3,
  ft_item_price = t.ft_item_price,
  ft_sales_discountrate = t.ft_sales_discountrate,
  ft_temp_max = t.ft_temp_max,
  ft_temp_min = t.ft_temp_min,
  ft_temp_ave = t.ft_temp_ave,
  ft_precipitation = t.ft_precipitation
when not matched then insert 
  (
      product_id,
      store_id,
      transaction_date,
      ft_sales_today,
      ft_sales_1d_ago,
      ft_sales_2d_ago,
      ft_sales_7d_ago,
      ft_sales_14d_ago,
      ft_sales_1w_med,
      ft_sales_1w_mean,
      ft_sales_1w_var,
      ft_sales_2w_med,
      ft_sales_2w_mean,
      ft_sales_2w_var,
      ft_calendar_eventtype,
      ft_calendar_holiday,
      ft_store_storetype,
      ft_store_space,
      ft_item_cat1,
      ft_item_cat2,
      ft_item_cat3,
      ft_item_price,
      ft_sales_discountrate,
      ft_temp_max,
      ft_temp_min,
      ft_temp_ave,
      ft_precipitation
  )
  values (
      t.product_id,
      t.store_id,
      t.transaction_date,
      t.ft_sales_today,
      t.ft_sales_1d_ago,
      t.ft_sales_2d_ago,
      t.ft_sales_7d_ago,
      t.ft_sales_14d_ago,
      t.ft_sales_1w_med,
      t.ft_sales_1w_mean,
      t.ft_sales_1w_var,
      t.ft_sales_2w_med,
      t.ft_sales_2w_mean,
      t.ft_sales_2w_var,
      t.ft_calendar_eventtype,
      t.ft_calendar_holiday,
      t.ft_store_storetype,
      t.ft_store_space,
      t.ft_item_cat1,
      t.ft_item_cat2,
      t.ft_item_cat3,
      t.ft_item_price,
      t.ft_sales_discountrate,
      t.ft_temp_max,
      t.ft_temp_min,
      t.ft_temp_ave,
      t.ft_precipitation
  );
;

end transaction;