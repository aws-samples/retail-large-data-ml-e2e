UNLOAD ('
    SELECT 
         m.ft_sales_today AS ft_sales_two_days_later, 
         f.product_id, 
         f.store_id, 
         f.ft_sales_today, 
         f.ft_sales_1d_ago, 
         f.ft_sales_2d_ago, 
         f.ft_sales_7d_ago, 
         f.ft_sales_14d_ago, 
         f.ft_sales_1w_med, 
         f.ft_sales_1w_mean,
         f.ft_sales_1w_var,
         f.ft_sales_2w_med,
         f.ft_sales_2w_mean,
         f.ft_sales_2w_var,
         f.ft_calendar_eventtype,
         f.ft_calendar_holiday,
         f.ft_store_storetype,
         f.ft_store_space,
         f.ft_item_cat1,
         f.ft_item_cat2,
         f.ft_item_cat3,
         f.ft_item_price,
         f.ft_sales_discountrate,
         f.ft_temp_max,
         f.ft_temp_min,
         f.ft_temp_ave,
         f.ft_precipitation
    FROM 
        features f LEFT JOIN features m ON f.product_id = m.product_id and f.store_id = m.store_id AND f.transaction_date + interval ''2 days'' = m.transaction_date 
    WHERE 
        f.transaction_date > DATE(''<PROCESSING_DATE>'') - interval ''90 days''
    AND
        f.transaction_date < DATE(''<PROCESSING_DATE>'') - interval ''1 days''
    ORDER BY f.transaction_date DESC'
) 
TO '<ML_SOURCE_S3URL_TRAINING>'
iam_role '<ROLEARN_TO_READ_DATASOURCE>'
FORMAT AS CSV
CLEANPATH
EXTENSION 'csv';
