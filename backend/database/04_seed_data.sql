-- ===========================================================================
-- Propel AI Fault Detection System
-- 04: Seed Data
--
-- Creates a realistic 18-pole network in Whitefield, Bangalore (Karnataka)
-- with 4 fault scenarios demonstrating the detection pipeline.
--
-- Scenarios:
--   1. Span fault on DT-001 (3 poles dark, high confidence)
--   2. Transformer fault on DT-002 (5 poles dark, high confidence)
--   3. Device failure on DT-003 (1 pole dark, low confidence)
--   4. Momentary fluctuation on DT-003 (no incident created)
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Feeders
-- ---------------------------------------------------------------------------

INSERT INTO feeders (id, code, name, status) VALUES
  (1, 'FDR-001', 'Whitefield Main Feeder', 'active');

-- ---------------------------------------------------------------------------
-- 2. Fault Types
-- ---------------------------------------------------------------------------

INSERT INTO fault_types (id, name, severity, description) VALUES
  (1, 'span',           'critical', 'Wire fault between two poles. Affects all downstream poles.'),
  (2, 'transformer',    'critical', 'Distribution transformer failure. Affects all poles under the transformer.'),
  (3, 'feeder',         'critical', 'Feeder-level fault. Affects all downstream transformers and poles.'),
  (4, 'device_failure', 'low',      'IoT device malfunction. Single pole reports dark while neighbors remain energized.');

-- ---------------------------------------------------------------------------
-- 3. Transformers
-- Whitefield area coordinates (~12.97°N, 77.75°E)
-- ---------------------------------------------------------------------------

INSERT INTO transformers (id, feeder_id, code, name, latitude, longitude, capacity_kva, status) VALUES
  (1, 1, 'DT-001', 'Whitefield DT-1', 12.9716000, 77.7499000, 100, 'active'),
  (2, 1, 'DT-002', 'Whitefield DT-2', 12.9690000, 77.7520000, 200, 'active'),
  (3, 1, 'DT-003', 'Whitefield DT-3', 12.9680000, 77.7475000, 100, 'active');

-- ---------------------------------------------------------------------------
-- 4. Poles
-- Each transformer feeds a chain of poles.
-- parent_pole_id encodes the tree: NULL = root pole (first from transformer).
--
-- DT-001: P-001 → P-002 → P-003 → P-004 → P-005 → P-006
-- DT-002: P-007 → P-008 → P-009 → P-010 → P-011
-- DT-003: P-012 → P-013 → P-014 → P-015 → P-016 → P-017 → P-018
-- ---------------------------------------------------------------------------

-- DT-001 poles (6 poles)
INSERT INTO poles (id, transformer_id, parent_pole_id, code, latitude, longitude, sequence_number, status) VALUES
  (1,  1, NULL, 'P-001', 12.9719000, 77.7502000, 1, 'active'),
  (2,  1, 1,    'P-002', 12.9722000, 77.7505000, 2, 'active'),
  (3,  1, 2,    'P-003', 12.9725000, 77.7508000, 3, 'active'),
  (4,  1, 3,    'P-004', 12.9728000, 77.7511000, 4, 'active'),
  (5,  1, 4,    'P-005', 12.9731000, 77.7514000, 5, 'active'),
  (6,  1, 5,    'P-006', 12.9734000, 77.7517000, 6, 'active');

-- DT-002 poles (5 poles)
INSERT INTO poles (id, transformer_id, parent_pole_id, code, latitude, longitude, sequence_number, status) VALUES
  (7,  2, NULL, 'P-007', 12.9693000, 77.7523000, 1, 'active'),
  (8,  2, 7,    'P-008', 12.9696000, 77.7526000, 2, 'active'),
  (9,  2, 8,    'P-009', 12.9699000, 77.7529000, 3, 'active'),
  (10, 2, 9,    'P-010', 12.9702000, 77.7532000, 4, 'active'),
  (11, 2, 10,   'P-011', 12.9705000, 77.7535000, 5, 'active');

-- DT-003 poles (7 poles)
INSERT INTO poles (id, transformer_id, parent_pole_id, code, latitude, longitude, sequence_number, status) VALUES
  (12, 3, NULL, 'P-012', 12.9683000, 77.7478000, 1, 'active'),
  (13, 3, 12,   'P-013', 12.9686000, 77.7481000, 2, 'active'),
  (14, 3, 13,   'P-014', 12.9689000, 77.7484000, 3, 'active'),
  (15, 3, 14,   'P-015', 12.9692000, 77.7487000, 4, 'active'),
  (16, 3, 15,   'P-016', 12.9695000, 77.7490000, 5, 'active'),
  (17, 3, 16,   'P-017', 12.9698000, 77.7493000, 6, 'active'),
  (18, 3, 17,   'P-018', 12.9701000, 77.7496000, 7, 'active');

-- ---------------------------------------------------------------------------
-- 5. Devices
-- One power_monitor per pole. All installed 2024-01-01.
-- ---------------------------------------------------------------------------

INSERT INTO devices (id, pole_id, serial_number, device_type, firmware_version, status, installed_at) VALUES
  (1,  1,  'SN-WF-001', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (2,  2,  'SN-WF-002', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (3,  3,  'SN-WF-003', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (4,  4,  'SN-WF-004', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (5,  5,  'SN-WF-005', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (6,  6,  'SN-WF-006', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (7,  7,  'SN-WF-007', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (8,  8,  'SN-WF-008', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (9,  9,  'SN-WF-009', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (10, 10, 'SN-WF-010', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (11, 11, 'SN-WF-011', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (12, 12, 'SN-WF-012', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (13, 13, 'SN-WF-013', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (14, 14, 'SN-WF-014', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (15, 15, 'SN-WF-015', 'power_monitor', '1.8.3', 'active', '2024-01-01 00:00:00+05:30'),
  (16, 16, 'SN-WF-016', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (17, 17, 'SN-WF-017', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30'),
  (18, 18, 'SN-WF-018', 'power_monitor', '2.1.0', 'active', '2024-01-01 00:00:00+05:30');

-- Note: Device 15 has older firmware (1.8.3) — foreshadows the device failure scenario.

-- ---------------------------------------------------------------------------
-- 6. Scheduled Outages
-- Planned maintenance on DT-003 (future — does not overlap fault scenarios).
-- ---------------------------------------------------------------------------

INSERT INTO scheduled_outages (id, feeder_id, transformer_id, reason, start_time, end_time) VALUES
  (1, NULL, 3, 'Planned transformer maintenance — annual inspection',
   '2024-01-20 06:00:00+05:30', '2024-01-20 14:00:00+05:30');

-- ---------------------------------------------------------------------------
-- 7. Telemetry Events
-- Morning baseline + 4 fault scenarios.
-- All events are on 2024-01-15 (Monday).
-- ---------------------------------------------------------------------------

-- Morning heartbeats (09:00) — establishes baseline
INSERT INTO telemetry_events (device_id, event_type, voltage, signal_strength, battery_level, recorded_at) VALUES
  (1,  'heartbeat', 231.20, -45.30, 97.50, '2024-01-15 09:00:00+05:30'),
  (4,  'heartbeat', 229.80, -52.30, 92.50, '2024-01-15 09:00:01+05:30'),
  (7,  'heartbeat', 230.50, -61.20, 90.00, '2024-01-15 09:00:02+05:30'),
  (12, 'heartbeat', 230.10, -47.20, 96.00, '2024-01-15 09:00:03+05:30'),
  (15, 'heartbeat', 228.90, -71.80, 24.10, '2024-01-15 09:00:04+05:30');
-- Note: Device 15 shows weak signal (-71.8 dBm) and low battery (24.1%).

-- SCENARIO 1: Span fault on DT-001 (10:15)
-- Wire breaks between P-003 and P-004. Three downstream poles lose power.
INSERT INTO telemetry_events (device_id, event_type, voltage, signal_strength, battery_level, recorded_at) VALUES
  (4, 'power_lost', 0.00, -52.30, 92.00, '2024-01-15 10:15:00+05:30'),
  (5, 'power_lost', 0.00, -48.10, 95.00, '2024-01-15 10:15:01+05:30'),
  (6, 'power_lost', 0.00, -55.70, 88.30, '2024-01-15 10:15:02+05:30');

-- SCENARIO 2: Transformer fault on DT-002 (10:30)
-- DT-002 fails. All 5 poles lose power near-simultaneously.
INSERT INTO telemetry_events (device_id, event_type, voltage, signal_strength, battery_level, recorded_at) VALUES
  (7,  'power_lost', 0.00, -61.20, 89.50, '2024-01-15 10:30:00+05:30'),
  (8,  'power_lost', 0.00, -58.40, 87.50, '2024-01-15 10:30:00.500+05:30'),
  (9,  'power_lost', 0.00, -63.10, 91.20, '2024-01-15 10:30:01+05:30'),
  (10, 'power_lost', 0.00, -59.80, 89.00, '2024-01-15 10:30:00.800+05:30'),
  (11, 'power_lost', 0.00, -62.50, 86.70, '2024-01-15 10:30:01.200+05:30');

-- SCENARIO 3: Device failure on DT-003 (10:45)
-- Only P-015 goes dark. All neighbors remain energized.
-- Low battery and weak signal suggest device malfunction.
INSERT INTO telemetry_events (device_id, event_type, voltage, signal_strength, battery_level, recorded_at) VALUES
  (15, 'power_lost', 0.00, -71.80, 23.50, '2024-01-15 10:45:00+05:30');

-- SCENARIO 4: Momentary fluctuation on DT-003 (11:00)
-- P-012 loses power briefly, then restores within 20 seconds.
-- Algorithm classifies as no_fault — below the 30-second threshold.
INSERT INTO telemetry_events (device_id, event_type, voltage, signal_strength, battery_level, recorded_at) VALUES
  (12, 'power_lost',     0.00,   -47.20, 95.80, '2024-01-15 11:00:00+05:30'),
  (12, 'power_restored', 228.50, -47.20, 95.80, '2024-01-15 11:00:20+05:30');

-- ---------------------------------------------------------------------------
-- 8. Detection Results
-- One result per algorithm run. Records the AI's reasoning.
-- Scenario 4 produces a detection result with no linked incident.
-- ---------------------------------------------------------------------------

INSERT INTO detection_results (id, feeder_id, fault_type_id, algorithm_version, confidence, decision, reason, analyzed_at) VALUES
  (1, 1, 1, 'v1-rule-engine', 0.9200, 'fault_detected',
   'Live-to-dark boundary detected between P-003 (energized) and P-004 (de-energized). Three consecutive downstream poles dark. Topology fully mapped. High confidence span fault.',
   '2024-01-15 10:15:05+05:30'),

  (2, 1, 2, 'v1-rule-engine', 0.8800, 'fault_detected',
   'All 5 poles under transformer DT-002 lost power simultaneously within 1.2 seconds. Pattern consistent with transformer failure. No upstream feeder issue detected — other transformers on FDR-001 remain energized.',
   '2024-01-15 10:30:05+05:30'),

  (3, 1, 4, 'v1-rule-engine', 0.3500, 'fault_detected',
   'Single isolated dark pole P-015 detected. All adjacent poles (P-014, P-016) remain energized. Device reports low battery (23.5%) and weak signal strength (-71.8 dBm). Firmware version 1.8.3 is outdated. Probable device malfunction rather than line fault.',
   '2024-01-15 10:45:05+05:30'),

  (4, 1, NULL, 'v1-rule-engine', 0.1000, 'no_fault',
   'Pole P-012 reported power loss at 11:00:00 and power restoration at 11:00:20. Duration of 20 seconds is below the 30-second fault threshold. Classified as momentary fluctuation. No incident warranted.',
   '2024-01-15 11:00:25+05:30');

-- ---------------------------------------------------------------------------
-- 9. Incidents
-- Created only for detection results with decision = 'fault_detected'.
-- Scenario 4 has NO incident (no_fault).
-- ---------------------------------------------------------------------------

INSERT INTO incidents (id, detection_result_id, feeder_id, transformer_id, probable_pole_id, fault_type_id, title, description, status, confidence, latitude, longitude, pincode, detected_at) VALUES
  (1, 1, 1, 1, 4, 1,
   'Span fault detected on Whitefield DT-1 line',
   'Power loss detected on 3 consecutive poles (P-004 to P-006). Live-to-dark boundary between P-003 and P-004 indicates probable span fault on the connecting wire.',
   'active', 0.9200, 12.9728000, 77.7511000, '560066',
   '2024-01-15 10:15:05+05:30'),

  (2, 2, 1, 2, NULL, 2,
   'Transformer fault detected on Whitefield DT-2',
   'All 5 poles under DT-002 lost power simultaneously. Probable transformer failure requiring on-site inspection.',
   'active', 0.8800, 12.9690000, 77.7520000, '560066',
   '2024-01-15 10:30:05+05:30'),

  (3, 3, 1, 3, 15, 4,
   'Probable device failure at P-015',
   'Single isolated dark pole with low battery (23.5%) and weak signal (-71.8 dBm). Likely device malfunction — verify on next routine inspection.',
   'active', 0.3500, 12.9692000, 77.7487000, '560066',
   '2024-01-15 10:45:05+05:30');

-- ---------------------------------------------------------------------------
-- 10. Tickets
-- One ticket per incident. Priority derived from fault severity.
-- ---------------------------------------------------------------------------

INSERT INTO tickets (id, incident_id, status, priority, assigned_to, notes) VALUES
  (1, 1, 'open', 'critical', NULL,
   'Span fault affecting 3 poles. Dispatch crew to P-003/P-004 boundary. Inspect wire between poles.'),

  (2, 2, 'open', 'critical', NULL,
   'Transformer DT-002 failure. 5 poles affected. Escalate to transformer maintenance team.'),

  (3, 3, 'open', 'low', NULL,
   'Probable device failure at P-015. Low priority — verify device battery and signal on next routine inspection.');

-- ---------------------------------------------------------------------------
-- Reset sequences to account for explicit IDs
-- ---------------------------------------------------------------------------

SELECT setval('feeders_id_seq',           (SELECT MAX(id) FROM feeders));
SELECT setval('fault_types_id_seq',       (SELECT MAX(id) FROM fault_types));
SELECT setval('transformers_id_seq',      (SELECT MAX(id) FROM transformers));
SELECT setval('poles_id_seq',             (SELECT MAX(id) FROM poles));
SELECT setval('devices_id_seq',           (SELECT MAX(id) FROM devices));
SELECT setval('scheduled_outages_id_seq', (SELECT MAX(id) FROM scheduled_outages));
SELECT setval('telemetry_events_id_seq',  (SELECT MAX(id) FROM telemetry_events));
SELECT setval('detection_results_id_seq', (SELECT MAX(id) FROM detection_results));
SELECT setval('incidents_id_seq',         (SELECT MAX(id) FROM incidents));
SELECT setval('tickets_id_seq',           (SELECT MAX(id) FROM tickets));

COMMIT;
