# Database

PostgreSQL schema for the Propel AI Fault Detection System.

## Prerequisites

- PostgreSQL 13+ installed
- Create the database:
  ```bash
  createdb propel_ai
  ```

## Execution Order

Run scripts in numbered order against the `propel_ai` database:

```bash
psql -d propel_ai -f 01_create_tables.sql
psql -d propel_ai -f 02_constraints.sql
psql -d propel_ai -f 03_indexes.sql
psql -d propel_ai -f 04_seed_data.sql
```

## Scripts

| File | Purpose | Idempotent |
|------|---------|:----------:|
| `01_create_tables.sql` | Creates 10 tables and the `updated_at` trigger function | No |
| `02_constraints.sql` | Adds named CHECK, UNIQUE, and business rule constraints | No |
| `03_indexes.sql` | Creates performance indexes for all query patterns | Yes (drop & recreate) |
| `04_seed_data.sql` | Inserts realistic test data with 4 fault scenarios | No |

## Schema Overview

10 tables mapped to the system architecture:

```
feeders → transformers → poles → devices → telemetry_events
                                                   ↓
                              scheduled_outages → [Fault Engine]
                                                   ↓
                         fault_types → detection_results → incidents → tickets
```

## Seed Data

The seed data creates an 18-pole network in the Whitefield area of Bangalore, Karnataka with 4 scenarios:

| # | Scenario | Confidence | Incident? |
|---|----------|:----------:|:---------:|
| 1 | Span fault between P-003 and P-004 | 0.92 | Yes |
| 2 | Transformer DT-002 failure | 0.88 | Yes |
| 3 | Device failure at P-015 | 0.35 | Yes |
| 4 | Momentary power fluctuation at P-012 | 0.10 | No |

Scenario 4 demonstrates explainable AI: the algorithm records its reasoning even when no fault is detected.

## Design Decisions

- **BIGSERIAL** primary keys — simpler debugging, faster joins, appropriate for single-backend deployment
- **fault_types** as a lookup table — extensible without schema migration
- **detection_results** — AI explainability layer. Records algorithm version, confidence, and reasoning for every analysis
- **Self-referencing FK** on poles (`parent_pole_id`) — encodes tree topology for fault localization
- **Nullable measurement columns** on telemetry — future-proofs for voltage/current sensing without YAGNI violation
