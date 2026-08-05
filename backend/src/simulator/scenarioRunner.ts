/**
 * Scenario Runner
 *
 * Orchestrates fault simulation scenarios. Each scenario:
 *   1. Queries the network topology from the database
 *   2. Generates telemetry payloads via telemetryGenerator
 *   3. Feeds each payload through the existing processTelemetry pipeline
 *   4. Collects and returns results
 *
 * Does NOT duplicate pipeline logic — it reuses telemetry.service.
 */

import {
  processTelemetry,
  AppError,
} from "../services/telemetry.service";
import type { TelemetryPayload } from "../services/telemetry.service";
import * as repo from "../database/repositories";
import { buildPayload, offsetTime } from "./telemetryGenerator";
import type {
  NetworkDevice,
  SimulationEvent,
  SimulationResult,
} from "./types";
import { ScenarioType } from "./types";

// ── Public API ──────────────────────────────────────────────────────────────

export interface ScenarioOptions {
  transformerCode?: string;
  feederCode?: string;
  deviceSerial?: string;
}

export async function runScenario(
  type: ScenarioType,
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  const topology = await repo.getNetworkTopology();
  if (topology.length === 0) {
    throw new AppError(
      422,
      "No devices found in the network. Run seed data first.",
    );
  }

  switch (type) {
    case ScenarioType.Span:
      return runSpanFault(topology, options);
    case ScenarioType.Transformer:
      return runTransformerFault(topology, options);
    case ScenarioType.Feeder:
      return runFeederFault(topology, options);
    case ScenarioType.Device:
      return runDeviceFailure(topology, options);
    case ScenarioType.Outage:
      return runScheduledOutage(topology, options);
    case ScenarioType.Restore:
      return runRestoration(topology, options);
  }
}

// ── Span Fault ──────────────────────────────────────────────────────────────
// Pattern: live live live DARK DARK DARK
// Break at midpoint — everything downstream goes dark.

async function runSpanFault(
  topology: NetworkDevice[],
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  const devices = selectTransformerDevices(topology, options?.transformerCode);
  const baseTime = new Date();

  const breakIdx = Math.max(1, Math.floor(devices.length / 2));
  const affected = devices.slice(breakIdx);

  const payloads: TelemetryPayload[] = [];

  // Pre-fault heartbeat (demonstrates mixed traffic)
  payloads.push(
    buildPayload(devices[0], "heartbeat", offsetTime(baseTime, -30)),
  );

  // Fault events — spaced 2 seconds apart
  affected.forEach((dev, i) => {
    payloads.push(
      buildPayload(dev, "power_lost", offsetTime(baseTime, -20 + i * 2)),
    );
  });

  // Duplicate attempt (same device + timestamp — expects 409)
  payloads.push(
    buildPayload(affected[0], "power_lost", offsetTime(baseTime, -20)),
  );

  const events = await processAll(payloads);

  return buildResult(
    ScenarioType.Span,
    `Span fault on ${devices[0].transformerCode}: ` +
      `poles ${affected.map((d) => d.poleCode).join(", ")} went dark`,
    events,
  );
}

// ── Transformer Fault ───────────────────────────────────────────────────────
// Pattern: ALL poles under a transformer go dark.

async function runTransformerFault(
  topology: NetworkDevice[],
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  const devices = selectTransformerDevices(topology, options?.transformerCode);
  const baseTime = new Date();

  const payloads: TelemetryPayload[] = [];

  devices.forEach((dev, i) => {
    // First device: old firmware + low battery (realism)
    const overrides =
      i === 0 ? { fw: "1.2.0", battery_mv: 2600 } : undefined;
    payloads.push(
      buildPayload(
        dev,
        "power_lost",
        offsetTime(baseTime, -20 + i * 2),
        overrides,
      ),
    );
  });

  const events = await processAll(payloads);

  return buildResult(
    ScenarioType.Transformer,
    `Transformer fault: all ${devices.length} poles on ` +
      `${devices[0].transformerCode} went dark`,
    events,
  );
}

// ── Feeder Fault ────────────────────────────────────────────────────────────
// Pattern: ALL transformers on a feeder go dark.

async function runFeederFault(
  topology: NetworkDevice[],
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  const feederCode = options?.feederCode ?? topology[0].feederCode;
  const devices = topology.filter((d) => d.feederCode === feederCode);
  if (devices.length === 0) {
    throw new AppError(404, `No devices found for feeder '${feederCode}'.`);
  }

  const baseTime = new Date();
  const payloads: TelemetryPayload[] = [];

  devices.forEach((dev, i) => {
    payloads.push(
      buildPayload(dev, "power_lost", offsetTime(baseTime, -20 + i)),
    );
  });

  const events = await processAll(payloads);

  return buildResult(
    ScenarioType.Feeder,
    `Feeder fault: all ${devices.length} devices on ${feederCode} went dark`,
    events,
  );
}

// ── Device Failure ──────────────────────────────────────────────────────────
// Pattern: ONE pole dark, all neighbors energized.
// Uses low battery + weak signal + old firmware to simulate degraded device.

async function runDeviceFailure(
  topology: NetworkDevice[],
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  let device: NetworkDevice;

  if (options?.deviceSerial) {
    const found = topology.find(
      (d) => d.serialNumber === options.deviceSerial,
    );
    if (!found) {
      throw new AppError(404, `Device '${options.deviceSerial}' not found.`);
    }
    device = found;
  } else {
    const devices = selectTransformerDevices(
      topology,
      options?.transformerCode,
    );
    // Pick middle device (has both parent and children — cleanest demo)
    device = devices[Math.floor(devices.length / 2)];
  }

  const baseTime = new Date();
  const degraded = { battery_mv: 2600, rssi: -95, fw: "1.2.0" };

  const payloads: TelemetryPayload[] = [
    // Dying heartbeat (low battery, weak signal)
    buildPayload(device, "heartbeat", offsetTime(baseTime, -30), degraded),
    // Then goes dark
    buildPayload(device, "power_lost", offsetTime(baseTime, -10), degraded),
  ];

  const events = await processAll(payloads);

  return buildResult(
    ScenarioType.Device,
    `Device failure: ${device.serialNumber} on pole ${device.poleCode} ` +
      `(low battery, weak signal, old firmware)`,
    events,
  );
}

// ── Scheduled Outage ────────────────────────────────────────────────────────
// Creates a maintenance window, then sends telemetry inside it.
// The pipeline should suppress these — no incidents expected.

async function runScheduledOutage(
  topology: NetworkDevice[],
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  const devices = selectTransformerDevices(topology, options?.transformerCode);
  const baseTime = new Date();

  // Insert a scheduled outage covering the current time window
  await repo.insertScheduledOutage({
    feederId: null,
    transformerId: devices[0].transformerId,
    reason: "Simulated planned maintenance",
    startTime: offsetTime(baseTime, -3600),
    endTime: offsetTime(baseTime, 3600),
  });

  const payloads: TelemetryPayload[] = [];

  // Send power_lost for a few devices during the outage
  devices.slice(0, 3).forEach((dev, i) => {
    payloads.push(
      buildPayload(dev, "power_lost", offsetTime(baseTime, -10 + i * 2)),
    );
  });

  const events = await processAll(payloads);

  return buildResult(
    ScenarioType.Outage,
    `Scheduled outage on ${devices[0].transformerCode}: ` +
      `${Math.min(3, devices.length)} events during maintenance window ` +
      `(no incidents expected)`,
    events,
  );
}

// ── Restoration ─────────────────────────────────────────────────────────────
// Sends power_restored for all devices. Resolves active incidents and
// marks tickets as pending_verification.

async function runRestoration(
  topology: NetworkDevice[],
  options?: ScenarioOptions,
): Promise<SimulationResult> {
  const devices = selectTransformerDevices(topology, options?.transformerCode);
  const baseTime = new Date();

  // Resolve any active incidents for this transformer
  const activeIncidents = await repo.findActiveIncidentsByTransformer(
    devices[0].transformerId,
  );
  for (const incident of activeIncidents) {
    await repo.resolveIncident(incident.id);
    if (incident.ticketId) {
      await repo.closeTicket(incident.id);
    }
  }

  const payloads: TelemetryPayload[] = [];

  devices.forEach((dev, i) => {
    payloads.push(
      buildPayload(dev, "power_restored", offsetTime(baseTime, -10 + i * 2)),
    );
  });

  const events = await processAll(payloads);

  const resolved = activeIncidents.length;
  return buildResult(
    ScenarioType.Restore,
    resolved > 0
      ? `Restoration on ${devices[0].transformerCode}: ` +
        `${devices.length} devices restored. ` +
        `${resolved} incident(s) resolved, ticket(s) pending verification.`
      : `Restoration on ${devices[0].transformerCode}: ` +
        `${devices.length} devices restored. No active incidents to resolve.`,
    events,
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function selectTransformerDevices(
  topology: NetworkDevice[],
  transformerCode?: string,
): NetworkDevice[] {
  const code = transformerCode ?? topology[0].transformerCode;
  const devices = topology
    .filter((d) => d.transformerCode === code)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  if (devices.length === 0) {
    throw new AppError(404, `No devices found for transformer '${code}'.`);
  }
  return devices;
}

async function processAll(
  payloads: TelemetryPayload[],
): Promise<SimulationEvent[]> {
  const events: SimulationEvent[] = [];
  for (const payload of payloads) {
    events.push(await processOne(payload));
  }
  return events;
}

async function processOne(
  payload: TelemetryPayload,
): Promise<SimulationEvent> {
  try {
    const result = await processTelemetry(payload);
    return { payload, result, error: null };
  } catch (err) {
    if (err instanceof AppError) {
      return {
        payload,
        result: null,
        error: `${err.statusCode}: ${err.message}`,
      };
    }
    return {
      payload,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildResult(
  scenario: ScenarioType,
  description: string,
  events: SimulationEvent[],
): SimulationResult {
  const successful = events.filter((e) => e.result !== null);
  const failed = events.filter((e) => e.error !== null);

  // Summary uses the last fault_detected event, or the last successful event
  const faultEvents = successful.filter(
    (e) => e.result!.detection.decision === "fault_detected",
  );
  const summaryEvent =
    faultEvents.length > 0
      ? faultEvents[faultEvents.length - 1]
      : successful.length > 0
        ? successful[successful.length - 1]
        : null;

  return {
    scenario,
    description,
    eventsGenerated: events.length,
    eventsProcessed: successful.length,
    eventsFailed: failed.length,
    events,
    summary: {
      decision: summaryEvent?.result?.detection.decision ?? null,
      confidence: summaryEvent?.result?.detection.confidence ?? null,
      faultType: summaryEvent?.result?.detection.faultType ?? null,
      reason: summaryEvent?.result?.detection.reason ?? null,
      incidentIds: successful
        .filter((e) => e.result!.incidentId !== null)
        .map((e) => e.result!.incidentId!),
      ticketIds: successful
        .filter((e) => e.result!.ticketId !== null)
        .map((e) => e.result!.ticketId!),
    },
  };
}
