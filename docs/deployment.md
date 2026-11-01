# Deployment & Production Operations

This document covers running BuildPlanner AI in development, containerized environments, and cloud production deployments.

---

## 1. Quick Start (Containerized with Docker Compose)

The easiest way to run the entire production-grade stack (MongoDB + API Backend + Web Frontend) is using `docker-compose.yml`:

```bash
# Clone and enter the repository
cd buildplanner-ai

# Build and start all services in the background
docker compose up -d --build
```

Services will be accessible at:
- **Web UI**: `http://localhost:80`
- **REST API**: `http://localhost:5000/api`
- **MongoDB**: `localhost:27017`

To shut down the cluster:
```bash
docker compose down
```

---

## 2. Local Bare-Metal Development

BuildPlanner AI is designed for **instant, zero-config local development**. You do not need to install MongoDB locally because the API includes an automatic embedded `mongodb-memory-server` fallback.

```bash
# 1. Install all dependencies across the workspace
pnpm install

# 2. Build all shared TypeScript packages
pnpm -r --filter "@buildplanner/*" run build

# 3. Start development servers concurrently
pnpm dev
```

- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:5000`

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3.1 Backend Variables (`apps/api/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for Express API | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection URI. If omitted, uses embedded in-memory MongoDB | `mongodb://localhost:27017/buildplanner` |
| `JWT_SECRET` | Secret key for signing authentication tokens | `buildplanner_dev_secret_key_2026` |
| `JWT_EXPIRES_IN`| Lifespan of access tokens | `7d` |
| `CORS_ORIGIN` | Allowed cross-origin origin | `http://localhost:5173,http://localhost:80` |

### 3.2 Frontend Variables (`apps/web/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:5000/api` |

---

## 4. Production Cloud Deployment Architecture

For high-availability production on AWS, GCP, or DigitalOcean:

```mermaid
flowchart LR
    Client[Browser / User] --> Cloudflare[Cloudflare DNS / SSL CDN]
    Cloudflare --> ALB[Nginx Ingress / Application Load Balancer]
    ALB --> WebSvc[Web Container Cluster (Nginx SPA)]
    ALB --> APISvc[API Container Cluster (Node.js Express)]
    APISvc --> Atlas[(MongoDB Atlas Replicaset)]
```

### Recommended Specifications:
- **API Pods**: 2 vCPU, 2 GB RAM (Node.js 24 with horizontal pod autoscaling).
- **Web Pods**: 1 vCPU, 512 MB RAM (Nginx Alpine serving static assets).
- **Database**: MongoDB Atlas M10+ with automated snapshots and read-replicas.
