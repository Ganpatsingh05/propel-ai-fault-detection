import type {
  TelemetryPayload,
  PipelineResult,
} from "../services/telemetry.service";

// ── Scenario types ──────────────────────────────────────────────────────────

export enum ScenarioType {
  Span = "span",
  Transformer = "transformer",
  Feeder = "feeder",
  Device = "device",
  Outage = "outage",
  Restore = "restore",
}

// ── Network topology (returned by repository) ───────────────────────────────

export interface NetworkDevice {
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
}

// ── Simulation results ──────────────────────────────────────────────────────

export interface SimulationEvent {
  payload: TelemetryPayload;
  result: PipelineResult | null;
  error: string | null;
}

export interface SimulationResult {
  scenario: ScenarioType;
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
