/**
 * Confidence Calculator
 *
 * Pure function. Deterministic rules. No AI/ML.
 *
 * Computes a confidence score (0–1) for a detection result based on:
 *
 *   1. Base score   — inherent reliability of the fault type classification
 *   2. Topology     — bonus when exact localization was possible
 *   3. Agreement    — bonus when neighboring poles corroborate the pattern
 *
 * Scoring model: additive with clamp.
 *
 *   confidence = base + topologyBonus + agreementBonus
 *   clamped to [0.0, 1.0], rounded to 4 decimal places (matches DB precision)
 *
 * ┌──────────────────┬──────┬─────────────────────────────────────────────┐
 * │ Factor           │ Max  │ Rationale                                   │
 * ├──────────────────┼──────┼─────────────────────────────────────────────┤
 * │ Transformer base │ 0.55 │ All poles dark — strong, unambiguous signal │
 * │ Feeder base      │ 0.50 │ Clear pattern but coarse localization       │
 * │ Span base        │ 0.45 │ Contiguous dark — good signal, needs topo   │
 * │ Device fail base │ 0.15 │ Single data point — inherently uncertain    │
 * │ No fault base    │ 0.05 │ Minimal confidence for negative detections  │
 * │ Topology bonus   │ 0.25 │ Exact localization significantly more       │
 * │                  │      │ trustworthy than estimated                  │
 * │ Agreement bonus  │ 0.20 │ Neighbor corroboration confirms pattern     │
 * └──────────────────┴──────┴─────────────────────────────────────────────┘
 *
 * Example outputs:
 *   Span + topology + perfect agreement   = 0.45 + 0.25 + 0.20 = 0.90
 *   Transformer + topology + 90% agree    = 0.55 + 0.25 + 0.18 = 0.98
 *   Device failure + no topology + 50%    = 0.15 + 0.00 + 0.10 = 0.25
 *   No fault                              = 0.05 + 0.00 + 0.00 = 0.05
 */

import type { DetectionResult } from "../types/detection-result";
import { FaultType } from "../types/detection-result";

// ── Scoring constants ───────────────────────────────────────────────────────

const BASE_SCORES: Record<string, number> = {
  [FaultType.Transformer]: 0.55,
  [FaultType.Feeder]: 0.50,
  [FaultType.Span]: 0.45,
  [FaultType.DeviceFailure]: 0.15,
};

const NO_FAULT_BASE = 0.05;
const TOPOLOGY_BONUS = 0.25;
const AGREEMENT_MAX_BONUS = 0.20;
const PRECISION = 10_000; // 4 decimal places — matches NUMERIC(5,4)

// ── Calculator ──────────────────────────────────────────────────────────────

export function calculateConfidence(
  result: DetectionResult,
  topologyAvailable: boolean,
  neighborAgreement: number,
): number {
  const base =
    result.faultType !== null
      ? (BASE_SCORES[result.faultType] ?? NO_FAULT_BASE)
      : NO_FAULT_BASE;

  const topology = topologyAvailable ? TOPOLOGY_BONUS : 0;

  const clampedAgreement = clamp(neighborAgreement, 0, 1);
  const agreement = clampedAgreement * AGREEMENT_MAX_BONUS;

  const raw = base + topology + agreement;

  return Math.round(clamp(raw, 0, 1) * PRECISION) / PRECISION;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
