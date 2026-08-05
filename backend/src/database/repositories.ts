import pool from "./pool";

// === Device lookup ===

// Find device by serial_number. Returns { id, pole_id, serial_number, device_type, firmware_version, status } or null.
export async function findDeviceBySerial(serialNumber: string) {
  const { rows } = await pool.query(
    `SELECT d.id, d.pole_id, d.serial_number, d.device_type, d.firmware_version, d.status,
            p.transformer_id,
            t.feeder_id
     FROM devices d
     JOIN poles p ON p.id = d.pole_id
     JOIN transformers t ON t.id = p.transformer_id
     WHERE d.serial_number = $1`,
    [serialNumber]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    poleId: Number(r.pole_id),
    serialNumber: r.serial_number as string,
    deviceType: r.device_type as string,
    firmwareVersion: r.firmware_version as string | null,
    status: r.status as string,
    transformerId: Number(r.transformer_id),
    feederId: Number(r.feeder_id),
  };
}

// === Telemetry ===

// Save a telemetry event. Returns the inserted row id.
export async function saveTelemetryEvent(event: {
  deviceId: number;
  eventType: string;
  voltage: number | null;
  current: number | null;
  signalStrength: number | null;
  batteryLevel: number | null;
  recordedAt: Date;
}): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO telemetry_events (device_id, event_type, voltage, current, signal_strength, battery_level, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [event.deviceId, event.eventType, event.voltage, event.current, event.signalStrength, event.batteryLevel, event.recordedAt]
  );
  return Number(rows[0].id);
}

// Check duplicate: returns true if a telemetry event with same device_id and recorded_at already exists.
export async function isDuplicateTelemetry(deviceId: number, recordedAt: Date): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM telemetry_events WHERE device_id = $1 AND recorded_at = $2 LIMIT 1`,
    [deviceId, recordedAt]
  );
  return rows.length > 0;
}

// === Topology ===

// Get all pole statuses for a transformer. Used by the detection engine.
// Returns: { poleId, parentPoleId, isDark }
// isDark is determined by looking at the latest telemetry event for each pole's device.
export async function getPoleStatusesByTransformer(transformerId: number): Promise<Array<{ poleId: number; parentPoleId: number | null; isDark: boolean }>> {
  const { rows } = await pool.query(
    `SELECT
       p.id AS pole_id,
       p.parent_pole_id,
       COALESCE(
         (
           SELECT te.event_type
           FROM telemetry_events te
           JOIN devices d ON d.id = te.device_id
           WHERE d.pole_id = p.id
             AND te.event_type IN ('power_lost', 'power_restored')
           ORDER BY te.recorded_at DESC
           LIMIT 1
         ),
         'power_restored'
       ) AS latest_event
     FROM poles p
     WHERE p.transformer_id = $1
       AND p.status = 'active'
     ORDER BY p.sequence_number`,
    [transformerId]
  );
  return rows.map((r: Record<string, unknown>) => ({
    poleId: Number(r.pole_id),
    parentPoleId: r.parent_pole_id !== null ? Number(r.parent_pole_id) : null,
    isDark: r.latest_event === 'power_lost',
  }));
}

// === Scheduled Outages ===

// Find active outages that cover a given feeder/transformer at a specific time.
export async function findActiveOutages(feederId: number, transformerId: number, at: Date): Promise<Array<{ feederId: number | null; transformerId: number | null; startTime: Date; endTime: Date; reason: string }>> {
  const { rows } = await pool.query(
    `SELECT feeder_id, transformer_id, start_time, end_time, reason
     FROM scheduled_outages
     WHERE start_time <= $1 AND end_time >= $1
       AND (feeder_id = $2 OR transformer_id = $3)`,
    [at, feederId, transformerId]
  );
  return rows.map((r: Record<string, unknown>) => ({
    feederId: r.feeder_id !== null ? Number(r.feeder_id) : null,
    transformerId: r.transformer_id !== null ? Number(r.transformer_id) : null,
    startTime: new Date(r.start_time as string),
    endTime: new Date(r.end_time as string),
    reason: r.reason as string,
  }));
}

// === Fault Types ===

// Find fault type ID by name. Returns the id or null.
export async function findFaultTypeIdByName(name: string): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT id FROM fault_types WHERE name = $1`,
    [name]
  );
  if (rows.length === 0) return null;
  return Number(rows[0].id);
}

// === Detection Results ===

// Save a detection result. Returns the inserted row id.
export async function saveDetectionResult(result: {
  feederId: number;
  faultTypeId: number | null;
  algorithmVersion: string;
  confidence: number;
  decision: string;
  reason: string;
}): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO detection_results (feeder_id, fault_type_id, algorithm_version, confidence, decision, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [result.feederId, result.faultTypeId, result.algorithmVersion, result.confidence, result.decision, result.reason]
  );
  return Number(rows[0].id);
}

// === Incidents ===

// Create an incident. Returns the inserted row id.
export async function createIncident(incident: {
  detectionResultId: number;
  feederId: number;
  transformerId: number | null;
  probablePoleId: number | null;
  faultTypeId: number;
  title: string;
  description: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
}): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO incidents (detection_result_id, feeder_id, transformer_id, probable_pole_id, fault_type_id, title, description, confidence, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [incident.detectionResultId, incident.feederId, incident.transformerId, incident.probablePoleId, incident.faultTypeId, incident.title, incident.description, incident.confidence, incident.latitude, incident.longitude]
  );
  return Number(rows[0].id);
}

// === Tickets ===

// Create a ticket. Returns the inserted row id.
export async function createTicket(ticket: {
  incidentId: number;
  priority: string;
  notes: string;
}): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO tickets (incident_id, priority, notes)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [ticket.incidentId, ticket.priority, ticket.notes]
  );
  return Number(rows[0].id);
}

// === Pole coordinates lookup ===

// Get pole coordinates by pole ID. Used for incident lat/lng.
export async function getPoleCoordinates(poleId: number): Promise<{ latitude: number; longitude: number } | null> {
  const { rows } = await pool.query(
    `SELECT latitude, longitude FROM poles WHERE id = $1`,
    [poleId]
  );
  if (rows.length === 0) return null;
  return {
    latitude: Number(rows[0].latitude),
    longitude: Number(rows[0].longitude),
  };
}

// === Network Topology (used by simulator) ===

export async function getNetworkTopology(): Promise<
  Array<{
    serialNumber: string;
    poleId: number;
    poleCode: string;
    parentPoleId: number | null;
    sequenceNumber: number;
    transformerId: number;
    transformerCode: string;
    feederId: number;
    feederCode: string;
    firmwareVersion: string | null;
  }>
> {
  const { rows } = await pool.query(
    `SELECT d.serial_number, p.id AS pole_id, p.code AS pole_code,
            p.parent_pole_id, p.sequence_number,
            t.id AS transformer_id, t.code AS transformer_code,
            f.id AS feeder_id, f.code AS feeder_code,
            d.firmware_version
     FROM devices d
     JOIN poles p ON p.id = d.pole_id
     JOIN transformers t ON t.id = p.transformer_id
     JOIN feeders f ON f.id = t.feeder_id
     WHERE d.status = 'active' AND p.status = 'active'
     ORDER BY f.id, t.id, p.sequence_number`,
  );
  return rows.map((r: Record<string, unknown>) => ({
    serialNumber: r.serial_number as string,
    poleId: Number(r.pole_id),
    poleCode: r.pole_code as string,
    parentPoleId: r.parent_pole_id !== null ? Number(r.parent_pole_id) : null,
    sequenceNumber: Number(r.sequence_number),
    transformerId: Number(r.transformer_id),
    transformerCode: r.transformer_code as string,
    feederId: Number(r.feeder_id),
    feederCode: r.feeder_code as string,
    firmwareVersion: r.firmware_version as string | null,
  }));
}

// === Scheduled Outage insertion (used by simulator) ===

export async function insertScheduledOutage(outage: {
  feederId: number | null;
  transformerId: number | null;
  reason: string;
  startTime: Date;
  endTime: Date;
}): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO scheduled_outages (feeder_id, transformer_id, reason, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [outage.feederId, outage.transformerId, outage.reason, outage.startTime, outage.endTime],
  );
  return Number(rows[0].id);
}

// === Incident resolution (used by simulator restore) ===

export async function findActiveIncidentsByTransformer(
  transformerId: number,
): Promise<Array<{ id: number; ticketId: number | null }>> {
  const { rows } = await pool.query(
    `SELECT i.id, t.id AS ticket_id
     FROM incidents i
     LEFT JOIN tickets t ON t.incident_id = i.id
     WHERE i.transformer_id = $1 AND i.status = 'active'`,
    [transformerId],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    ticketId: r.ticket_id !== null ? Number(r.ticket_id) : null,
  }));
}

export async function resolveIncident(incidentId: number): Promise<void> {
  await pool.query(
    `UPDATE incidents SET status = 'resolved', resolved_at = NOW() WHERE id = $1`,
    [incidentId],
  );
}

export async function closeTicket(incidentId: number): Promise<void> {
  await pool.query(
    `UPDATE tickets SET status = 'pending_verification' WHERE incident_id = $1`,
    [incidentId],
  );
}

// =========================================================================
// Dashboard & API queries
// =========================================================================

// === Incident list ===

export async function getIncidentsList() {
  const { rows } = await pool.query(
    `SELECT
       i.id, i.title, i.status, i.confidence,
       i.latitude, i.longitude, i.pincode,
       i.detected_at, i.resolved_at, i.created_at,
       ft.name AS fault_type, ft.severity,
       f.code AS feeder_code, f.name AS feeder_name,
       t.code AS transformer_code, t.name AS transformer_name,
       p.code AS probable_pole_code,
       tk.id AS ticket_id, tk.status AS ticket_status,
       tk.priority, tk.assigned_to
     FROM incidents i
     JOIN fault_types ft ON ft.id = i.fault_type_id
     JOIN feeders f ON f.id = i.feeder_id
     LEFT JOIN transformers t ON t.id = i.transformer_id
     LEFT JOIN poles p ON p.id = i.probable_pole_id
     LEFT JOIN tickets tk ON tk.incident_id = i.id
     ORDER BY i.detected_at DESC`,
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    title: r.title as string,
    status: r.status as string,
    confidence: Number(r.confidence),
    faultType: r.fault_type as string,
    severity: r.severity as string,
    location: {
      feederCode: r.feeder_code as string,
      feederName: r.feeder_name as string,
      transformerCode: (r.transformer_code as string) ?? null,
      transformerName: (r.transformer_name as string) ?? null,
      probablePoleCode: (r.probable_pole_code as string) ?? null,
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
      pincode: (r.pincode as string) ?? null,
    },
    ticket: r.ticket_id
      ? {
          id: Number(r.ticket_id),
          status: r.ticket_status as string,
          priority: r.priority as string,
          assignedTo: (r.assigned_to as string) ?? null,
        }
      : null,
    detectedAt: r.detected_at as string,
    resolvedAt: (r.resolved_at as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

// === Incident detail ===

export async function getIncidentDetail(id: number) {
  const { rows } = await pool.query(
    `SELECT
       i.id, i.title, i.description, i.status, i.confidence,
       i.latitude, i.longitude, i.pincode,
       i.detected_at, i.resolved_at, i.created_at,
       i.transformer_id,
       ft.name AS fault_type, ft.severity,
       f.code AS feeder_code, f.name AS feeder_name,
       t.code AS transformer_code, t.name AS transformer_name,
       p.code AS probable_pole_code,
       dr.id AS detection_id, dr.decision,
       dr.confidence AS detection_confidence,
       dr.algorithm_version, dr.reason, dr.analyzed_at,
       tk.id AS ticket_id, tk.status AS ticket_status,
       tk.priority, tk.assigned_to, tk.notes AS ticket_notes,
       tk.created_at AS ticket_created_at,
       tk.updated_at AS ticket_updated_at
     FROM incidents i
     JOIN detection_results dr ON dr.id = i.detection_result_id
     JOIN fault_types ft ON ft.id = i.fault_type_id
     JOIN feeders f ON f.id = i.feeder_id
     LEFT JOIN transformers t ON t.id = i.transformer_id
     LEFT JOIN poles p ON p.id = i.probable_pole_id
     LEFT JOIN tickets tk ON tk.incident_id = i.id
     WHERE i.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    title: r.title as string,
    description: (r.description as string) ?? null,
    status: r.status as string,
    confidence: Number(r.confidence),
    faultType: r.fault_type as string,
    severity: r.severity as string,
    location: {
      feederCode: r.feeder_code as string,
      feederName: r.feeder_name as string,
      transformerCode: (r.transformer_code as string) ?? null,
      transformerName: (r.transformer_name as string) ?? null,
      probablePoleCode: (r.probable_pole_code as string) ?? null,
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
      pincode: (r.pincode as string) ?? null,
    },
    detection: {
      id: Number(r.detection_id),
      decision: r.decision as string,
      confidence: Number(r.detection_confidence),
      algorithmVersion: r.algorithm_version as string,
      reason: r.reason as string,
      analyzedAt: r.analyzed_at as string,
    },
    ticket: r.ticket_id
      ? {
          id: Number(r.ticket_id),
          status: r.ticket_status as string,
          priority: r.priority as string,
          assignedTo: (r.assigned_to as string) ?? null,
          notes: (r.ticket_notes as string) ?? null,
          createdAt: r.ticket_created_at as string,
          updatedAt: r.ticket_updated_at as string,
        }
      : null,
    transformerId: r.transformer_id !== null ? Number(r.transformer_id) : null,
    detectedAt: r.detected_at as string,
    resolvedAt: (r.resolved_at as string) ?? null,
    createdAt: r.created_at as string,
  };
}

// === Affected poles for an incident's transformer ===

export async function getAffectedPoles(transformerId: number) {
  const { rows } = await pool.query(
    `SELECT p.code, p.latitude, p.longitude, p.sequence_number,
       COALESCE(
         (SELECT te.event_type FROM telemetry_events te
          JOIN devices d ON d.id = te.device_id
          WHERE d.pole_id = p.id
            AND te.event_type IN ('power_lost', 'power_restored')
          ORDER BY te.recorded_at DESC LIMIT 1),
         'power_restored'
       ) AS latest_event
     FROM poles p
     WHERE p.transformer_id = $1 AND p.status = 'active'
     ORDER BY p.sequence_number`,
    [transformerId],
  );
  return rows.map((r: Record<string, unknown>) => ({
    poleCode: r.code as string,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    sequenceNumber: Number(r.sequence_number),
    status: r.latest_event === "power_lost" ? "dark" : "energized",
  }));
}

// === Recent telemetry for an incident's transformer ===

export async function getRecentTelemetry(
  transformerId: number,
  limit: number = 20,
) {
  const { rows } = await pool.query(
    `SELECT te.event_type, te.voltage, te.signal_strength,
            te.battery_level, te.recorded_at, te.received_at,
            d.serial_number, p.code AS pole_code
     FROM telemetry_events te
     JOIN devices d ON d.id = te.device_id
     JOIN poles p ON p.id = d.pole_id
     WHERE p.transformer_id = $1
     ORDER BY te.recorded_at DESC
     LIMIT $2`,
    [transformerId, limit],
  );
  return rows.map((r: Record<string, unknown>) => ({
    deviceSerial: r.serial_number as string,
    poleCode: r.pole_code as string,
    eventType: r.event_type as string,
    voltage: r.voltage !== null ? Number(r.voltage) : null,
    signalStrength: r.signal_strength !== null ? Number(r.signal_strength) : null,
    batteryLevel: r.battery_level !== null ? Number(r.battery_level) : null,
    recordedAt: r.recorded_at as string,
    receivedAt: r.received_at as string,
  }));
}

// === Tickets list with filters ===

export async function getTicketsList(
  statusFilter: string | null,
  priorityFilter: string | null,
) {
  const { rows } = await pool.query(
    `SELECT
       tk.id, tk.status, tk.priority, tk.assigned_to, tk.notes,
       tk.created_at, tk.updated_at,
       i.id AS incident_id, i.title, i.status AS incident_status,
       i.confidence,
       ft.name AS fault_type, ft.severity
     FROM tickets tk
     JOIN incidents i ON i.id = tk.incident_id
     JOIN fault_types ft ON ft.id = i.fault_type_id
     WHERE ($1::varchar IS NULL OR tk.status = $1)
       AND ($2::varchar IS NULL OR tk.priority = $2)
     ORDER BY
       CASE tk.priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END,
       tk.created_at DESC`,
    [statusFilter, priorityFilter],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    status: r.status as string,
    priority: r.priority as string,
    assignedTo: (r.assigned_to as string) ?? null,
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    incident: {
      id: Number(r.incident_id),
      title: r.title as string,
      status: r.incident_status as string,
      confidence: Number(r.confidence),
      faultType: r.fault_type as string,
      severity: r.severity as string,
    },
  }));
}

// === Single ticket for PATCH validation ===

export async function getTicketById(id: number) {
  const { rows } = await pool.query(
    `SELECT id, status, priority, assigned_to, notes,
            incident_id, created_at, updated_at
     FROM tickets WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    status: r.status as string,
    priority: r.priority as string,
    assignedTo: (r.assigned_to as string) ?? null,
    notes: (r.notes as string) ?? null,
    incidentId: Number(r.incident_id),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// === Update ticket fields ===

export async function updateTicketFields(
  id: number,
  updates: { status?: string; assignedTo?: string; notes?: string },
) {
  const { rows } = await pool.query(
    `UPDATE tickets SET
       status = COALESCE($2, status),
       assigned_to = COALESCE($3, assigned_to),
       notes = COALESCE($4, notes)
     WHERE id = $1
     RETURNING id, status, priority, assigned_to, notes,
               incident_id, created_at, updated_at`,
    [id, updates.status ?? null, updates.assignedTo ?? null, updates.notes ?? null],
  );
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    status: r.status as string,
    priority: r.priority as string,
    assignedTo: (r.assigned_to as string) ?? null,
    notes: (r.notes as string) ?? null,
    incidentId: Number(r.incident_id),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// === Update incident status (for ticket workflow) ===

export async function updateIncidentStatus(
  id: number,
  status: string,
): Promise<void> {
  await pool.query(
    `UPDATE incidents SET status = $2,
       resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END
     WHERE id = $1`,
    [id, status],
  );
}

// === Dashboard aggregate stats ===

export async function getDashboardStats() {
  const [incidentRes, ticketRes, telemetryRes, deviceRes] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE confidence >= 0.7)::int AS critical
       FROM incidents`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'pending_verification')::int AS pending_verification
       FROM tickets`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM telemetry_events
       WHERE received_at >= CURRENT_DATE`,
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE latest_event = 'power_lost')::int AS offline
       FROM (
         SELECT COALESCE(
           (SELECT te.event_type FROM telemetry_events te
            WHERE te.device_id = d.id
              AND te.event_type IN ('power_lost', 'power_restored')
            ORDER BY te.recorded_at DESC LIMIT 1),
           'power_restored'
         ) AS latest_event
         FROM devices d WHERE d.status = 'active'
       ) sub`,
    ),
  ]);

  const i = incidentRes.rows[0];
  const t = ticketRes.rows[0];
  const tel = telemetryRes.rows[0];
  const d = deviceRes.rows[0];

  return {
    incidents: {
      total: Number(i.total),
      active: Number(i.active),
      critical: Number(i.critical),
    },
    tickets: {
      open: Number(t.open),
      pending_verification: Number(t.pending_verification),
    },
    telemetryToday: Number(tel.count),
    devices: {
      total: Number(d.total),
      online: Number(d.total) - Number(d.offline),
      offline: Number(d.offline),
    },
  };
}
