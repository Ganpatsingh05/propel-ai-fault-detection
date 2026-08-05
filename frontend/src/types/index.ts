// ── API Response wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  incidents: { total: number; active: number; critical: number };
  tickets: { open: number; pending_verification: number };
  telemetryToday: number;
  devices: { total: number; online: number; offline: number };
}

// ── Incidents ───────────────────────────────────────────────────────────────

export interface IncidentLocation {
  feederCode: string;
  feederName: string;
  transformerCode: string | null;
  transformerName: string | null;
  probablePoleCode: string | null;
  latitude: number | null;
  longitude: number | null;
  pincode: string | null;
}

export interface TicketSummary {
  id: number;
  status: string;
  priority: string;
  assignedTo: string | null;
}

export interface Incident {
  id: number;
  title: string;
  status: string;
  confidence: number;
  faultType: string;
  severity: string;
  location: IncidentLocation;
  ticket: TicketSummary | null;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface DetectionInfo {
  id: number;
  decision: string;
  confidence: number;
  algorithmVersion: string;
  reason: string;
  analyzedAt: string;
}

export interface TicketDetail {
  id: number;
  status: string;
  priority: string;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AffectedPole {
  poleCode: string;
  latitude: number;
  longitude: number;
  sequenceNumber: number;
  status: "dark" | "energized";
}

export interface TelemetryEntry {
  deviceSerial: string;
  poleCode: string;
  eventType: string;
  voltage: number | null;
  signalStrength: number | null;
  batteryLevel: number | null;
  recordedAt: string;
  receivedAt: string;
}

export interface IncidentDetail extends Incident {
  description: string | null;
  detection: DetectionInfo;
  ticket: TicketDetail | null;
  transformerId: number | null;
  affectedPoles: AffectedPole[];
  recentTelemetry: TelemetryEntry[];
}

// ── Tickets ─────────────────────────────────────────────────────────────────

export interface TicketIncident {
  id: number;
  title: string;
  status: string;
  confidence: number;
  faultType: string;
  severity: string;
}

export interface Ticket {
  id: number;
  status: string;
  priority: string;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  incident: TicketIncident;
}

// ── Simulator ───────────────────────────────────────────────────────────────

export interface SimulationEvent {
  payload: Record<string, unknown>;
  result: {
    telemetryId: number;
    detection: { decision: string; confidence: number; faultType: string | null; reason: string };
    incidentId: number | null;
    ticketId: number | null;
  } | null;
  error: string | null;
}

export interface SimulationResult {
  scenario: string;
  description: string;
  eventsGenerated: number;
  eventsProcessed: number;
  eventsFailed: number;
  events: SimulationEvent[];
  summary: {
    decision: string | null;
    confidence: number | null;
    faultType: string | null;
    reason: string | null;
    incidentIds: number[];
    ticketIds: number[];
  };
}
