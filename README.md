# Disaster Response Coordination System

A **beginner-friendly**, **cloud-native** web application for reporting and managing disaster incidents. Built with a **microservices architecture**, **JWT authentication**, and **MongoDB Atlas** — runs **locally without Docker**.

---

## Table of Contents

1. [Features](#features)
2. [System Architecture](#system-architecture)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [MongoDB Atlas Setup](#mongodb-atlas-setup)
6. [Local Setup (Step by Step)](#local-setup-step-by-step)
7. [Microservices Explained](#microservices-explained)
8. [JWT Authentication Flow](#jwt-authentication-flow)
9. [API Endpoints](#api-endpoints)
10. [Docker (Theoretical)](#docker-theoretical)
11. [Kubernetes (Theoretical)](#kubernetes-theoretical)
12. [AWS EC2 Deployment](#aws-ec2-deployment)
13. [AWS ELB (Load Balancer)](#aws-elb-load-balancer)
14. [CI/CD with GitHub Actions](#cicd-with-github-actions)
15. [Viva Questions & Answers](#viva-questions--answers)
16. [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Description |
|---------|-------------|
| User Signup | Create account with name, email, password |
| User Login | Authenticate and receive JWT token |
| JWT Auth | Secure API access for incident operations |
| Report Incidents | Title, description, location, severity |
| Dashboard | Card-based view of all incidents |
| Update Status | reported → in-progress → resolved → closed |
| Delete Incidents | Remove incidents from the system |
| Logout | Clear token and return to login screen |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND (HTML + CSS + Vanilla JS)                 │
│              Port 5500 (optional node server.js)              │
└──────────────┬─────────────────────────────┬────────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│   AUTH MICROSERVICE      │   │   INCIDENT MICROSERVICE          │
│   Node.js + Express      │   │   Node.js + Express              │
│   Port 3001              │   │   Port 3002                      │
│   - Signup / Login       │   │   - CRUD incidents               │
│   - Issue JWT            │   │   - Verify JWT on each request   │
└──────────────┬───────────┘   └──────────────────┬───────────────┘
               │                                   │
               └───────────────┬───────────────────┘
                               ▼
               ┌───────────────────────────────┐
               │      MongoDB Atlas (Cloud)     │
               │   Collections: users, incidents│
               └───────────────────────────────┘
```

**Why microservices?**

- **Separation of concerns**: Authentication logic is isolated from incident logic.
- **Independent scaling**: Auth and incidents can scale separately in production.
- **Easier to explain**: Each service has one clear responsibility.

---

## Project Structure

```
Disaster Management System/
├── frontend/                 # Static UI
│   ├── index.html
│   ├── css/styles.css
│   ├── js/config.js          # API URLs
│   ├── js/api.js             # HTTP helpers
│   ├── js/app.js             # UI logic
│   └── server.js             # Optional static server (port 5500)
├── auth-service/             # Authentication microservice
│   ├── server.js
│   ├── models/User.js
│   ├── routes/authRoutes.js
│   └── middleware/authMiddleware.js
├── incident-service/         # Incident microservice
│   ├── server.js
│   ├── models/Incident.js
│   ├── routes/incidentRoutes.js
│   └── middleware/authMiddleware.js
├── docker/                   # Dockerfiles (theory only)
├── kubernetes/               # K8s YAML (theory only)
├── docker-compose.yml        # Multi-container setup (theory)
├── .github/workflows/        # CI/CD pipeline
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **MongoDB Atlas** free cluster ([mongodb.com/atlas](https://www.mongodb.com/atlas))
- A modern browser (Chrome, Edge, Firefox)
- **No Docker required** for local development

---

## MongoDB Atlas Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a **free M0 cluster**.
3. Go to **Database Access** → Add user (username + password). Remember the password.
4. Go to **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) for student projects (use restricted IPs in production).
5. Click **Connect** on your cluster → **Drivers** → copy the connection string.
6. Replace `<password>` with your user password and set database name, e.g. `disaster_db`:

```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/disaster_db?retryWrites=true&w=majority
```

---

## Local Setup (Step by Step)

### 1. Configure Auth Service

```bash
cd auth-service
copy .env.example .env
```

Edit `.env`:

```env
PORT=3001
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=my_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:5500
```

Install and run:

```bash
npm install
node server.js
```

You should see: `Auth service running at http://localhost:3001`

### 2. Configure Incident Service (new terminal)

```bash
cd incident-service
copy .env.example .env
```

Use the **same** `MONGODB_URI` and **same** `JWT_SECRET` as auth-service:

```env
PORT=3002
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=my_secret_key_at_least_32_characters_long
FRONTEND_URL=http://localhost:5500
```

```bash
npm install
node server.js
```

You should see: `Incident service running at http://localhost:3002`

### 3. Run Frontend (new terminal)

**Option A (recommended)** — simple Node server:

```bash
cd frontend
node server.js
```

Open: **http://localhost:5500**

**Option B** — VS Code Live Server extension on `index.html` (port may differ; update `FRONTEND_URL` in `.env` if needed).

> **Important:** Opening `index.html` directly (`file://`) may cause CORS errors. Use Option A or Live Server.

### 4. Test the Application

1. Open http://localhost:5500
2. **Sign Up** with name, email, password
3. **Report Incident** from the dashboard
4. Change **status** via dropdown
5. **Delete** an incident
6. **Log Out**

Health checks:

- http://localhost:3001/health
- http://localhost:3002/health

---

## Microservices Explained

### Auth Service (Port 3001)

- Stores users in MongoDB (`users` collection).
- Hashes passwords with **bcrypt** (never stores plain text).
- Issues **JWT** tokens on signup/login.
- Endpoints: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`.

### Incident Service (Port 3002)

- Stores incidents in MongoDB (`incidents` collection).
- Every route requires `Authorization: Bearer <token>`.
- Validates JWT using the **same secret** as auth service.
- Endpoints: full CRUD on `/api/incidents`.

### Why two services share one database?

For simplicity in a student project, both connect to the same Atlas database. In larger systems, each service might have its own database (database-per-service pattern).

---

## JWT Authentication Flow

```
1. User logs in → Auth service verifies password
2. Auth service creates JWT signed with JWT_SECRET
   Payload: { userId, email, name }
3. Frontend saves token in localStorage
4. Frontend sends header on incident requests:
   Authorization: Bearer <token>
5. Incident service verifies signature with JWT_SECRET
6. If valid → request proceeds; if not → 401 Unauthorized
```

**Key point for viva:** Both microservices must use the **identical** `JWT_SECRET`. Otherwise incident APIs will reject valid tokens.

---

## API Endpoints

### Auth Service (`http://localhost:3001`)

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/api/auth/signup` | No | `{ name, email, password }` |
| POST | `/api/auth/login` | No | `{ email, password }` |
| GET | `/api/auth/me` | Yes | — |

### Incident Service (`http://localhost:3002`)

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/api/incidents` | Yes | — |
| POST | `/api/incidents` | Yes | `{ title, description, location, severity }` |
| PUT | `/api/incidents/:id` | Yes | `{ status, ... }` |
| DELETE | `/api/incidents/:id` | Yes | — |

---

## Docker (Theoretical)

**Docker** packages an application and its dependencies into an **image**. A running image is a **container**.

| File | Purpose |
|------|---------|
| `docker/Dockerfile.auth` | Image for auth service |
| `docker/Dockerfile.incident` | Image for incident service |
| `docker/Dockerfile.frontend` | Nginx serving static files |
| `docker-compose.yml` | Runs all services together |

Example (not required locally):

```bash
docker-compose up --build
```

**Benefits:** Same environment on every machine; easy deployment to cloud.

---

## Kubernetes (Theoretical)

**Kubernetes (K8s)** orchestrates containers in production.

| Resource | Role |
|----------|------|
| **Deployment** | Keeps N replicas of a pod running |
| **Service** | Stable network endpoint for pods |
| **Secret** | Stores JWT_SECRET, MONGODB_URI |

Files in `kubernetes/`:

- `auth-deployment.yaml` + `auth-service.yaml`
- `incident-deployment.yaml` + `incident-service.yaml`

**Flow:** User → Ingress/LoadBalancer → Services → Pods (containers).

---

## AWS EC2 Deployment

High-level steps to deploy on **Amazon EC2** (Elastic Compute Cloud):

1. **Launch EC2 instance** (Ubuntu 22.04, t2.micro for learning).
2. **Security Group**: Allow inbound ports 22 (SSH), 80 (HTTP), 3001, 3002 (or only 80 if using reverse proxy).
3. **SSH into instance**: `ssh -i key.pem ubuntu@<public-ip>`
4. **Install Node.js**: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
5. **Clone project** from GitHub.
6. Create `.env` files for both services with production MongoDB URI.
7. Run services with **PM2** (process manager):
   ```bash
   npm install -g pm2
   cd auth-service && npm install && pm2 start server.js --name auth
   cd ../incident-service && npm install && pm2 start server.js --name incident
   ```
8. Serve frontend with **Nginx** or include in S3 + CloudFront.
9. Use **Nginx reverse proxy** to route `/api/auth` → 3001 and `/api/incidents` → 3002.

---

## AWS ELB (Load Balancer)

**Elastic Load Balancer (ELB)** distributes incoming traffic across multiple EC2 instances or containers.

| Type | Use case |
|------|----------|
| **ALB** (Application) | HTTP/HTTPS, path-based routing (e.g. `/auth` vs `/incidents`) |
| **NLB** (Network) | Low latency, TCP/UDP |
| **CLB** (Classic) | Legacy |

**For this project:**

- ALB listens on port 443 (HTTPS).
- Target Group 1 → auth-service instances (port 3001).
- Target Group 2 → incident-service instances (port 3002).
- Health checks hit `/health` on each service.

**Benefit:** If one server fails, traffic goes to healthy instances (high availability).

---

## CI/CD with GitHub Actions

**CI (Continuous Integration):** Automatically test/build on every push.

**CD (Continuous Deployment):** Automatically deploy to production after tests pass.

File: `.github/workflows/ci-cd.yml`

**What it does:**

1. Triggers on push/PR to `main`.
2. Installs Node.js dependencies for both services.
3. Verifies project structure.

**Extension for production:** Add steps to build Docker images, push to ECR, and deploy to EKS/EC2.

---

## Viva Questions & Answers

### Q1. What is a microservice?

**A:** A small, independent service that does one job well. Here, auth and incidents are separate services with their own code and ports.

### Q2. What is JWT and why use it?

**A:** JSON Web Token — a signed string that proves the user is logged in. The server does not need to store sessions in memory; the token carries user identity and is verified with a secret key.

### Q3. Why must JWT_SECRET be the same in both services?

**A:** Auth service **signs** the token; incident service **verifies** it. Verification only works with the same secret.

### Q4. What is MongoDB Atlas?

**A:** Cloud-hosted MongoDB. We use it so we do not install MongoDB locally; both services connect via connection string.

### Q5. What is CORS?

**A:** Cross-Origin Resource Sharing. Browser blocks requests from `localhost:5500` to `localhost:3001` unless the API allows it via `cors()` middleware.

### Q6. How are passwords stored securely?

**A:** bcrypt hashes the password before saving. Login compares hash with `bcrypt.compare()` — plain password is never stored.

### Q7. Difference between Docker and Kubernetes?

**A:** Docker runs containers on one machine. Kubernetes manages many containers across many machines (scaling, self-healing, load balancing).

### Q8. What is a load balancer?

**A:** Distributes traffic across multiple servers so no single server is overloaded and failures are handled gracefully.

### Q9. What is CI/CD?

**A:** CI automatically tests code on each commit. CD automatically deploys tested code to production, reducing human error.

### Q10. What happens when token expires?

**A:** Incident API returns 401. Frontend should redirect user to login. Token expiry is set by `JWT_EXPIRES_IN` (default 24h).

### Q11. What is the difference between monolith and microservices?

**A:** Monolith = one big application. Microservices = multiple small apps communicating over network. Microservices scale and deploy independently but are more complex to operate.

### Q12. Name the HTTP methods used in this project.

**A:** GET (list/read), POST (create/signup/login), PUT (update status), DELETE (remove incident).

### Q13. What is bcrypt salt?

**A:** Random data added before hashing so identical passwords produce different hashes, improving security.

### Q14. Why use environment variables (.env)?

**A:** Keeps secrets (DB password, JWT secret) out of source code and allows different values per environment (dev vs production).

### Q15. How would you improve this project for production?

**A:** HTTPS, rate limiting, input validation library, refresh tokens, role-based access, logging (Winston), monitoring, restricted MongoDB IP whitelist, secrets manager (AWS Secrets Manager).

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MONGODB_URI is missing` | Create `.env` from `.env.example` in each service folder |
| `Invalid or expired token` | Ensure `JWT_SECRET` matches in both `.env` files |
| CORS / fetch failed | Use `node server.js` in frontend, not `file://` |
| `Email already registered` | Use login instead, or different email |
| Cannot connect to MongoDB | Check Atlas IP whitelist and password in URI |
| Port already in use | Change `PORT` in `.env` or stop other process |

---

## License

MIT — free for educational use.

---

**Built for students learning cloud-native concepts, microservices, and JWT — with a stable, runnable local setup.**
