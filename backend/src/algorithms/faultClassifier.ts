/**
 * Fault Classifier
 *
 * Pure function. No side effects. No database queries.
 *
 * Receives a telemetry event and the current status of all poles
 * on the same transformer. Determines the most likely fault type
 * based on the pattern of dark (de-energized) poles.
 *
 * Classification rules:
 *   1. Non power_lost events            → No Fault
 *   2. No dark poles                    → No Fault
 *   3. ALL poles dark                   → Transformer Fault
 *   4. Single dark pole, neighbors live → Device Failure
 *   5. Contiguous downstream dark chain → Span Fault
 */

import type { TelemetryEvent } from "../types/telemetry";
import { EventType } from "../types/telemetry";
import { FaultType } from "../types/detection-result";

// ── Input types ─────────────────────────────────────────────────────────────

export interface PoleStatus {
  poleId: number;
  parentPoleId: number | null;
  isDark: boolean;
}

// ── Output type ─────────────────────────────────────────────────────────────

export interface ClassificationResult {
  faultType: FaultType | null;
  reason: string;
}

// ── Classifier ──────────────────────────────────────────────────────────────

export function classifyFault(
  event: TelemetryEvent,
  poleStatuses: PoleStatus[],
): ClassificationResult {
  if (event.eventType !== EventType.PowerLost) {
    return {
      faultType: null,
      reason: `Event type "${event.eventType}" does not indicate a fault.`,
    };
  }

  const darkPoles = poleStatuses.filter((p) => p.isDark);
  const totalPoles = poleStatuses.length;

  if (darkPoles.length === 0) {
    return {
      faultType: null,
      reason: "No dark poles detected on this transformer.",
    };
  }

  // All poles dark → transformer fault
  if (darkPoles.length === totalPoles) {
    return {
      faultType: FaultType.Transformer,
      reason: `All ${totalPoles} poles under the transformer are dark. Consistent with transformer failure.`,
    };
  }

  // Build topology lookups for neighbor analysis
  const statusById = new Map<number, PoleStatus>();
  const childrenOf = new Map<number, number[]>();

  for (const pole of poleStatuses) {
    statusById.set(pole.poleId, pole);
  }

  for (const pole of poleStatuses) {
    if (pole.parentPoleId !== null) {
      const siblings = childrenOf.get(pole.parentPoleId) ?? [];
      siblings.push(pole.poleId);
      childrenOf.set(pole.parentPoleId, siblings);
    }
  }

  // Single dark pole → check if isolated (device failure)
  if (darkPoles.length === 1) {
    const darkPole = darkPoles[0];

    if (isIsolatedDark(darkPole, statusById, childrenOf)) {
      return {
        faultType: FaultType.DeviceFailure,
        reason:
          `Single dark pole (ID ${darkPole.poleId}) with all neighbors energized. ` +
          `Probable device malfunction.`,
      };
    }
  }

  // Multiple dark poles (not all) → find live-to-dark boundaries
  // A boundary pole is a dark pole whose parent is live (or is the root).
  const boundaryPoles = darkPoles.filter((pole) => {
    if (pole.parentPoleId === null) {
      return true;
    }
    const parent = statusById.get(pole.parentPoleId);
    return parent === undefined || !parent.isDark;
  });

  if (boundaryPoles.length === 1) {
    return {
      faultType: FaultType.Span,
      reason:
        `Live-to-dark boundary at pole ${boundaryPoles[0].poleId}. ` +
        `${darkPoles.length} of ${totalPoles} poles dark in contiguous downstream chain.`,
    };
  }

  // Multiple boundaries → complex fault pattern.
  // Most common real-world cause is still a span fault (possibly multiple).
  // Classification defaults to span; confidence module will lower the score.
  return {
    faultType: FaultType.Span,
    reason:
      `${darkPoles.length} of ${totalPoles} poles dark with ` +
      `${boundaryPoles.length} live-to-dark boundaries. ` +
      `Pattern is ambiguous; defaulting to span fault.`,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A pole is "isolated dark" if:
 *   - Its parent is live (or it is the root)
 *   - All its children are live
 *
 * This pattern indicates the device is likely faulty,
 * not the power line.
 */
function isIsolatedDark(
  pole: PoleStatus,
  statusById: Map<number, PoleStatus>,
  childrenOf: Map<number, number[]>,
): boolean {
  if (pole.parentPoleId !== null) {
    const parent = statusById.get(pole.parentPoleId);
    if (parent !== undefined && parent.isDark) {
      return false;
    }
  }

  const children = childrenOf.get(pole.poleId) ?? [];
  return children.every((childId) => {
    const child = statusById.get(childId);
    return child === undefined || !child.isDark;
  });
}
