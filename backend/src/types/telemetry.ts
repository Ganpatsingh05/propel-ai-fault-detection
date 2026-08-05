/**
 * Telemetry domain types.
 * Represents algorithm inputs — not database rows.
 */

export enum EventType {
  PowerLost = "power_lost",
  PowerRestored = "power_restored",
  Heartbeat = "heartbeat",
}

export interface TelemetryEvent {
  deviceId: number;
  transformerId: number;
  feederId: number;
  eventType: EventType;
  recordedAt: Date;
}
