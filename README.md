# CrisisGrid

A neighborhood emergency coordination platform that helps communities self-organize during crises when 911 is overloaded. Block captains can declare emergencies, manage tasks, and communicate with households — all from a clean web interface.

---

## Features

- **Household Registration** — Residents self-report needs (mobility limits, medical equipment, language, etc.) and available resources
- **Priority Scoring** — Households are automatically scored by vulnerability so captains know who needs help first
- **Crisis Declaration** — Captains can declare emergencies (storm, power outage, flood, wildfire, missing person) as live or drill
- **Task Queue** — Tasks are auto-generated for affected households, sorted by priority, and can be claimed, completed, or flagged
- **Messaging** — Direct messages between households and zone-wide broadcasts from captains
- **Map View** — OpenStreetMap-based visualization of zones and households
- **Debrief Reports** — Post-crisis analytics with coverage metrics and CSV export
- **Admin Dashboard** — System stats, audit log, and household data export
- **Captain Applications** — Households apply to become captains; captains approve/deny
- **Demo/Drill Mode** — Run practice drills clearly marked so nobody panics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Vite |
| Maps | Leaflet + OpenStreetMap (free, no API key) |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite (auto-initialized, no setup) |
| Email (optional) | SMTP (any provider) |

No paid APIs required. Everything runs locally or on a cheap VPS.

---

## Requirements

- **Node.js** 18+ and npm
- **Python** 3.9+
- A server or hosting that can run a Python process (VPS, Railway, Render, etc.)

---

## Quick Start

### 1. Clone / unzip the project

```bash
cd crisisgrid
```

### 2. One-command production start

```bash
bash start.sh
```

This will:
1. Install frontend npm dependencies
2. Build the React frontend
3. Install backend Python dependencies
4. Start the server at `http://localhost:8080`

---

## Manual Development Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
# API calls are proxied to http://localhost:8000
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The SQLite database (`crisisgrid.db`) is created automatically on first run.

---

## Environment Variables

Copy the example file and edit as needed:

```bash
cp frontend/.env.example frontend/.env
```

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | _(Vite proxy)_ | Override backend URL (only needed for production) |

### Backend (set in your shell or server environment)

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | _(none)_ | SMTP server hostname for email alerts |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | _(none)_ | SMTP username |
| `SMTP_PASSWORD` | _(none)_ | SMTP password |
| `SMTP_FROM` | `noreply@crisisgrid.local` | From address on alert emails |
| `APP_URL` | `http://localhost:5173` | Frontend URL used in email links |

Email is fully optional. The app works without any SMTP configuration.

---

## Load Demo Data

To populate the app with sample households, crises, and tasks for testing:

```
POST http://localhost:8080/api/seed
```

Or open the home page and click **Load Demo Data**.

---

## Deployment

The backend serves the built frontend as static files in production. Any host that supports Python works:

- **Railway / Render / Fly.io** — push the repo, set `bash start.sh` as the start command
- **VPS (Ubuntu/Debian)** — run `bash start.sh` and point nginx to port 8080
- **Replit** — `.replit` config is already included

---

## Project Structure

```
crisisgrid/
├── frontend/
│   ├── src/
│   │   ├── pages/        # 11 page components
│   │   ├── components/   # NavBar
│   │   └── api.js        # Centralized API client
│   ├── vite.config.js
│   └── .env.example
├── backend/
│   ├── main.py           # FastAPI app (33 endpoints)
│   └── requirements.txt
└── start.sh              # Production start script
```

---

## License

This source code is sold for single-use deployment. You may modify it freely for your own use. You may not resell or redistribute the source code.
