--2


DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    description VARCHAR(1024),
    unit_price DECIMAL(10, 2) NOT NULL,
    barcode VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

GRANT ALL ON products TO PUBLIC;