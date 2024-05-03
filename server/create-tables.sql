CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS dom (
    url     text        NOT NULL,
    data    bytea       ,
    time    timestamp   PRIMARY KEY DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracked (
    url     text        PRIMARY KEY,
    added   timestamp   UNIQUE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trackingInterval (
    url     text        REFERENCES tracked(url),
    since   timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    until   timestamp
    CONSTRAINT valid_time_interval CHECK(until > since),
    CONSTRAINT no_overlapping_intervals EXCLUDE USING gist(url WITH =, tsrange(since, until) WITH &&)
);
