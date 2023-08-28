--7

DROP TABLE IF EXISTS transaction_details CASCADE;


CREATE TABLE transaction_details (
    transaction_id BIGINT NOT NULL,
    detail_no BIGINT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    sell_price DECIMAL(10, 2) NOT NULL,
    discount_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (transaction_id, detail_no),
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

GRANT ALL ON transaction_details TO PUBLIC;