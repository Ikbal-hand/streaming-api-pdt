-- init-analytics-replica.sql
-- Inisialisasi Database Replika Analytics (Subscriber)

-- Pastikan ekstensi uuid-ossp tersedia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buat tabel. SKEMA HARUS SAMA PERSIS DENGAN PUBLISHER!
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

-- Buat langganan (subscription) ke publikasi di database master
-- 'postgres_analytics_db' adalah nama service Docker dari master
CREATE SUBSCRIPTION analytics_sub
    CONNECTION 'dbname=analytics_db host=postgres_analytics_db port=5432 user=analytics_admin password=analytics'
    PUBLICATION analytics_pub
    WITH (copy_data = true, create_slot = true, enabled = true);
