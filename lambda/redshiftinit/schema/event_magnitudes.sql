--3.5

DROP TABLE IF EXISTS event_magnitudes CASCADE;

CREATE TABLE event_magnitudes (
    event_magnitude_id INT PRIMARY KEY,
    event_magnitude VARCHAR(10),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);


GRANT ALL ON event_magnitudes TO PUBLIC;