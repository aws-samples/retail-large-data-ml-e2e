--1

DROP TABLE IF EXISTS categories CASCADE;


CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    category_level INT NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    parent_category_id INT,
    description VARCHAR(1024),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

GRANT ALL ON categories TO PUBLIC;
