--5

DROP TABLE IF EXISTS customers CASCADE ;

CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender CHAR(1) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    city VARCHAR(100),
    prefecture VARCHAR(12),
    postal_code VARCHAR(20),
    date_of_birth DATE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);


GRANT ALL ON customers TO PUBLIC;
