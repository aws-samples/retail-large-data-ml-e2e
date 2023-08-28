--3

DROP TABLE IF EXISTS stores CASCADE;

CREATE TABLE stores (
    store_id INT PRIMARY KEY,
    store_category_id INT NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    total_floor_area INT NOT NULL,
    city VARCHAR(100) NOT NULL,
    prefecture VARCHAR(12) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

GRANT ALL ON stores TO PUBLIC;

