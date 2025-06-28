-- init-analytics-master.sql
-- Inisialisasi Database Analytics (Publisher/Master)

-- Pastikan ekstensi uuid-ossp tersedia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buat tabel
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_watch_history (
    history_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    content_id UUID NOT NULL, -- Tidak ada FK karena content_id ada di DB lain
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_watched_seconds INTEGER NOT NULL,
    last_position_seconds INTEGER NOT NULL
);
ALTER ROLE analytics_admin WITH REPLICATION LOGIN PASSWORD 'analytics'; -- <<< Tambahkan LOGIN PASSWORD untuk memastikan kredensial aktif

-- Buat publikasi
CREATE PUBLICATION analytics_pub FOR TABLE users, user_watch_history;
-- Penting: Berikan REPLICATION role pada user yang digunakan untuk publikasi
-- Jika user 'analytics_admin' sudah ada, gunakan ALTER ROLE
ALTER ROLE analytics_admin WITH REPLICATION;

-- Buat publikasi untuk tabel yang ingin direplikasi
-- Subscriber akan berlangganan publikasi ini
CREATE PUBLICATION analytics_pub FOR TABLE users, user_watch_history;
