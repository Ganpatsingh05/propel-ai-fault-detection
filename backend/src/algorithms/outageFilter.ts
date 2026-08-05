/**
 * Outage Filter
 *
 * Pure function. No side effects. No database queries. No logging.
 *
 * Determines whether a telemetry event should be ignored because
 * it falls within a scheduled maintenance window.
 *
 * Rules:
 *   1. If a feeder-level outage is active and the telemetry's feeder matches → ignore.
 *   2. If a transformer-level outage is active and the telemetry's transformer matches → ignore.
 *   3. "Active" means recordedAt falls within [startTime, endTime] (inclusive).
 *   4. Otherwise → continue to fault detection.
 */

import type { TelemetryEvent } from "../types/telemetry";
import type { ScheduledOutage } from "../types/scheduled-outage";

export interface OutageFilterResult {
  ignored: boolean;
  reason?: string;
}

export function filterScheduledOutage(
  event: TelemetryEvent,
  outages: ScheduledOutage[],
): OutageFilterResult {
  for (const outage of outages) {
    if (event.recordedAt < outage.startTime || event.recordedAt > outage.endTime) {
      continue;
    }

    if (outage.feederId !== null && outage.feederId === event.feederId) {
      return {
        ignored: true,
        reason: `Feeder-level outage active: "${outage.reason}" (${outage.startTime.toISOString()} – ${outage.endTime.toISOString()})`,
      };
    }

    if (outage.transformerId !== null && outage.transformerId === event.transformerId) {
      return {
        ignored: true,
        reason: `Transformer-level outage active: "${outage.reason}" (${outage.startTime.toISOString()} – ${outage.endTime.toISOString()})`,
      };
    }
  }

  return { ignored: false };
}
