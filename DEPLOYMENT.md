# Deployment Guide

This guide details how to deploy the Propel AI Fault Detection backend to production environments, as well as how to run local production tests using Docker Compose.

---

## 1. Required Environment Variables

Regardless of your hosting provider, the backend requires the following environment variables to run in production:

| Variable       | Description | Default (Local) |
|---------------|-------------|-----------------|
| `NODE_ENV`    | Sets the environment mode (must be `production`) | `production` |
| `PORT`        | The port the Express server will listen on | `5000` |
| `DB_HOST`     | PostgreSQL database host | `localhost` / `postgres` |
| `DB_PORT`     | PostgreSQL database port | `5432` |
| `DB_USER`     | PostgreSQL database user | `postgres` |
| `DB_PASSWORD` | PostgreSQL database password | `postgres` |
| `DB_NAME`     | PostgreSQL database name | `propel` |
| `FRONTEND_URL`| Allowed CORS origin for the frontend | `http://localhost:3000` |

---

## 2. Health Check URL

After deployment, you can verify the backend is online and successfully connected to the database by navigating to:
```
GET /api/v1/health
```
A successful response will look like:
```json
{
  "success": true,
  "message": "System operational",
  "data": {
    "status": "online",
    "timestamp": "...",
    "database": "connected"
  }
}
```

---

## 3. Local Production Testing (Docker Compose)

You can run the entire stack (Database, API, and Frontend) locally exactly as it will run in production.

1. Ensure Docker Desktop is running.
2. In the project root, run:
   ```bash
   docker compose up --build
   ```
3. Docker Compose will automatically:
   - Spin up the database and seed it.
   - Build and start the Node.js backend on `http://localhost:5000` (waiting for DB).
   - Build and start the Next.js frontend on `http://localhost:3000` (waiting for Backend).

---

## 4. Database Initialization

### Automated (Docker)
When using the provided `docker-compose.yml`, the database is automatically initialized. The `./backend/database` folder is mounted to `/docker-entrypoint-initdb.d/`. Postgres will automatically execute the files in alphabetical order on first boot:
1. `01_create_tables.sql`
2. `02_constraints.sql`
3. `03_indexes.sql`
4. `04_seed_data.sql`

### Manual SQL Import (Cloud Providers)
If you provision a managed PostgreSQL database (e.g., Supabase, Neon, Render DB), you must import the SQL files manually.
You can use `psql` or a tool like `pgAdmin`/`DBeaver`:
```bash
# Example psql command:
psql -h <cloud-db-host> -U <user> -d <db-name> -f backend/database/01_create_tables.sql
psql -h <cloud-db-host> -U <user> -d <db-name> -f backend/database/02_constraints.sql
psql -h <cloud-db-host> -U <user> -d <db-name> -f backend/database/03_indexes.sql
psql -h <cloud-db-host> -U <user> -d <db-name> -f backend/database/04_seed_data.sql
```

---

## 5. Render Deployment

Render natively supports deploying from a `Dockerfile`.

1. **Create the Database:** 
   - Go to the Render Dashboard → **New PostgreSQL**.
   - Note the **Internal Database URL** and **External Database URL**.
   - Use a SQL client (like DBeaver) to connect via the External URL and run the initialization scripts.
2. **Create the Web Service:**
   - Go to the Render Dashboard → **New Web Service**.
   - Connect your GitHub repository.
   - **Root Directory:** `backend`
   - **Environment:** `Docker`
   - Render will automatically detect the `backend/Dockerfile`.
3. **Environment Variables:**
   - Add the required environment variables. 
   - For `DB_HOST`, extract the hostname from the Internal Database URL.

---

## 6. Railway Deployment

Railway detects the `Dockerfile` automatically and makes deployment seamless.

1. **Create the Database:**
   - Click **New** → **Database** → **Add PostgreSQL**.
   - Connect to the DB using the provided credentials and run the initialization SQL scripts.
2. **Create the Web Service:**
   - Click **New** → **GitHub Repo**.
   - Select your repository.
   - Go to the Service Settings → **Root Directory** → Set to `/backend`.
3. **Environment Variables:**
   - Railway exposes variables like `${{Postgres.PGHOST}}`.
   - Set up your variables:
     - `DB_HOST`: `${{Postgres.PGHOST}}`
     - `DB_USER`: `${{Postgres.PGUSER}}`
     - `DB_PASSWORD`: `${{Postgres.PGPASSWORD}}`
     - `DB_NAME`: `${{Postgres.PGDATABASE}}`

---

## 7. Common Deployment Issues

**1. `ECONNREFUSED` / Database connection fails on startup**
- **Cause:** The backend is trying to connect to a database host that is incorrect, or the database isn't ready yet.
- **Fix:** Double-check your `DB_HOST`, `DB_USER`, and `DB_PASSWORD` variables. If using Docker Compose, ensure the `depends_on: postgres: condition: service_healthy` block is intact.

**2. Next.js Frontend cannot reach the API**
- **Cause:** CORS is blocking the request.
- **Fix:** Ensure the backend `FRONTEND_URL` environment variable exactly matches your deployed frontend URL (e.g., `https://my-frontend.vercel.app` — no trailing slash).

**3. Missing dependencies in production**
- **Cause:** Running `npm ci --only=production` skips `devDependencies`. If the app crashes saying a module is missing, it was likely installed in `devDependencies` instead of `dependencies`.
- **Fix:** Move the required package to `dependencies` in `package.json`. (Note: We have verified the current `package.json` correctly separates build tools vs runtime tools).
