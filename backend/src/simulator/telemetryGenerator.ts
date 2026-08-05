/**
 * Telemetry Generator
 *
 * Builds realistic telemetry payloads for simulation.
 * Does NOT send or process them — that's the scenario runner's job.
 */

import type { TelemetryPayload } from "../services/telemetry.service";
import type { NetworkDevice } from "./types";

let seqCounter = 10_000;

export function buildPayload(
  device: NetworkDevice,
  event: "power_lost" | "power_restored" | "heartbeat",
  timestamp: Date,
  overrides?: Partial<
    Pick<TelemetryPayload, "battery_mv" | "rssi" | "fw" | "seq">
  >,
): TelemetryPayload {
  return {
    device_id: device.serialNumber,
    pole_id: device.poleCode,
    event,
    energized: event !== "power_lost",
    ts: timestamp.toISOString(),
    seq: overrides?.seq ?? seqCounter++,
    battery_mv: overrides?.battery_mv ?? 3600,
    rssi: overrides?.rssi ?? -75,
    fw: overrides?.fw ?? device.firmwareVersion ?? "2.1.0",
  };
}

export function offsetTime(base: Date, offsetSeconds: number): Date {
  return new Date(base.getTime() + offsetSeconds * 1000);
}
