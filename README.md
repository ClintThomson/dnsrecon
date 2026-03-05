
# DNSRecon

DNSRecon is a DNS reconnaissance and security toolkit. Originally a Python port of a Ruby script for learning about DNS and security assessments, it has evolved into a full-featured web application with a React frontend, FastAPI backend, and Supabase-powered authentication and storage.

## Features

### DNS Capabilities

- Check all NS Records for Zone Transfers
- Enumerate General DNS Records for a given Domain (MX, SOA, NS, A, AAAA, SPF and TXT)
- Perform common SRV Record Enumeration
- Top Level Domain (TLD) Expansion
- Check for Wildcard Resolution
- Brute Force subdomain and host A and AAAA records given a domain and a wordlist
- Perform a PTR Record lookup for a given IP Range or CIDR
- Check a DNS Server Cached records for A, AAAA and CNAME Records provided a list of host records
- BIND version detection, recursion checks, NXDOMAIN hijack detection
- CAA record enumeration
- DNSSEC zone walking

### Web Application

- **Dashboard** with scan statistics and recent activity
- **New Scan** wizard with 13 scan type options and per-type configuration
- **Scan History** with status tracking, filtering, and pagination
- **Real-time Results** via Supabase Realtime subscriptions
- **User Management** with role-based access control (admin, approved, guest)
- **API Key Management** for programmatic access
- **Dark-mode-first UI** with a cybersecurity-themed design

### Role System

| Role | Access |
|------|--------|
| **guest** | Default for new signups. Sees a "pending approval" page only. |
| **approved** | Full access to scans, history, settings, and API keys. |
| **admin** | Everything above plus user management (approve, promote, demote, delete). |

The first user to sign up on a fresh installation is automatically granted `admin`.

## Architecture

```
Browser ──HTTPS──▶ Fly.io Container
                    ├── FastAPI Backend (Python)
                    │   ├── DNS scan engine (dnspython)
                    │   ├── JWT auth (ES256/HS256 via JWKS)
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

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

Create `frontend/.env` for the frontend:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply database migrations

Run the SQL files in `supabase/migrations/` against your Supabase project, in order:

- `20260304000000_initial_schema.sql` — tables, RLS policies, trigger
- `20260305000000_add_roles.sql` — role column, admin policies, auto-admin trigger

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

### 1. Create the Fly app

```bash
fly launch --no-deploy
```

### 2. Set secrets

```bash
fly secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  "SUPABASE_JWT_SECRET=your-jwt-secret"
```

### 3. Deploy

```bash
fly deploy
```

## CLI Usage

The original CLI and REST API remain fully functional:

```bash
uv run dnsrecon -d example.com -t std
uv run restdnsrecon
```

See the [upstream documentation](https://github.com/darkoperator/dnsrecon) for full CLI options.

## Project Structure

```
dnsrecon/
├── dnsrecon/
│   ├── api.py                 # FastAPI app, SPA serving, CLI endpoints
│   ├── auth.py                # JWT verification (ES256 JWKS + HS256)
│   ├── web_api.py             # Web API: scans, stats, admin, /api/me
│   ├── models.py              # Pydantic request/response models
│   ├── supabase_client.py     # Supabase Python client wrapper
│   └── cli.py                 # Original CLI + DNS scan logic
├── frontend/
│   ├── src/
│   │   ├── pages/             # Login, Register, Dashboard, Scans, Admin, etc.
│   │   ├── components/        # Nav, Layout, ProtectedRoute, UI primitives
│   │   ├── hooks/             # useAuth, useScans
│   │   └── lib/               # Supabase client, API helpers
│   └── package.json
├── supabase/
│   └── migrations/            # SQL schema migrations
├── Dockerfile                 # Multi-stage: Node build → Python runtime
├── fly.toml                   # Fly.io configuration
└── pyproject.toml             # Python dependencies
```

## License

See [LICENSE](LICENSE) for details.
