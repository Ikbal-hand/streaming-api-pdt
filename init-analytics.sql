-- init-analytics.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_watch_history (
    history_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    content_id UUID NOT NULL,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_watched_seconds INTEGER NOT NULL,
    last_position_seconds INTEGER NOT NULL
);