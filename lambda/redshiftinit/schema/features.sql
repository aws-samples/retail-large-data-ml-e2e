--10

DROP TABLE IF EXISTS features CASCADE;


CREATE TABLE features (
  product_id INT,
  store_id INT,
  transaction_date DATE,
  ft_sales_today INT,
  ft_sales_1d_ago INT,
  ft_sales_2d_ago INT,
  ft_sales_7d_ago INT,
  ft_sales_14d_ago INT,
  ft_sales_1w_med INT,
  ft_sales_1w_mean INT,
  ft_sales_1w_var INT,
  ft_sales_2w_med INT,
  ft_sales_2w_mean INT,
  ft_sales_2w_var INT,
  ft_calendar_eventtype INT,
  ft_calendar_holiday BOOLEAN,
  ft_store_storetype INT,
  ft_store_space INT,
  ft_item_cat1 INT,
  ft_item_cat2 INT,
  ft_item_cat3 INT,
  ft_item_price DECIMAL(10, 2),
  ft_sales_discountrate DECIMAL(10, 2),
  ft_temp_max INT,
  ft_temp_min INT,
  ft_temp_ave INT,
  ft_precipitation INT,
  PRIMARY KEY (product_id, store_id, transaction_date)
);

GRANT ALL ON features TO PUBLIC;
