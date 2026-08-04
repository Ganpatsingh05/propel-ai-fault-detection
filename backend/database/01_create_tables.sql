-- ===========================================================================
-- Propel AI Fault Detection System
-- 01: Table Definitions
--
-- Creates 10 tables in dependency order and the shared updated_at trigger.
-- Run this script first.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Trigger function: auto-update updated_at on row modification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. feeders
-- Top of the electrical distribution hierarchy.
-- A feeder is a high-voltage line from a substation.
-- ---------------------------------------------------------------------------

CREATE TABLE feeders (
  id          BIGSERIAL     PRIMARY KEY,
  code        VARCHAR(20)   NOT NULL UNIQUE,
  name        VARCHAR(100)  NOT NULL,
  status      VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_feeders_updated_at
  BEFORE UPDATE ON feeders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. fault_types
-- Lookup table for fault classification.
-- Extensible via INSERT — no schema migration needed for new fault types.
-- ---------------------------------------------------------------------------

CREATE TABLE fault_types (
  id          BIGSERIAL     PRIMARY KEY,
  name        VARCHAR(50)   NOT NULL UNIQUE,
  severity    VARCHAR(20)   NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. transformers
-- Distribution transformers. Step down voltage for a local area.
-- Each transformer belongs to exactly one feeder.
-- ---------------------------------------------------------------------------

CREATE TABLE transformers (
  id            BIGSERIAL     PRIMARY KEY,
  feeder_id     BIGINT        NOT NULL REFERENCES feeders(id),
  code          VARCHAR(20)   NOT NULL UNIQUE,
  name          VARCHAR(100)  NOT NULL,
  latitude      NUMERIC(10,7) NOT NULL,
  longitude     NUMERIC(10,7) NOT NULL,
  capacity_kva  INTEGER,
  status        VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_transformers_updated_at
  BEFORE UPDATE ON transformers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. poles
-- Physical electricity poles. Nodes of the distribution network.
-- parent_pole_id encodes tree topology for fault localization.
-- NULL parent_pole_id = root pole (first pole from transformer).
-- ---------------------------------------------------------------------------

CREATE TABLE poles (
  id              BIGSERIAL     PRIMARY KEY,
  transformer_id  BIGINT        NOT NULL REFERENCES transformers(id),
  parent_pole_id  BIGINT        REFERENCES poles(id),
  code            VARCHAR(20)   NOT NULL UNIQUE,
  latitude        NUMERIC(10,7) NOT NULL,
  longitude       NUMERIC(10,7) NOT NULL,
  sequence_number INTEGER       NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_poles_updated_at
  BEFORE UPDATE ON poles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. devices
-- IoT monitoring devices mounted on poles.
-- One pole can have multiple devices (power monitor, voltage sensor, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE devices (
  id                BIGSERIAL     PRIMARY KEY,
  pole_id           BIGINT        NOT NULL REFERENCES poles(id),
  serial_number     VARCHAR(50)   NOT NULL UNIQUE,
  device_type       VARCHAR(30)   NOT NULL DEFAULT 'power_monitor',
  firmware_version  VARCHAR(20),
  status            VARCHAR(20)   NOT NULL DEFAULT 'active',
  installed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 6. telemetry_events
-- Raw device observations. Immutable after storage.
-- Always stored — even if validation or detection finds nothing.
-- Enables algorithm replay for debugging.
-- ---------------------------------------------------------------------------

CREATE TABLE telemetry_events (
  id              BIGSERIAL     PRIMARY KEY,
  device_id       BIGINT        NOT NULL REFERENCES devices(id),
  event_type      VARCHAR(20)   NOT NULL,
  voltage         NUMERIC(7,2),
  current         NUMERIC(7,2),
  signal_strength NUMERIC(5,2),
  battery_level   NUMERIC(5,2),
  recorded_at     TIMESTAMPTZ   NOT NULL,
  received_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- No updated_at trigger: telemetry is immutable.

-- ---------------------------------------------------------------------------
-- 7. scheduled_outages
-- Planned maintenance windows.
-- The fault detection engine skips analysis during active outages.
-- ---------------------------------------------------------------------------

CREATE TABLE scheduled_outages (
  id              BIGSERIAL     PRIMARY KEY,
  feeder_id       BIGINT        REFERENCES feeders(id),
  transformer_id  BIGINT        REFERENCES transformers(id),
  reason          VARCHAR(200)  NOT NULL,
  start_time      TIMESTAMPTZ   NOT NULL,
  end_time        TIMESTAMPTZ   NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_scheduled_outages_updated_at
  BEFORE UPDATE ON scheduled_outages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 8. detection_results
-- Records every algorithm analysis run.
-- Stores the AI's reasoning — enables explainable AI.
-- A detection result may or may not produce an incident.
-- ---------------------------------------------------------------------------

CREATE TABLE detection_results (
  id                  BIGSERIAL     PRIMARY KEY,
  feeder_id           BIGINT        NOT NULL REFERENCES feeders(id),
  fault_type_id       BIGINT        REFERENCES fault_types(id),
  algorithm_version   VARCHAR(20)   NOT NULL,
  confidence          NUMERIC(5,4)  NOT NULL,
  decision            VARCHAR(30)   NOT NULL,
  reason              TEXT          NOT NULL,
  analyzed_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- No updated_at trigger: detection results are immutable once recorded.

-- ---------------------------------------------------------------------------
-- 9. incidents
-- Confirmed fault events requiring operational response.
-- Created only when a detection result yields decision = 'fault_detected'.
-- References the detection_result that caused it (1:1).
-- ---------------------------------------------------------------------------

CREATE TABLE incidents (
  id                    BIGSERIAL     PRIMARY KEY,
  detection_result_id   BIGINT        NOT NULL UNIQUE REFERENCES detection_results(id),
  feeder_id             BIGINT        NOT NULL REFERENCES feeders(id),
  transformer_id        BIGINT        REFERENCES transformers(id),
  probable_pole_id      BIGINT        REFERENCES poles(id),
  fault_type_id         BIGINT        NOT NULL REFERENCES fault_types(id),
  title                 VARCHAR(200)  NOT NULL,
  description           TEXT,
  status                VARCHAR(20)   NOT NULL DEFAULT 'active',
  confidence            NUMERIC(5,4)  NOT NULL,
  latitude              NUMERIC(10,7),
  longitude             NUMERIC(10,7),
  pincode               VARCHAR(10),
  detected_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 10. tickets
-- Operational workflow for incident response.
-- One ticket per incident (1:1).
-- ---------------------------------------------------------------------------

CREATE TABLE tickets (
  id            BIGSERIAL     PRIMARY KEY,
  incident_id   BIGINT        NOT NULL UNIQUE REFERENCES incidents(id),
  status        VARCHAR(30)   NOT NULL DEFAULT 'open',
  priority      VARCHAR(10)   NOT NULL DEFAULT 'medium',
  assigned_to   VARCHAR(100),
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
