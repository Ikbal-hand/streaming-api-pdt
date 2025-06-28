# ✨ Project Report: Streaming Service Metadata Platform ✨

A distributed backend system for streaming services using Node.js, PostgreSQL (Citus), MongoDB, and Redis.

---

## 📑 Table of Contents

1. [Introduction](#1-introduction)  
2. [Use Case Overview](#2-use-case-overview)  
3. [System Architecture](#3-system-architecture)  
4. [Technology Stack & Justification](#4-technology-stack--justification)  
5. [Database Schema Design](#5-database-schema-design)  
6. [Sharding & Replication Strategy](#6-sharding--replication-strategy)  
7. [Query or Distributed Scenario Examples](#7-query-or-distributed-scenario-examples)  
8. [Challenges & Lessons Learned](#8-challenges--lessons-learned)  
9. [Conclusion](#9-conclusion)

---

## 1. Introduction

This project aims to build a robust and scalable backend for a streaming metadata platform. The system manages and provides efficient access to diverse data—ranging from multimedia metadata to user profiles, reviews, and real-time trends—through a **distributed architecture** that ensures scalability, high availability, and flexibility for dynamic streaming workloads.

---

## 2. Use Case Overview

The platform supports essential streaming service functionalities, including:

- 🔍 **Content Discovery**: Manages rich metadata (titles, summaries, genres, cast) for efficient search.
- 🎯 **User Personalization**: Tracks watch history to deliver tailored recommendations.
- 💬 **Community Interaction**: Handles user reviews and ratings to foster engagement.
- 📈 **Trend Analysis**: Identifies popular content in real time for business decisions.
- 🛠️ **Content Management**: Supports the addition, update, and lifecycle of content assets.

---

## 3. System Architecture

The platform is built with **microservices** and **distributed databases**.
![](https://github.com/Ikbal-hand/streaming-api-pdt/blob/main/image/SYSTEM.png)

### Core Components:

- **Node.js API Gateway**: The main entry point, handles business logic and routes API requests.
- **PostgreSQL (Citus - `metadata_db`)**: Relational database for structured metadata; horizontally scaled via sharding.
- **PostgreSQL (`analytics_db`)**: Stores user profiles and watch history; acts as replication publisher.
- **PostgreSQL Replica (`analytics_replica_db`)**: Subscribes to logical replication for read scaling and availability.
- **MongoDB**: Stores user reviews and other semi-structured data.
- **Redis**: In-memory data store for caching and real-time view counters.

---

## 4. Technology Stack & Justification

| Technology         | Description                                 | Reason for Selection                                  |
|-------------------|---------------------------------------------|--------------------------------------------------------|
| Node.js + Express | API Gateway, asynchronous & performant      | Ideal for REST APIs and real-time handling             |
| PostgreSQL Citus   | Sharded relational database                 | Strong consistency with scalable architecture          |
| MongoDB           | NoSQL document database                      | Great for semi-structured review data                  |
| Redis             | In-memory data store                         | Ultra-fast caching and view tracking                   |
| Docker            | Containerization platform                    | Ensures reproducible, portable environments            |
| Swagger/OpenAPI   | API specification & documentation tool       | Interactive docs and developer communication           |
| Faker.js          | Fake/mock data generator                     | For realistic development & seeding scenarios          |

---

## 5. Database Schema Design

This project follows a **polyglot persistence** strategy.

### PostgreSQL (Citus - `metadata_db`)

- `content_metadata` (sharded) – Content details  
- `cast_crew`, `genres` (reference tables)  
- `content_cast_crew`, `content_genres` (co-located join tables)  
- `trending_daily` (sharded)

### PostgreSQL (`analytics_db`)

- `users`, `user_watch_history`

### MongoDB

- `reviews`: Documents of user reviews

### Redis

- `content:metadata:<id>` (JSON string cache)  
- `trending:daily` (sorted set)  
- `content:views:<id>` (integer counter)

---

## 6. Sharding & Replication Strategy

### 6.1. Sharding (Citus)

- Performed on `content_metadata` via `create_distributed_table()` using `content_id`
- Reference tables like `cast_crew` are replicated to all workers
- Enables horizontal scaling and efficient co-location joins

### 6.2. Logical Replication

- `analytics_db` publishes changes from `users` and `user_watch_history`
- `analytics_replica_db` subscribes to those publications
- Benefits:
  - ✅ High availability
  - ✅ Read scaling
  - ✅ Fault tolerance

---

## 7. Query or Distributed Scenario Examples

### 📌 Content Detail Aggregation

**Endpoint**: `GET /api/v1/content/{id}/details`  
**Combines**:
- Metadata from Citus
- Reviews from MongoDB
- View count from Redis
- Usernames from PostgreSQL (FDW to analytics_db)

### 📌 User Watch History

**Endpoint**: `GET /api/v1/content/users/{userId}/watch-history`  
**Combines**:
- Watch records via FDW from `analytics_db`
- Content metadata from `metadata_db`

---

## 8. Challenges & Lessons Learned

| Challenge                                      | Lesson Learned                                                   |
|-----------------------------------------------|------------------------------------------------------------------|
| Citus version differences                     | Always verify docs & compatibility before deploying              |
| Replication failed (wal_level not set)        | Set `wal_level = logical`, assign `REPLICATION` role             |
| Docker startup race conditions                | Implement retry logic & healthchecks                             |
| Node.js dependency issues                     | Ensure `npm install` runs within the container environment       |
| Express route conflicts (`/:id` vs `/ids`)     | Always define static routes before dynamic parameter ones        |
| Swagger parsing issues                        | Use a dedicated `.yaml` file instead of inline JSDoc comments    |

---

## 9. Conclusion

This project successfully demonstrates:

✅ Horizontal **sharding** with Citus  
✅ **Logical replication** for scaling & availability  
✅ Cross-database querying with **FDW**  
✅ Integration of **MongoDB** and **Redis** for diverse data handling  
✅ Unified APIs combining multi-source data

### 🔭 Future Enhancements

- Add more Citus worker nodes for true distributed testing  
- Implement JWT-based authentication & advanced authorization  
- Add centralized observability (logging, metrics)  
- Develop automated testing suites (unit & integration)

---

```

Jika Anda juga butuh file `.md` versi ini, saya bisa bantu buatkan untuk diunduh atau copy langsung ke proyek Anda. Ingin tambahan badge (CI, Docker Hub, License)? Saya bisa bantu juga.
