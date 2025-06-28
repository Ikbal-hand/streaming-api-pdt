# ✨ Streaming Service Metadata Platform ✨

A comprehensive, scalable backend system for a streaming platform, built with Node.js, PostgreSQL (Citus), MongoDB, and Redis.

---

## 📑 Daftar Isi

1. [Ikhtisar Proyek](#-1-ikhtisar-proyek)
2. [Arsitektur Sistem](#-2-arsitektur-sistem)
3. [Implementasi Konsep Kunci](#-3-implementasi-konsep-kunci)
   - [3.1. Replikasi Logis](#31-replikasi-logis)
   - [3.2. Sharding (dengan Citus)](#32-sharding-dengan-citus)
   - [3.3. Foreign Data Wrapper (FDW)](#33-foreign-data-wrapper-fdw)
4. [Keberhasilan Implementasi Distributed Database](#-4-keberhasilan-implementasi-distributed-database)
5. [Dokumentasi Full REST API](#-5-dokumentasi-full-rest-api)
   - [5.1. Akses Dokumentasi](#51-akses-dokumentasi)
   - [5.2. Ringkasan Endpoint API](#52-ringkasan-endpoint-api)
6. [Persiapan dan Menjalankan Proyek](#-6-persiapan-dan-menjalankan-proyek)
   - [6.1. Struktur Proyek](#61-struktur-proyek)
   - [6.2. Instalasi Dependensi](#62-instalasi-dependensi)
   - [6.3. Menjalankan Layanan dengan Docker Compose](#63-menjalankan-layanan-dengan-docker-compose)
   - [6.4. Mengisi Database (Seeding)](#64-mengisi-database-seeding)
   - [6.5. Mengakses Aplikasi](#65-mengakses-aplikasi)

---

## 🌟 1. Ikhtisar Proyek

Proyek ini bertujuan untuk membangun sistem **backend yang kuat dan terukur** untuk platform *streaming*. Sistem ini dirancang untuk mengelola berbagai jenis data secara efisien, meliputi:

- **Metadata Konten**: Informasi detail tentang film, serial, dan acara TV.
- **Data Pengguna**: Profil dan riwayat tontonan.
- **Ulasan Pengguna**: Data semi-terstruktur dari ulasan dan *rating*.
- **Data Tren**: Statistik *views* konten secara *real-time*.

### 🔧 Teknologi Utama

| Teknologi            | Peran                                                       |
|----------------------|-------------------------------------------------------------|
| Node.js (Express)    | API Gateway                                                 |
| PostgreSQL (Citus)   | Sharded relational database                                 |
| MongoDB              | Dokumen database untuk ulasan & data semi-terstruktur       |
| Redis                | Cache dan real-time trends                                  |
| Docker               | Containerization & orchestration                            |
| Swagger / OpenAPI    | Dokumentasi API interaktif                                  |

---

## 🏗️ 2. Arsitektur Sistem

Platform ini mengadopsi **arsitektur mikroservis** dan **database terdistribusi**, dengan komponen berikut:

- **Node.js API Gateway** – Titik masuk utama semua request.
- **PostgreSQL (Citus)** – Sharded DB untuk metadata konten.
- **PostgreSQL (Analytics)** – Penyimpan riwayat tontonan dan data pengguna.
- **PostgreSQL Replica** – Replika untuk *read-scaling* dan ketersediaan.
- **MongoDB** – Menyimpan ulasan dan data fleksibel.
- **Redis** – Caching dan statistik *real-time*.

---

## 🔑 3. Implementasi Konsep Kunci

### 3.1. Replikasi Logis

**Dari**: `postgres_analytics_db`  
**Ke**: `postgres_analytics_replica_db`

- `analytics_pub`: publication untuk tabel `users` dan `user_watch_history`
- `analytics_sub`: subscription di replika
- Diverifikasi dengan row count yang sama di master & replika

### 3.2. Sharding (dengan Citus)

**Di**: `postgresdb`

- Tabel besar (mis. `content_metadata`) di-*shard* menggunakan `create_distributed_table()`
- Tabel referensi (mis. `genres`) digunakan untuk efisiensi *join*

### 3.3. Foreign Data Wrapper (FDW)

**Dari**: `postgresdb`  
**Ke**: `postgres_analytics_db`

- Menggunakan `postgres_fdw`
- Tabel `users`, `user_watch_history` di-*import* ke `postgresdb` sebagai tabel asing
- Query lintas DB dijalankan lewat API

---

## ✅ 4. Keberhasilan Implementasi Distributed Database

Distribusi data berhasil diterapkan:

- ✅ Sharding (Citus)
- ✅ Replikasi logis (PostgreSQL)
- ✅ Federated queries (FDW)
- ✅ Data semi-terstruktur (MongoDB)
- ✅ Cache dan statistik real-time (Redis)
- ✅ Integrasi antar DB bekerja baik via API

---

## 📚 5. Dokumentasi Full REST API

### 5.1. Akses Dokumentasi

Pastikan semua service aktif, lalu buka di browser:  
👉 `http://localhost:3000/api-docs`

### 5.2. Ringkasan Endpoint API

| Method | Endpoint | Database |
|--------|----------|----------|
| `GET`  | `/api/v1/content/ids` | PostgreSQL (Citus) |
| `GET`  | `/api/v1/content/users/ids` | PostgreSQL (Analytics - FDW) |
| `GET`  | `/api/v1/content/trending/daily` | Redis |
| `GET`  | `/api/v1/content/{id}` | PostgreSQL (Citus), Redis |
| `GET`  | `/api/v1/content/{id}/reviews` | MongoDB |
| `GET`  | `/api/v1/content/{id}/details` | Citus + MongoDB + Redis + FDW |
| `GET`  | `/api/v1/content/users/{userId}/watch-history` | Citus + FDW |
| `POST` | `/api/v1/content/{id}/reviews` | MongoDB |
| `POST` | `/api/v1/content/{id}/views/increment` | Redis |

---

## 🚀 6. Persiapan dan Menjalankan Proyek

### 6.1. Struktur Proyek

