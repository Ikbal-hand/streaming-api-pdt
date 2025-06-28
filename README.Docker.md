# Streaming Service Metadata Platform

This is the backend system for a streaming service metadata platform, built with Node.js, Express, PostgreSQL (Citus), MongoDB, and Redis.

## Getting Started with Docker

To run the entire system using Docker Compose, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd streaming-metadata-platform
    ```

2.  **Make sure Docker and Docker Compose are installed.**

3.  **Run the containers:**
    This command will build the Node.js application image, create the containers for all databases, and start the services.
    ```bash
    docker-compose -f compose.yaml up --build -d
    ```

4.  **Verify the services:**
    Check the status of all containers.
    ```bash
    docker-compose ps
    ```

5.  **Access the application:**
    -   **API:** `http://localhost:3000/`
    -   **API Documentation (Swagger UI):** `http://localhost:3000/api-docs`
    -   **PostgreSQL (Citus):** `localhost:5432`
    -   **PostgreSQL (Analytics):** `localhost:5433`
    -   **MongoDB:** `localhost:27017`
    -   **Redis:** `localhost:6379`

6.  **Stop and remove containers:**
    ```bash
    docker-compose down
    ```