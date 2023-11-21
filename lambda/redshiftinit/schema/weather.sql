--3

DROP TABLE IF EXISTS weather CASCADE;

CREATE TABLE weather (
    weather_date DATE,
    prefecture VARCHAR(20),
    temp_max INT NOT NULL,
    temp_min INT NOT NULL,
    temp_ave INT NOT NULL,
    precipitation INT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (weather_date, prefecture)
);

GRANT ALL ON weather TO PUBLIC;

