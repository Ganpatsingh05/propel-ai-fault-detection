-- ===========================================================================
-- Propel AI Fault Detection System
-- 02: Named Constraints
--
-- CHECK constraints for domain validation.
-- UNIQUE constraints for business rules.
-- Separated from table creation for independent management.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- feeders
-- ---------------------------------------------------------------------------

ALTER TABLE feeders
  ADD CONSTRAINT chk_feeders_status
  CHECK (status IN ('active', 'inactive'));

-- ---------------------------------------------------------------------------
-- fault_types
-- ---------------------------------------------------------------------------

ALTER TABLE fault_types
  ADD CONSTRAINT chk_fault_types_severity
  CHECK (severity IN ('critical', 'high', 'medium', 'low'));

-- ---------------------------------------------------------------------------
-- transformers
-- ---------------------------------------------------------------------------

ALTER TABLE transformers
  ADD CONSTRAINT chk_transformers_status
  CHECK (status IN ('active', 'inactive'));

-- ---------------------------------------------------------------------------
-- poles
-- ---------------------------------------------------------------------------

ALTER TABLE poles
  ADD CONSTRAINT chk_poles_status
  CHECK (status IN ('active', 'inactive'));

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

ALTER TABLE devices
  ADD CONSTRAINT chk_devices_device_type
  CHECK (device_type IN (
    'power_monitor', 'voltage_sensor',
    'temperature_sensor', 'vibration_sensor'
  ));

ALTER TABLE devices
  ADD CONSTRAINT chk_devices_status
  CHECK (status IN ('active', 'inactive', 'faulty'));

-- ---------------------------------------------------------------------------
-- telemetry_events
-- ---------------------------------------------------------------------------

ALTER TABLE telemetry_events
  ADD CONSTRAINT chk_telemetry_event_type
  CHECK (event_type IN ('power_lost', 'power_restored', 'heartbeat'));

-- Database-level deduplication: one event per device per timestamp.
ALTER TABLE telemetry_events
  ADD CONSTRAINT uq_telemetry_device_recorded
  UNIQUE (device_id, recorded_at);

-- ---------------------------------------------------------------------------
-- scheduled_outages
-- ---------------------------------------------------------------------------

ALTER TABLE scheduled_outages
  ADD CONSTRAINT chk_outage_time_range
  CHECK (start_time < end_time);

-- At least one scope must be specified.
ALTER TABLE scheduled_outages
  ADD CONSTRAINT chk_outage_scope
  CHECK (feeder_id IS NOT NULL OR transformer_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- detection_results
-- ---------------------------------------------------------------------------

ALTER TABLE detection_results
  ADD CONSTRAINT chk_detection_confidence
  CHECK (confidence >= 0 AND confidence <= 1);

ALTER TABLE detection_results
  ADD CONSTRAINT chk_detection_decision
  CHECK (decision IN ('fault_detected', 'no_fault', 'insufficient_data'));

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------

ALTER TABLE incidents
  ADD CONSTRAINT chk_incidents_status
  CHECK (status IN ('active', 'resolved', 'false_alarm'));

ALTER TABLE incidents
  ADD CONSTRAINT chk_incidents_confidence
  CHECK (confidence >= 0 AND confidence <= 1);

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------

ALTER TABLE tickets
  ADD CONSTRAINT chk_tickets_status
  CHECK (status IN (
    'open', 'in_progress', 'pending_verification',
    'resolved', 'closed'
  ));

ALTER TABLE tickets
  ADD CONSTRAINT chk_tickets_priority
  CHECK (priority IN ('critical', 'high', 'medium', 'low'));

COMMIT;
