/**
 * Detection Engine
 *
 * Orchestrates the full fault detection pipeline:
 *
 *   Outage Filter → Fault Classifier → Localization → Confidence → Result
 *
 * This is the single entry point for the detection pipeline.
 * Each stage is a pure function in its own module.
 * This module composes them in sequence and returns a DetectionResult.
 *
 * Does NOT access databases. Does NOT create incidents.
 */

import { filterScheduledOutage } from "./outageFilter";
import { classifyFault } from "./faultClassifier";
import { localizeFault } from "./localization";
import { calculateConfidence } from "./confidence";
import { Decision } from "../types/detection-result";
import { LocalizationType } from "../types/localization";
import type { TelemetryEvent } from "../types/telemetry";
import type { ScheduledOutage } from "../types/scheduled-outage";
import type { DetectionResult } from "../types/detection-result";
import type { PoleStatus } from "./faultClassifier";

// Re-export so callers only import from the engine
export type { PoleStatus } from "./faultClassifier";

// ── Input type ──────────────────────────────────────────────────────────────

export interface DetectionInput {
  event: TelemetryEvent;
  outages: ScheduledOutage[];
  poleStatuses: PoleStatus[];
  algorithmVersion: string;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export function runDetection(input: DetectionInput): DetectionResult {
  const { event, outages, poleStatuses, algorithmVersion } = input;

  // ── Stage 1: Scheduled Outage Filter ────────────────────────────────────

  const outageCheck = filterScheduledOutage(event, outages);

  if (outageCheck.ignored) {
    return {
      decision: Decision.NoFault,
      confidence: 0,
      algorithmVersion,
      reason: outageCheck.reason ?? "Suppressed by scheduled outage.",
      probablePoleId: null,
      faultType: null,
    };
  }

  // ── Stage 2: Fault Classification ───────────────────────────────────────

  const classification = classifyFault(event, poleStatuses);

  if (classification.faultType === null) {
    const noFaultResult: DetectionResult = {
      decision: Decision.NoFault,
      confidence: 0,
      algorithmVersion,
      reason: classification.reason,
      probablePoleId: null,
      faultType: null,
    };

    noFaultResult.confidence = calculateConfidence(noFaultResult, false, 0);
    return noFaultResult;
  }

  // ── Stage 3: Localization ───────────────────────────────────────────────

  const localization = localizeFault(poleStatuses);
  const topologyAvailable =
    localization.localizationType === LocalizationType.Exact;

  // ── Stage 4: Confidence Calculation ─────────────────────────────────────

  const agreement = computeAgreement(
    poleStatuses,
    localization.affectedPoleIds,
  );

  const result: DetectionResult = {
    decision: Decision.FaultDetected,
    confidence: 0,
    algorithmVersion,
    reason: buildReason(classification.reason, localization),
    probablePoleId: localization.probablePoleId,
    faultType: classification.faultType,
  };

  result.confidence = calculateConfidence(result, topologyAvailable, agreement);

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Computes how well the actual dark/live pattern matches the
 * localization's prediction.
 *
 *   agreement = (poles matching expected pattern) / (total poles)
 *
 * A pole "matches" if:
 *   - It is in affectedPoleIds AND is dark, or
 *   - It is NOT in affectedPoleIds AND is live.
 */
function computeAgreement(
  poleStatuses: PoleStatus[],
  affectedPoleIds: number[],
): number {
  if (poleStatuses.length === 0) {
    return 0;
  }

  const affectedSet = new Set(affectedPoleIds);
  let matches = 0;

  for (const pole of poleStatuses) {
    const shouldBeDark = affectedSet.has(pole.poleId);
    if (shouldBeDark === pole.isDark) {
      matches++;
    }
  }

  return matches / poleStatuses.length;
}

/**
 * Composes a human-readable explanation from the classifier
 * and localization results.
 */
function buildReason(
  classificationReason: string,
  localization: { localizationType: LocalizationType; probablePoleId: number | null; affectedPoleIds: number[] },
): string {
  const parts = [classificationReason];

  if (localization.probablePoleId !== null) {
    const mode =
      localization.localizationType === LocalizationType.Exact
        ? "Exact"
        : "Estimated";

    parts.push(
      `${mode} localization: probable fault at pole ${localization.probablePoleId}.`,
    );
  }

  if (localization.affectedPoleIds.length > 0) {
    parts.push(`${localization.affectedPoleIds.length} pole(s) affected.`);
  }

  return parts.join(" ");
}
