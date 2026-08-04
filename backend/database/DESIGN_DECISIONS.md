# Database Design Decisions

## Why Detection Results?

The system separates detection from incidents.

The detection engine may conclude that no operational action is required. Therefore every detection does not necessarily create an incident.

This enables explainable AI — the algorithm records its reasoning for every analysis, not just when faults are found.

---

## Why Fault Types as a Lookup Table?

Fault classifications are stored in a lookup table rather than CHECK constraints to allow future expansion without schema changes.

Today: span, transformer, feeder, device_failure.

Tomorrow: fuse failure, voltage sag, neutral break, tree contact — added via INSERT, not ALTER TABLE.

---

## Why Devices Are Separate from Poles?

A device can be replaced while the physical pole remains. They have different lifecycles and different attributes (firmware version, serial number vs. GPS coordinates, sequence number).

A pole may also host multiple sensor types in the future.

---

## Why Self-Referencing FK on Poles?

The electrical distribution network is a tree, not a graph. Each pole has at most one upstream parent. A self-referencing `parent_pole_id` encodes this naturally and supports PostgreSQL recursive CTEs for topology traversal.

A separate spans table was considered and rejected — it would double the maintenance burden for topology data without adding information that the parent-child relationship doesn't already capture.

---

## Why Scheduled Outages?

Scheduled maintenance should not generate false alarms. The fault detection engine checks for active outages before analyzing telemetry. Without this table, every planned maintenance window would create spurious incidents.

---

## Why Confidence?

The assignment states that topology is incomplete for a significant portion of transformers. When topology is unknown, the algorithm cannot precisely localize a fault — it can only estimate.

The confidence score communicates how reliable a localization result is, rather than pretending certainty where none exists.

---

## Why BIGSERIAL Instead of UUID?

This is a single-backend system for an assignment. BIGSERIAL is simpler to debug, produces smaller indexes, and is easier to discuss in an interview. UUID would be appropriate for distributed systems, but that is not a requirement here.

---

## Why feeder_id on Incidents?

Technically derivable from `transformer_id → transformers.feeder_id`. Stored directly on incidents because the dashboard query "show active incidents with feeder name" runs constantly. One denormalized FK eliminates a JOIN chain. The feeder assignment never changes for an incident.
