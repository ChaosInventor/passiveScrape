CREATE TABLE dom (
    url     text        NOT NULL,
    data    bytea       ,
    time    timestamp   PRIMARY KEY DEFAULT CURRENT_TIMESTAMP
);
