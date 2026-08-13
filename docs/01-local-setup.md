# EduBridge: Local Environment Setup Guide

Welcome to the EduBridge project! This guide will walk you through setting up the complete full-stack development environment on your local machine.

We use **Docker** to ensure that everyone on the team has the exact same development environment, eliminating "it works on my machine" bugs.

---

## 1. Prerequisites

Before cloning the repository, you must install the following tools:

### Install Git
- **Windows / Mac / Linux:** Download and install Git from [git-scm.com](https://git-scm.com/downloads).

### Install Docker Desktop
Docker is required to run the database, backend, and frontend seamlessly.
- **Windows:** Download Docker Desktop for Windows from [docker.com](https://www.docker.com/products/docker-desktop/). 
  *(Note: Windows users should ensure WSL2 is enabled during installation for better performance).*
- **Mac:** Download Docker Desktop for Mac (ensure you select the correct version for Intel or Apple Silicon/M-series chips).
- **Linux:** Follow the specific instructions for your distribution on the [Docker Engine installation page](https://docs.docker.com/engine/install/).

**Verify Installation:**
Open your terminal or command prompt and run:
```bash
docker --version
docker-compose --version
```
*Both commands should return version numbers.*

---

## 2. Setting Up the Project

### Step 2.1: Clone the Repository
Open your terminal, navigate to your preferred workspace folder, and clone the repository:
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd Edubridge
```

### Step 2.2: Configure Environment Variables
The project requires environment variables to connect the backend, frontend, and database securely.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Copy the example `.env` file (if one exists) or create a new `.env` file with the following standard local development values:
   ```env
   # Database connection string for the dockerized Postgres instance
   DATABASE_URL="postgresql://postgres:postgres@db:5432/edubridge?schema=public"
   
   # Better Auth Configuration
   BETTER_AUTH_SECRET="your-super-secret-local-key-for-better-auth"
   BETTER_AUTH_URL="http://localhost:5001"
   ```
3. Return to the root directory:
   ```bash
   cd ..
   ```

---

## 3. Running the Application

With Docker running in the background (ensure the Docker Desktop app is open), execute the following command from the root of the project:

```bash
docker-compose up --build
```

### What happens when you run this?
1. **Postgres Database:** Spools up a local Postgres database on port `5432`.
2. **Backend (Express):** Installs Node modules, runs Prisma migrations automatically, and starts the API on `http://localhost:5001`.
3. **Frontend (Next.js):** Installs Node modules and starts the React development server on `http://localhost:3000`.

*Note: The first time you run this command, it may take 5-10 minutes to download all the necessary Docker images and npm packages.*

---

## 4. Verifying the Installation

Once the terminal output settles and indicates that both the Next.js and Express servers are running, verify your setup:

1. **Frontend UI:** Open your browser and navigate to `http://localhost:3000`. You should see the EduBridge landing or login page.
2. **Backend API:** Open `http://localhost:5001/` in your browser. You should receive a JSON response: `{"success": true, "message": "EduBridge backend is running"}`.

---

## 5. Stopping the Environment

When you are done working for the day, you can stop the containers by pressing `Ctrl + C` in the terminal where Docker is running. 

To completely shut down and remove the containers (your database data will persist in Docker volumes), run:
```bash
docker-compose down
```

### Troubleshooting
- **Port Conflicts:** If you get an error that a port (like 5432, 3000, or 5001) is already in use, you must stop the local application that is currently using that port before running Docker.
- **Database Reset:** If you ever need to completely wipe your local database and start fresh, run: `docker-compose down -v` to destroy the volumes, then run `docker-compose up --build` again.

---

## Next Steps
Now that your environment is running, please read the [Architecture & Workflow Guide](./02-architecture-and-workflow.md) to understand how the codebase is structured and how we collaborate.
