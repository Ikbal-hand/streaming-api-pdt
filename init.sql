-- init.sql
-- Inisialisasi Database Utama (PostgreSQL Citus)

-- Aktifkan ekstensi Citus
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Catatan: citus.default_replication_factor dihapus karena tidak kompatibel dengan Citus 11.3
-- Replikasi shard akan bekerja jika ada node worker tambahan yang dikonfigurasi di klaster Citus.

-- Buat Tabel Terdistribusi (Sharded by content_id)
CREATE TABLE content_metadata (
    content_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    release_date DATE,
    duration_minutes INTEGER,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('movie', 'series', 'documentary')),
    summary TEXT,
    thumbnail_url VARCHAR(255),
    trailer_url VARCHAR(255),
    rating NUMERIC(3, 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
SELECT create_distributed_table('content_metadata', 'content_id');

-- Tabel yang di-colocate dengan content_metadata
CREATE TABLE content_cast_crew (
    content_id UUID,
    person_id UUID,
    character_name VARCHAR(255),
    PRIMARY KEY (content_id, person_id)
);
SELECT create_distributed_table('content_cast_crew', 'content_id', colocate_with => 'content_metadata');

CREATE TABLE content_genres (
    content_id UUID,
    genre_id INTEGER,
    PRIMARY KEY (content_id, genre_id)
);
SELECT create_distributed_table('content_genres', 'content_id', colocate_with => 'content_metadata');

CREATE TABLE trending_daily (
    date DATE NOT NULL,
    content_id UUID,
    views INTEGER DEFAULT 0,
    watch_time_minutes INTEGER DEFAULT 0,
    PRIMARY KEY (date, content_id)
);
SELECT create_distributed_table('trending_daily', 'content_id');

-- Buat Tabel Referensi (direplikasi ke semua node worker)
CREATE TABLE cast_crew (
    person_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    biography TEXT,
    date_of_birth DATE
);
SELECT create_reference_table('cast_crew');

CREATE TABLE genres (
    genre_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
SELECT create_reference_table('genres');

-- Konfigurasi Foreign Data Wrapper (FDW) untuk terhubung ke database Analytics
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER analytics_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (
        host 'postgres_analytics_db', -- Nama service Docker untuk master Analytics
        port '5432',
        dbname 'analytics_db'
    );

CREATE USER MAPPING FOR admin SERVER analytics_server
    OPTIONS (
        user 'analytics_admin',
        password 'analytics'
    );

-- Impor skema tabel 'users' dan 'user_watch_history' dari database Analytics
-- Ini membuat tabel asing yang bisa dikueri dari DB utama
IMPORT FOREIGN SCHEMA public
    FROM SERVER analytics_server INTO public;