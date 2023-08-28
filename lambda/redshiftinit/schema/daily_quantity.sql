--9

DROP MATERIALIZED VIEW IF EXISTS daily_quantity;

CREATE MATERIALIZED VIEW daily_quantity
  diststyle even
  sortkey (transaction_date)
AUTO REFRESH NO
AS 
SELECT 
  td.product_id,
  t.store_id,
  DATE(t.transaction_timestamp) AS transaction_date,
  c1.category_id as ft_item_cat1,
  c2.category_id as ft_item_cat2,
  c3.category_id as ft_item_cat3,
  s.store_category_id as ft_store_storetype,
  s.total_floor_area as ft_store_space,
  s.prefecture as prefecture,
  SUM(td.quantity) AS total_quantity,
  AVG(td.unit_price) AS ft_item_price,
  AVG(td.discount_rate) AS ft_sales_discountrate
FROM transactions t 
JOIN transaction_details td ON t.transaction_id = td.transaction_id
JOIN products p ON td.product_id = p.product_id
JOIN stores s ON t.store_id = s.store_id
JOIN categories c3 ON p.category_id = c3.category_id
JOIN categories c2 ON c3.parent_category_id = c2.category_id
JOIN categories c1 ON c2.parent_category_id = c1.category_id

GROUP BY 
td.product_id,
t.store_id, 
transaction_date, 
ft_item_cat1, 
ft_item_cat2, 
ft_item_cat3,
ft_store_storetype,
ft_store_space,
prefecture;

GRANT ALL ON daily_quantity TO PUBLIC;