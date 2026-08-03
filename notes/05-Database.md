# Database Design

## Objectives

The database stores the current network, telemetry history, detected incidents, ticket workflow, and scheduled outages.

---

## Core Tables

- feeders
- transformers
- poles
- devices
- telemetry_events
- incidents
- incident_poles
- tickets
- ticket_history
- scheduled_outages

---

## Relationships

Feeder
→ Transformers

Transformer
→ Poles

Pole
→ Device

Device
→ Telemetry Events

Incident
→ Ticket

Incident
→ Affected Poles

---

## Database Principles

- One table, one responsibility.
- Avoid duplicate information.
- Store facts instead of assumptions.
- Use foreign keys for relationships.
- Optimize for fast lookups.

---

## Expected Queries

- Find all poles under a transformer.
- Find the latest telemetry for a pole.
- Find active incidents.
- Find affected poles for an incident.
- Find tickets waiting for verification.

---

## Future Improvements

- Telemetry partitioning.
- Read replicas.
- Time-series optimization.
- Event archiving.