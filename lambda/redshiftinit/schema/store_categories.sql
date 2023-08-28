--2.5

DROP TABLE IF EXISTS store_categories CASCADE;

CREATE TABLE store_categories (
    store_category_id INT PRIMARY KEY,
    store_category_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

GRANT ALL ON store_categories TO PUBLIC;

