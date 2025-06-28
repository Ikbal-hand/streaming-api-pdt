
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

Sistem backend ini dirancang untuk mengelola data kompleks dari layanan *streaming* seperti metadata konten, riwayat tontonan pengguna, ulasan, dan statistik tren.

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

Platform ini menggunakan arsitektur **mikroservis dan database terdistribusi**.
  
![Arsitektur Sistem StreamingAPI]https://github.com/Ikbal-hand/streaming-api-pdt/blob/main/image/SYSTEM.png

### Komponen:

- **API Gateway (Node.js)** – Titik masuk utama request client.
- **PostgreSQL (Citus)** – Sharded DB untuk konten.
- **PostgreSQL Analytics DB** – Menyimpan data pengguna.
- **PostgreSQL Replica DB** – Replika logis untuk *read-scaling*.
- **MongoDB** – Data ulasan (semi-terstruktur).
- **Redis** – Statistik real-time dan cache.

---

## 🔑 3. Implementasi Konsep Kunci

### 3.1. Replikasi Logis

- `analytics_pub`: Publication dari `users` & `user_watch_history`
- `analytics_sub`: Subscription di replika
- Diverifikasi via `SELECT count(*)` pada kedua DB

### 3.2. Sharding (dengan Citus)

- Tabel besar di-*shard* dengan `create_distributed_table()`
- Tabel kecil (e.g. `genres`) sebagai `reference_table`
- Diverifikasi melalui `citus_tables`

### 3.3. Foreign Data Wrapper (FDW)

- `postgres_fdw` menghubungkan `postgresdb` ke `analytics_db`
- Tabel asing di-*import* dan digunakan dalam federated queries

---

## ✅ 4. Keberhasilan Implementasi Distributed Database

- ✅ **Citus** berhasil digunakan untuk *sharding*
- ✅ **Replikasi logis** bekerja dengan baik
- ✅ **FDW** memungkinkan query lintas DB
- ✅ **MongoDB** dan **Redis** berhasil diintegrasikan
- ✅ Endpoint API lintas data source berjalan dengan sukses

---

## 📚 5. Dokumentasi Full REST API

### 5.1. Akses Dokumentasi

Pastikan semua container Docker aktif:

```bash
http://localhost:3000/api-docs
````

### 5.2. Ringkasan Endpoint API

| Method | Endpoint                                       | Database                      |
| ------ | ---------------------------------------------- | ----------------------------- |
| GET    | `/api/v1/content/ids`                          | PostgreSQL (Citus)            |
| GET    | `/api/v1/content/users/ids`                    | PostgreSQL (Analytics - FDW)  |
| GET    | `/api/v1/content/trending/daily`               | Redis                         |
| GET    | `/api/v1/content/{id}`                         | Citus + Redis                 |
| GET    | `/api/v1/content/{id}/reviews`                 | MongoDB                       |
| GET    | `/api/v1/content/{id}/details`                 | Citus + MongoDB + FDW + Redis |
| GET    | `/api/v1/content/users/{userId}/watch-history` | FDW                           |
| POST   | `/api/v1/content/{id}/reviews`                 | MongoDB                       |
| POST   | `/api/v1/content/{id}/views/increment`         | Redis                         |

---

## 🚀 6. Persiapan dan Menjalankan Proyek

### 6.1. Struktur Proyek

```bash
streamingAPI/
├── .env
├── api-tester.html
├── compose.yaml
├── dockerfile
├── init.sql
├── init-analytics-master.sql
├── init-analytics-replica.sql
├── package.json
├── server.js
├── swagger-docs.yaml
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

```bash
npm install
```

### 6.3. Menjalankan Layanan dengan Docker Compose

```bash
docker-compose down -v --remove-orphans
docker-compose up --build -d
```

### 6.4. Mengisi Database (Seeding)

Setelah semua container siap:

```bash
npm run seed
```

### 6.5. Mengakses Aplikasi

* **API Tester**: Buka `api-tester.html` di browser
* **Swagger UI**: [`http://localhost:3000/api-docs`](http://localhost:3000/api-docs)

---
