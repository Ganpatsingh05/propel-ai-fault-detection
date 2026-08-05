# Propel AI — Fault Detection System

![Screenshots Placeholder](https://drive.google.com/drive/folders/1IKvJqakHglnE3606jKiX9qBUOT7iDFzH?lfhs=2)

[![Demo Video](https://drive.google.com/drive/folders/1IKvJqakHglnE3606jKiX9qBUOT7iDFzH?lfhs=2)](#demo-placeholder)
[![Live App](https://img.shields.io/badge/Live_App-Try_Now-blue?style=for-the-badge)](#deployment-placeholder)

## 📌 Project Overview
The **Propel AI Fault Detection System** is an end-to-end telemetry ingestion, analysis, and visualization platform designed for modern electricity grid operations. It automatically processes smart meter and IoT telemetry, detects grid anomalies, determines probable fault locations (even with missing topological data), and manages operator workflow for dispatching repair crews.

## ⚠️ Problem Statement
Electricity grids frequently suffer from unplanned outages caused by transformer failures, broken spans, or individual device malfunctions. Traditional grids rely on customers calling to report outages. Modern smart grids generate telemetry, but raw telemetry is noisy, prone to duplicates, and often lacks accurate network topology metadata. 

Grid operators need a system that can:

1. Ingest noisy IoT telemetry at scale.
2. Filter out false positives (e.g., scheduled maintenance).
3. Localize the exact point of failure on the grid.
4. Present actionable, high-confidence intelligence to human dispatchers.

## ✨ Features
- **Real-Time Telemetry Pipeline:** Validates, deduplicates, and ingests telemetry data.
- **Rule-Based Detection Engine:** Deterministic pipeline classifying faults as Span Faults, Transformer Faults, Feeder Faults, or isolated Device Failures.
- **Resilient Localization:** Pinpoints exact topology when available, and estimates logical bounds when mapping data is missing.
- **Confidence Scoring:** Algorithmic confidence scoring (0.0 to 1.0) based on neighbor agreement and data density.
- **Operator Control Room:** A React-based UI providing high-density, real-time grid insights and a geographic map.
- **Ticketing Workflow:** Strict state-machine enforcement (`open → in_progress → resolved → pending_verification → closed`).
- **Fault Simulator:** Built-in simulation panel to inject realistic fault scenarios into the live pipeline.

## 🛠 Tech Stack
**Backend:**
- **Runtime:** Node.js (v20) / Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (pg) — No ORM, parameterized raw SQL.
- **Architecture:** Layered (Controllers, Services, Repositories).

**Frontend:**
- **Framework:** Next.js (App Router, Client-Side SPA paradigm)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State Management:** React Query
- **Mapping:** React-Leaflet + OpenStreetMap

## 📂 Folder Structure
```text
.
├── backend/
│   ├── database/        # DB schema, constraints, indexes, and seed scripts
│   ├── src/
│   │   ├── algorithms/  # Pure TS logic (Detection, Classifier, Localization)
│   │   ├── controllers/ # HTTP Request/Response handling
│   │   ├── services/    # Business logic and workflow enforcement
│   │   ├── database/    # SQL Repositories
│   │   ├── simulator/   # Telemetry scenario generation
│   │   └── routes/      # Express routing definitions
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js Pages & global styles
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # API clients and providers
│   │   └── types/       # Shared TypeScript interfaces
├── docker-compose.yml   # Local production deployment
└── README.md
```

## 🚀 How to Run Locally

Start the entire stack (Database, Backend API, and Frontend) with a single command:
```bash
docker compose up --build
```

This command will:
1. Start PostgreSQL on port `5432` and automatically seed the database.
2. Build and start the Node.js backend on `http://localhost:5000`.
3. Build and start the Next.js frontend on `http://localhost:3000`.

*Note: The frontend will automatically wait for the backend to pass its health checks before starting.*

## 🌐 Public Deployment
- **Frontend App:** [https://propel-ai-fault-detection.vercel.app/](#deployment-placeholder)
- **Backend API:** [https://propel-ai-fault-detection.onrender.com/api/v1/health](#deployment-placeholder)
