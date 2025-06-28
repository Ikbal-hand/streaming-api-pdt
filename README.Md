````markdown
# Streaming Service Metadata Platform

Ini adalah proyek *backend* untuk Platform Metadata Layanan Streaming yang dirancang untuk mengelola konten multimedia, metadata yang dapat dicari, dan data tren. Platform ini dibangun di atas arsitektur terdistribusi yang memanfaatkan berbagai teknologi database untuk skalabilitas dan efisiensi.

## Daftar Isi
1. [Ikhtisar Proyek](#1-ikhtisar-proyek)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Implementasi Konsep Kunci](#3-implementasi-konsep-kunci)
    - [Replikasi Logis](#31-replikasi-logis)
    - [Sharding (Citus)](#32-sharding-dengan-citus)
    - [Foreign Data Wrapper (FDW)](#33-foreign-data-wrapper-fdw)
4. [Keberhasilan Implementasi Distributed Database](#4-keberhasilan-implementasi-distributed-database)
5. [Dokumentasi Full REST API](#5-dokumentasi-full-rest-api)
6. [Persiapan dan Menjalankan Proyek](#6-persiapan-dan-menjalankan-proyek)

---

## 1. Ikhtisar Proyek

Tujuan proyek ini adalah untuk membangun sistem *backend* yang kuat dan terukur untuk platform *streaming*. Ini mencakup pengelolaan:
* **Metadata Konten:** Informasi detail tentang film, serial, dll.
* **Data Pengguna:** Profil dan riwayat tontonan.
* **Ulasan Pengguna:** Data semi-terstruktur.
* **Data Tren:** Statistik *views* real-time.

**Teknologi Utama:**
* **Node.js (Express):** Untuk membangun API *gateway*.
* **PostgreSQL (Citus):** Untuk data relasional terdistribusi dan *sharding*.
* **MongoDB:** Untuk data semi-terstruktur (dokumen).
* **Redis:** Untuk *caching* dan *real-time*.
* **Docker:** Untuk *containerization* dan orkestrasi.
* **Swagger/OpenAPI:** Untuk dokumentasi API.

---

## 2. Arsitektur Sistem

Platform ini mengadopsi arsitektur mikroservis dan database terdistribusi untuk memastikan skalabilitas, ketersediaan tinggi, dan fleksibilitas.

[Image of Diagram Arsitektur Sistem]

**Komponen Utama:**
* **Node.js API Gateway:** Titik masuk utama untuk semua permintaan klien, mengelola logika bisnis dan routing ke berbagai database.
* **PostgreSQL (Citus - `metadata_db`):** Database utama untuk metadata konten.
* **PostgreSQL (Analytics DB - `analytics_db`):** Database terpisah untuk data pengguna dan riwayat tontonan.
* **PostgreSQL (Analytics Replica DB - `analytics_replica_db`):** Replika dari Analytics DB untuk ketersediaan tinggi dan *read scaling*.
* **MongoDB:** Menyimpan ulasan pengguna sebagai dokumen.
* **Redis:** Digunakan untuk *caching* dan data tren *real-time*.

---

## 3. Implementasi Konsep Kunci

### 3.1. Replikasi Logis

**Diimplementasikan di:** Antara `postgres_analytics_db` (Publisher/Master) dan `postgres_analytics_replica_db` (Subscriber/Replika).

**Bagaimana:**
* **Publisher (`init-analytics-master.sql`):** Tabel `users` dan `user_watch_history` didefinisikan. Sebuah `PUBLICATION` (`analytics_pub`) dibuat untuk kedua tabel ini. User `analytics_admin` diberikan *role* `REPLICATION`. Konfigurasi `wal_level` diatur ke `logical` melalui `command` di `compose.yaml`.
* **Subscriber (`init-analytics-replica.sql`):** Tabel `users` dan `user_watch_history` dibuat dengan skema yang sama. Sebuah `SUBSCRIPTION` (`analytics_sub`) dibuat untuk terhubung ke `postgres_analytics_db` dan berlangganan `analytics_pub`.

**Verifikasi Keberhasilan:**
* Data di-*seed* ke `postgres_analytics_db` (master).
* Kueri `SELECT count(*) FROM users;` dan `SELECT count(*) FROM user_watch_history;` yang dijalankan di `postgres_analytics_replica_db` (replika) mengembalikan jumlah baris yang sama dengan master (`50` dan `150`), membuktikan data direplikasi dengan sukses.

### 3.2. Sharding (dengan Citus)

**Diimplementasikan di:** `postgresdb` (PostgreSQL utama dengan ekstensi Citus).

**Bagaimana:**
* Tabel-tabel besar seperti `content_metadata`, `content_cast_crew`, `content_genres`, dan `trending_daily` didefinisikan sebagai `distributed tables` menggunakan `SELECT create_distributed_table()`. Mereka di-shard berdasarkan `content_id` atau di-*colocate* untuk *join* yang efisien.
* Tabel kecil (`cast_crew`, `genres`) didefinisikan sebagai `reference tables`, yang direplikasi ke semua node (jika ada *worker* node).

**Verifikasi Keberhasilan:**
* Kueri ke `citus_tables` di `postgresdb` menunjukkan tipe tabel yang benar (`distributed` atau `reference`) dan jumlah *shard*.
* Contoh Verifikasi (di `postgresdb` psql):
  ```sql
  SELECT table_name, citus_table_type, distribution_column, shard_count
  FROM citus_tables;
````

### 3.3. Foreign Data Wrapper (FDW)

**Diimplementasikan di:** Dari `postgresdb` (PostgreSQL utama) ke `postgres_analytics_db` (PostgreSQL Analytics).

**Bagaimana:**

  * Ekstensi `postgres_fdw` diaktifkan di `postgresdb`.
  * Sebuah `FOREIGN SERVER` (`analytics_server`) dibuat di `postgresdb` yang menunjuk ke `postgres_analytics_db`.
  * `USER MAPPING` dan `IMPORT FOREIGN SCHEMA` digunakan untuk membuat tabel asing (`users`, `user_watch_history`) di `postgresdb` yang merepresentasikan tabel di `analytics_db`.

**Verifikasi Keberhasilan:**

  * Kueri `SELECT count(*) FROM users;` yang dijalankan di `postgresdb` berhasil mengambil data dari `postgres_analytics_db` melalui FDW.
  * Kueri lintas database yang menggabungkan `content_metadata` (Citus) dengan tabel `users` atau `user_watch_history` (FDW) berhasil dijalankan melalui API.

-----

## 4\. Keberhasilan Implementasi Distributed Database

**Ya, proyek ini berhasil menciptakan sistem database terdistribusi yang berfungsi penuh dengan PostgreSQL (Citus), MongoDB, dan Redis.**

  * **PostgreSQL (Citus):** Berhasil diatur untuk *sharding*, mengelola metadata konten dengan skalabilitas horizontal.
  * **PostgreSQL (Analytics) & Replika:** Berhasil diatur dengan replikasi logis, memastikan ketersediaan tinggi untuk data pengguna.
  * **FDW:** Berhasil diimplementasikan, memungkinkan *federated queries* yang kuat di seluruh database PostgreSQL yang berbeda.
  * **MongoDB:** Berhasil terintegrasi untuk data semi-terstruktur (ulasan), terhubung secara logis dengan ID dari PostgreSQL.
  * **Redis:** Berhasil digunakan untuk *caching* dan data tren *real-time*, memberikan kecepatan respons yang tinggi.
  * **Interaksi Antar Database:** Semua *endpoint* API yang dirancang untuk menggabungkan data dari berbagai database telah divalidasi berfungsi dengan baik (misalnya, `GET /content/{id}/details` dan `GET /content/users/{userId}/watch-history`).

-----

## 5\. Dokumentasi Full REST API

API yang diproduksi telah didokumentasikan sepenuhnya menggunakan **Swagger (OpenAPI)**. Dokumentasi ini interaktif dan dapat diakses melalui *browser*.

### 5.1. Akses Dokumentasi

  * Pastikan semua layanan Docker berjalan.
  * Akses URL berikut di *browser* Anda:
    `http://localhost:3000/api-docs`

### 5.2. Ringkasan Endpoint API

| Method | Endpoint Path | Database yang Digunakan |
| :----- | :------------ | :---------------------- |
| `GET` | `/api/v1/content/ids` | PostgreSQL (Citus) |
| `GET` | `/api/v1/content/users/ids` | PostgreSQL (Analytics - FDW) |
| `GET` | `/api/v1/content/trending/daily` | Redis |
| `GET` | `/api/v1/content/{id}` | PostgreSQL (Citus), Redis (Cache) |
| `GET` | `/api/v1/content/{id}/reviews` | MongoDB |
| `GET` | `/api/v1/content/{id}/details` | PostgreSQL (Citus), MongoDB, Redis, FDW (User Data) |
| `GET` | `/api/v1/content/users/{userId}/watch-history` | PostgreSQL (Citus), PostgreSQL (Analytics - FDW) |
| `POST` | `/api/v1/content/{id}/reviews` | MongoDB |
| `POST` | `/api/v1/content/{id}/views/increment` | Redis |

-----

## 6\. Persiapan dan Menjalankan Proyek

### 6.1. Struktur Proyek

Pastikan struktur folder Anda seperti ini:

```
streamingAPI/
├── package.json
├── .env
├── dockerfile
├── compose.yaml
├── server.js
├── init.sql
├── init-analytics-master.sql
├── init-analytics-replica.sql
├── swagger-docs.yaml
├── api-tester.html
├── scripts/
│   └── seed.js
├── config/
│   ├── database.js
│   ├── mongo.js
│   ├── redis.js
│   └── swagger.js
├── controllers/
│   └── contentController.js
├── middlewares/
│   └── logger.js
├── models/
│   └── review.js
├── routes/
│   └── contentRoutes.js
```

### 6.2. Instalasi Dependensi

Di terminal di root proyek Anda, jalankan:

```bash
npm install
```

### 6.3. Menjalankan Layanan dengan Docker Compose

Ini akan membangun image aplikasi, serta membuat dan menjalankan semua kontainer database.

```bash
docker-compose down -v --remove-orphans # Pastikan bersih dari run sebelumnya
docker-compose up --build -d
```

### 6.4. Mengisi Database (Seeding)

Setelah semua kontainer "Up" dan sehat (tunggu sekitar 30-60 detik agar database stabil), jalankan skrip seeder:

```bash
npm run seed
```

### 6.5. Mengakses Aplikasi

  * **API Tester (HTML):** Buka `file:///path/to/your/project/api-tester.html` di browser Anda (disarankan mode Incognito).
  * **Dokumentasi Swagger:** Akses `http://localhost:3000/api-docs`.

<!-- end list -->

```
```