/**
 * Localization domain types.
 * Represents the output of the fault localization algorithm.
 *
 * Exact:     Full topology available. Algorithm identified the precise faulted span.
 * Estimated: Incomplete topology. Algorithm inferred a probable location.
 */

export enum LocalizationType {
  Exact = "exact",
  Estimated = "estimated",
}

export interface LocalizationResult {
  localizationType: LocalizationType;
  probablePoleId: number | null;
  affectedPoleIds: number[];
  confidence: number;
}
