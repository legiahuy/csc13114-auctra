# Auctra Project Installation Guide

This guide describes how to deploy the Auctra platform locally using Docker Compose. This is the recommended way to run the application for testing and grading.

## Prerequisites
- Docker & Docker Compose installed on your machine.
- Git (optional, if cloning the repo).

## Quick Start (Deploy Everything)

1.  **Start all services:**
    Run the following command in the project root directory:
    ```bash
    docker-compose up -d --build
    ```
    This will build and start:
    *   **Backend API**: http://localhost:3000
    *   **Frontend App**: http://localhost:3001
    *   **Database**: PostgreSQL on port 5432
    *   **Monitoring**: Grafana (http://localhost:3002) & Loki (port 3100)

2.  **Wait for services:**
    Wait for about 1-2 minutes for all containers to initialize (especially the database).

3.  **Seed the Database:**
    To populate the database with initial users, products, and categories, run:
    ```bash
    docker-compose exec backend npm run seed:prod
    ```
    *This creates admin users, categories, and sample auctions.*

4.  **Access the Application:**
    Open your browser to: **http://localhost:3001**

## Log Monitoring (Optional)
To view application logs via Grafana:
1.  Open **http://localhost:3002**
2.  Login with: `admin` / `admin`
3.  Go to **Explore** -> Select **Loki**.
4.  Run query: `{job="auction-api"}` to see backend logs.

## Stopping the Application
To stop all services:
```bash
docker-compose down
```
To stop and remove volumes (reset database):
```bash
docker-compose down -v
```
