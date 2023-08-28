--6


DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
    transaction_id BIGINT PRIMARY KEY,
    store_id INT NOT NULL,
    customer_id INT,
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

GRANT ALL ON transactions TO PUBLIC;