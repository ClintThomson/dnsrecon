
# DNSRecon Web

A web application built on top of [DNSRecon](https://github.com/darkoperator/dnsrecon), the open-source DNS reconnaissance toolkit by darkoperator. This fork wraps the full power of DNSRecon's 13 scan types in a modern web interface with user accounts, saved scan history, and role-based access control.

The original CLI (`dnsrecon`) and REST API (`restdnsrecon`) remain fully functional and unchanged.

## What This Fork Adds

- **React SPA frontend** with a dark-mode cybersecurity-themed UI
- **Supabase backend** for authentication, PostgreSQL storage, and real-time scan updates
- **Single-container deployment** on Fly.io (FastAPI serves both the API and the built frontend)
- **User management** with an admin approval workflow — new signups are guests until an admin approves them
- **Live scan progress** — results stream into the UI as they're discovered (every 3 seconds), not after the scan finishes
- **Scan cancellation** — cancel long-running scans from the UI; partial results are preserved
- **Scan history and dashboard** — every scan is persisted with full results, filterable and searchable
- **API key management** for programmatic access to the web API

## Role System

| Role | Access |
|------|--------|
| **guest** | Default for new signups. Sees a "pending approval" page only. |
| **approved** | Full access to scans, history, settings, and API keys. |
| **admin** | Everything above plus user management (approve, promote, demote, delete). |

## Scan Features

- **13 scan types** inherited from upstream DNSRecon (general enum, brute domain, brute reverse, SRV brute, TLD brute, zone walk, zone transfer, wildcard check, CAA records, cache snoop, BIND version, recursion check, NXDOMAIN hijack)
- **Incremental results** — records are flushed to the database every 3 seconds during a scan and appear live in the UI via polling
- **Progress indicator** — a live record count updates as the scan runs
- **Cancel** — running scans can be cancelled from the scan detail page; partial results are kept with a `cancelled` status

The first user to sign up on a fresh installation is automatically granted `admin`.

## Architecture

```
Browser ──HTTPS──▶ Fly.io Container
                    ├── FastAPI Backend (Python)
                    │   ├── DNSRecon scan engine (dnspython)
                    │   ├── JWT auth (ES256 via JWKS + HS256 fallback)
                    │   └── Supabase client (service role)
                    └── React SPA (static files)
                        ├── Supabase Auth (email/password)
                        └── Supabase Realtime
```

**Stack:** React 19 · Vite · React Router · Tailwind CSS · shadcn/ui · FastAPI · Supabase · Fly.io

## Quick Start (Local Development)

### Requirements

- Python 3.12+
- Node.js 22+
- A [Supabase](https://supabase.com) project

### 1. Clone and install backend

```bash
git clone https://github.com/your-org/dnsrecon.git
cd dnsrecon
uv sync
```

### 2. Configure environment

Create a root `.env` for the backend:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

Create `frontend/.env` for the frontend:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply database migrations

Run the SQL files in `supabase/migrations/` against your Supabase project, in order:

1. `20260304000000_initial_schema.sql` — tables, RLS policies, new-user trigger
2. `20260305000000_add_roles.sql` — role column, admin policies, auto-admin for first user
3. `20260305100000_add_scan_progress.sql` — progress tracking column, `cancelled` scan status

### 4. Install and build frontend

```bash
cd frontend
npm ci
npm run build
cd ..
```

### 5. Run the app

```bash
uv run uvicorn dnsrecon.api:app --host 0.0.0.0 --port 8080
```

Visit `http://localhost:8080`. The first user to sign up becomes `admin`.

## Deployment (Fly.io)

The app ships as a single Docker container with a multi-stage build (Node for the frontend, Python for the backend).

```bash
# Create app
fly launch --no-deploy

# Set secrets
fly secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  "SUPABASE_JWT_SECRET=your-jwt-secret"

# Deploy
fly deploy
```

## Using the Original CLI

This fork preserves the upstream CLI and REST API. They work exactly as documented in the [upstream repository](https://github.com/darkoperator/dnsrecon):

```bash
uv run dnsrecon -d example.com -t std
uv run restdnsrecon
```

## Project Structure

```
├── dnsrecon/
│   ├── api.py                 # FastAPI app — SPA serving + original endpoints
│   ├── auth.py                # JWT verification (ES256 JWKS + HS256)
│   ├── web_api.py             # Web API: scans, stats, admin, user management
│   ├── models.py              # Pydantic request/response models
│   ├── supabase_client.py     # Supabase Python client wrapper
│   └── cli.py                 # Upstream CLI + DNS scan engine
├── frontend/                  # React SPA (Vite + Tailwind + shadcn/ui)
├── supabase/migrations/       # SQL schema migrations
├── Dockerfile                 # Multi-stage build (Node → Python)
├── fly.toml                   # Fly.io config
└── pyproject.toml             # Python dependencies
```

## Upstream

DNSRecon was created by [Carlos Perez (darkoperator)](https://github.com/darkoperator/dnsrecon). This fork extends it with a web interface and does not modify the core DNS scanning logic.

## License

See [LICENSE](LICENSE) for details.
