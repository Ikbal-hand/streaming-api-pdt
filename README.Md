
# ✨ Streaming Service Metadata Platform

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Citus-blue?logo=postgresql)](https://www.citusdata.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Built%20with-Docker-blue?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)

A scalable and distributed backend platform for managing content metadata, user activity, reviews, and real-time trends for streaming services.

## 📚 Table of Contents

1. [Introduction](#1-introduction)  
2. [Use Case Overview](#2-use-case-overview)  
3. [System Architecture](#3-system-architecture)  
4. [Technology Stack & Rationale](#4-technology-stack--rationale)  
5. [Database Schema Design](#5-database-schema-design)  
6. [Sharding & Replication Strategies](#6-sharding--replication-strategies)  
7. [Distributed Query Scenarios](#7-distributed-query-scenarios)  
8. [Challenges & Lessons Learned](#8-challenges--lessons-learned)  
9. [Conclusion](#9-conclusion)  
10. [Setup & Running the Project](#10-setup--running-the-project)

---

## 1. 🚀 Introduction

This project aims to build a resilient and horizontally scalable backend system to serve metadata and user-generated content for a modern streaming platform. Core features include:

- Efficient retrieval of multimedia content metadata
- Personalization via watch history
- User reviews and ratings
- Real-time trends and caching
- Distributed, high-availability architecture

---

## 2. 🧭 Use Case Overview

Key functionalities of the platform include:

- 🔍 **Content Discovery:** Rich metadata management (titles, descriptions, genres, cast)
- 🎯 **User Personalization:** Watch history tracking and recommendations
- 🌟 **Community Interaction:** User reviews and rating system
- 📈 **Trend Analytics:** Real-time trend tracking for business decisions
- 🎞️ **Content Management:** Easy updates to media assets

---

## 3. 🏗️ System Architecture

This platform follows a **microservice architecture** backed by distributed databases.

![](https://github.com/Ikbal-hand/streaming-api-pdt/blob/main/image/SYSTEM.png)

**Core Components:**

- **Node.js (API Gateway):** Handles routing, business logic, and aggregation  
- **PostgreSQL (Citus - `metadata_db`):** Main metadata store with horizontal sharding  
- **PostgreSQL (Analytics DB - `analytics_db`):** Stores user activity and history (logical replication source)  
- **PostgreSQL Replica (`analytics_replica_db`):** Subscriber for read-scaling  
- **MongoDB:** Stores semi-structured data (reviews, comments)  
- **Redis:** In-memory store for real-time trends and caching

---

## 4. 🧰 Technology Stack & Rationale

| Technology        | Description                                   | Rationale |
|------------------|-----------------------------------------------|-----------|
| **Node.js (Express)** | Backend runtime & REST API framework      | Non-blocking, fast, RESTful |
| **PostgreSQL (Citus)** | Distributed relational database           | Scalable, transactional |
| **MongoDB**       | NoSQL document store                         | Schema-flexible for user-generated content |
| **Redis**         | In-memory data store                         | Real-time trends & fast caching |
| **Docker**        | Containerized microservice environment       | Easy deployment & consistency |
| **Swagger/OpenAPI** | API documentation tooling                  | Interactive and developer-friendly |
| **Faker.js**      | Fake data generator for seed script          | Realistic mock data for testing |

---

## 5. 🧬 Database Schema Design

![](https://github.com/Ikbal-hand/streaming-api-pdt/blob/main/image/ERD.png)

### PostgreSQL (`metadata_db` - Citus)

- `content_metadata` — **sharded**
- `content_cast_crew`, `content_genres` — **co-located**
- `cast_crew`, `genres` — **reference tables**
- `trending_daily` — **sharded**

### PostgreSQL (`analytics_db`)

- `users`
- `user_watch_history`

### MongoDB

- `reviews` (collection)

### Redis

- `content:metadata:<id>` — JSON cache  
- `trending:daily` — sorted set  
- `content:views:<id>` — view counters

---

## 6. ⚙️ Sharding & Replication Strategies

### 6.1. Sharding with Citus

- Large tables like `content_metadata` are sharded by `content_id`
- Reference tables (`genres`, `cast_crew`) are replicated for JOIN efficiency

### 6.2. Logical Replication

- **Master:** `analytics_db`  
- **Replica:** `analytics_replica_db`  
- `users` and `user_watch_history` are published/subscribed using PostgreSQL logical replication

**Benefits:**
- High availability  
- Read scaling  
- Real-time sync across containers

---

## 7. 🔄 Distributed Query Scenarios

### 🧩 GET `/api/v1/content/{id}/details`

Combines:
- PostgreSQL Citus (metadata)
- MongoDB (user reviews)
- Redis (live view count)
- FDW from `analytics_db` (usernames)

### 📼 GET `/api/v1/content/users/{userId}/watch-history`

Federated query using:
- FDW (PostgreSQL analytics)
- JOIN with metadata via Citus

---

## 8. 🧪 Challenges & Lessons Learned

| Challenge | Lesson |
|----------|--------|
| 🌀 Citus version inconsistencies | Always validate version-specific docs and behavior |
| 🔐 Logical replication config | Set `wal_level=logical`, adjust `pg_hba.conf`, grant `REPLICATION` |
| 🧱 Docker race conditions | Add health checks and retry logic |
| ❌ Node.js module errors | Always run `npm install` inside the container |
| 🧭 Express routing ambiguity | Declare specific routes before parameterized ones |
| 📜 Swagger JSDoc fails | Use external YAML (`swagger-docs.yaml`) for complex specs |

---

## 9. ✅ Conclusion

This platform successfully demonstrates:

- 🧠 Modern distributed database strategies (Citus, FDW, logical replication)
- 🔗 Multi-database coordination with high performance
- 📡 Robust REST API integration for client applications

**Next Steps:**

- Scale horizontally with additional Citus workers  
- Integrate JWT authentication and RBAC  
- Add observability (e.g., Prometheus + Grafana)  
- Implement automated testing (Jest + Postman)

---

## 10. 🛠️ Setup & Running the Project

### 10.1. Project Structure

```bash
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
````

### 10.2. Install Dependencies

```bash
npm install
```

### 10.3. Run with Docker Compose

```bash
docker-compose down -v --remove-orphans
docker-compose up --build -d
```

### 10.4. Seed the Databases

```bash
npm run seed
```

### 10.5. Access the App

* 🔍 API Tester (offline HTML):
  Open `api-tester.html` via your browser
* 📖 Swagger Docs:
  `http://localhost:3000/api-docs`

---

## 📄 License
