-- ===========================================================================
-- Propel AI Fault Detection System
-- 03: Performance Indexes
--
-- Every index is justified by a specific query pattern.
-- This file can be safely dropped and re-run to rebuild indexes.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Network topology lookups
-- PostgreSQL does NOT auto-index FK columns. These are essential.
-- ---------------------------------------------------------------------------

-- "Find all transformers on feeder X"
CREATE INDEX idx_transformers_feeder_id
  ON transformers(feeder_id);

-- "Find all poles under transformer X"
CREATE INDEX idx_poles_transformer_id
  ON poles(transformer_id);

-- "Find child poles of pole X" — recursive CTE traversal
CREATE INDEX idx_poles_parent_pole_id
  ON poles(parent_pole_id);

-- "Find devices on pole X"
CREATE INDEX idx_devices_pole_id
  ON devices(pole_id);

-- ---------------------------------------------------------------------------
-- Telemetry queries (highest-volume table)
-- ---------------------------------------------------------------------------

-- "Latest telemetry for device X" — the single most frequent query.
-- Composite index with DESC enables efficient "ORDER BY recorded_at DESC LIMIT 1".
CREATE INDEX idx_telemetry_device_recorded
  ON telemetry_events(device_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Scheduled outage lookups
-- ---------------------------------------------------------------------------

-- "Is there an active outage for feeder/transformer X right now?"
CREATE INDEX idx_outages_feeder_id
  ON scheduled_outages(feeder_id);

CREATE INDEX idx_outages_transformer_id
  ON scheduled_outages(transformer_id);

-- Time-range overlap queries
CREATE INDEX idx_outages_time_range
  ON scheduled_outages(start_time, end_time);

-- ---------------------------------------------------------------------------
-- Detection result queries
-- ---------------------------------------------------------------------------

-- "Detection results for feeder X"
CREATE INDEX idx_detection_feeder_id
  ON detection_results(feeder_id);

-- "Recent detection results" — for dashboard and debugging
CREATE INDEX idx_detection_analyzed_at
  ON detection_results(analyzed_at);

-- ---------------------------------------------------------------------------
-- Incident dashboard queries
-- ---------------------------------------------------------------------------

-- "Show all active incidents" — partial index.
-- Dashboard only queries active incidents. This index is small and fast.
CREATE INDEX idx_incidents_active
  ON incidents(status) WHERE status = 'active';

-- "Incidents for feeder X"
CREATE INDEX idx_incidents_feeder_id
  ON incidents(feeder_id);

-- "Incidents by fault type" — for analytics and filtering
CREATE INDEX idx_incidents_fault_type_id
  ON incidents(fault_type_id);

-- ---------------------------------------------------------------------------
-- Ticket queries
-- ---------------------------------------------------------------------------

-- "Find tickets by status" (e.g., pending_verification)
CREATE INDEX idx_tickets_status
  ON tickets(status);

COMMIT;
