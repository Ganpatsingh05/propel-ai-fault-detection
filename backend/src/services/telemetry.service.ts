import { runDetection } from "../algorithms/detectionEngine";
import { Decision } from "../types/detection-result";
import type { EventType } from "../types/telemetry";
import type { TelemetryEvent } from "../types/telemetry";
import type { ScheduledOutage } from "../types/scheduled-outage";
import type { DetectionResult } from "../types/detection-result";
import * as repo from "../database/repositories";

const ALGORITHM_VERSION = "v1-rule-engine";

// ── Payload types ───────────────────────────────────────────────────────────

export interface TelemetryPayload {
  device_id: string;
  pole_id: string;
  event: string;
  energized: boolean;
  ts: string;
  seq: number;
  battery_mv?: number;
  rssi?: number;
  fw?: string;
}

export interface PipelineResult {
  telemetryId: number;
  detection: DetectionResult;
  incidentId: number | null;
  ticketId: number | null;
}

// ── Validation ──────────────────────────────────────────────────────────────

const VALID_EVENTS = ["power_lost", "power_restored", "heartbeat"];

/**
 * Validates the incoming telemetry payload.
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePayload(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return "Request body must be a JSON object.";
  }

  const p = body as Record<string, unknown>;

  if (!p.device_id || typeof p.device_id !== "string") {
    return "Missing or invalid 'device_id' (string required).";
  }
  if (!p.pole_id || typeof p.pole_id !== "string") {
    return "Missing or invalid 'pole_id' (string required).";
  }
  if (!p.event || typeof p.event !== "string") {
    return "Missing or invalid 'event' (string required).";
  }
  if (!VALID_EVENTS.includes(p.event)) {
    return `Invalid event type '${p.event}'. Must be one of: ${VALID_EVENTS.join(", ")}.`;
  }
  if (typeof p.energized !== "boolean") {
    return "Missing or invalid 'energized' (boolean required).";
  }
  if (!p.ts || typeof p.ts !== "string") {
    return "Missing or invalid 'ts' (ISO 8601 timestamp string required).";
  }
  if (isNaN(new Date(p.ts).getTime())) {
    return `Invalid timestamp '${p.ts}'. Must be a valid ISO 8601 date string.`;
  }
  if (typeof p.seq !== "number" || !Number.isInteger(p.seq) || p.seq < 0) {
    return "Missing or invalid 'seq' (non-negative integer required).";
  }

  return null;
}

// ── Pipeline ────────────────────────────────────────────────────────────────

/**
 * Runs the complete telemetry ingestion pipeline:
 *
 *   1. Look up device
 *   2. Check for duplicates
 *   3. Store raw telemetry
 *   4. Fetch outages & topology
 *   5. Run detection engine
 *   6. Store detection result
 *   7. If fault detected → create incident + ticket
 */
export async function processTelemetry(
  payload: TelemetryPayload,
): Promise<PipelineResult> {
  // ── Step 1: Look up device ──────────────────────────────────────────────

  const device = await repo.findDeviceBySerial(payload.device_id);
  if (!device) {
    throw new AppError(404, `Device '${payload.device_id}' not found.`);
  }

  const recordedAt = new Date(payload.ts);

  // ── Step 2: Duplicate detection ─────────────────────────────────────────

  const isDuplicate = await repo.isDuplicateTelemetry(device.id, recordedAt);
  if (isDuplicate) {
    throw new AppError(
      409,
      `Duplicate telemetry: device '${payload.device_id}' at ${payload.ts}.`,
    );
  }

  // ── Step 3: Store raw telemetry ─────────────────────────────────────────

  const batteryPercent =
    payload.battery_mv !== undefined
      ? Math.min(
          100,
          Math.max(
            0,
            ((payload.battery_mv - 2500) / (4200 - 2500)) * 100,
          ),
        )
      : null;

  const telemetryId = await repo.saveTelemetryEvent({
    deviceId: device.id,
    eventType: payload.event,
    voltage: null,
    current: null,
    signalStrength: payload.rssi ?? null,
    batteryLevel:
      batteryPercent !== null
        ? Math.round(batteryPercent * 100) / 100
        : null,
    recordedAt,
  });

  // ── Step 4: Fetch outages & topology ────────────────────────────────────

  const outages: ScheduledOutage[] = await repo.findActiveOutages(
    device.feederId,
    device.transformerId,
    recordedAt,
  );

  const poleStatuses = await repo.getPoleStatusesByTransformer(
    device.transformerId,
  );

  // ── Step 5: Run detection engine ────────────────────────────────────────

  const event: TelemetryEvent = {
    deviceId: device.id,
    transformerId: device.transformerId,
    feederId: device.feederId,
    eventType: payload.event as EventType,
    recordedAt,
  };

  const detection = runDetection({
    event,
    outages,
    poleStatuses,
    algorithmVersion: ALGORITHM_VERSION,
  });

  // ── Step 6: Store detection result ──────────────────────────────────────

  const faultTypeId = detection.faultType
    ? await repo.findFaultTypeIdByName(detection.faultType)
    : null;

  const detectionResultId = await repo.saveDetectionResult({
    feederId: device.feederId,
    faultTypeId,
    algorithmVersion: detection.algorithmVersion,
    confidence: detection.confidence,
    decision: detection.decision,
    reason: detection.reason,
  });

  // ── Step 7: Create incident + ticket if fault detected ──────────────────

  let incidentId: number | null = null;
  let ticketId: number | null = null;

  if (detection.decision === Decision.FaultDetected && detection.faultType) {
    const coords = detection.probablePoleId
      ? await repo.getPoleCoordinates(detection.probablePoleId)
      : null;

    const faultLabel = detection.faultType.replace("_", " ");
    const title = `${faultLabel.charAt(0).toUpperCase() + faultLabel.slice(1)} detected`;

    incidentId = await repo.createIncident({
      detectionResultId,
      feederId: device.feederId,
      transformerId: device.transformerId,
      probablePoleId: detection.probablePoleId,
      faultTypeId: faultTypeId!,
      title,
      description: detection.reason,
      confidence: detection.confidence,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });

    const priority =
      detection.confidence >= 0.7
        ? "critical"
        : detection.confidence >= 0.4
          ? "high"
          : "medium";

    ticketId = await repo.createTicket({
      incidentId,
      priority,
      notes: detection.reason,
    });
  }

  return { telemetryId, detection, incidentId, ticketId };
}

// ── AppError ────────────────────────────────────────────────────────────────

/**
 * Application-level error with HTTP status code.
 * Used by the controller to return proper HTTP errors without try/catch boilerplate.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
