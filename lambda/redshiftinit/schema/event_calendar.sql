--4

DROP TABLE IF EXISTS event_calendar CASCADE;

CREATE TABLE event_calendar (
    event_date DATE PRIMARY KEY,
    is_holiday BOOLEAN DEFAULT FALSE,
    event_name VARCHAR(255),
    event_description VARCHAR(1024),
    event_magnitude_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);


GRANT ALL ON event_calendar TO PUBLIC;