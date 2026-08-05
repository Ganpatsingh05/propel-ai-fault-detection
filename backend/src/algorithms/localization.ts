/**
 * Fault Localization
 *
 * Pure function. No side effects. No database queries.
 *
 * Determines the probable location of a fault based on the pattern
 * of dark poles and available network topology.
 *
 * Two modes:
 *   Exact:     Topology is known (parent-child relationships exist).
 *              Walks the tree to find the live-to-dark boundary.
 *              The faulted span is between the boundary pole and its parent.
 *
 *   Estimated: Topology is unknown (no parent-child data).
 *              Cannot determine the faulted span precisely.
 *              Returns the first dark pole as the best available estimate.
 *
 * Does NOT calculate confidence — that is a separate pipeline stage.
 */

import {
  LocalizationType,
  type LocalizationResult,
} from "../types/localization";

// ── Input type ──────────────────────────────────────────────────────────────

export interface PoleStatus {
  poleId: number;
  parentPoleId: number | null;
  isDark: boolean;
}

// ── Localizer ───────────────────────────────────────────────────────────────

export function localizeFault(
  poleStatuses: PoleStatus[],
): LocalizationResult {
  const darkPoles = poleStatuses.filter((p) => p.isDark);

  if (darkPoles.length === 0) {
    return {
      localizationType: LocalizationType.Estimated,
      probablePoleId: null,
      affectedPoleIds: [],
      confidence: 0,
    };
  }

  const hasTopology = poleStatuses.some((p) => p.parentPoleId !== null);

  if (hasTopology) {
    return exactLocalization(poleStatuses, darkPoles);
  }

  return estimatedLocalization(darkPoles);
}

// ── Exact Localization ──────────────────────────────────────────────────────

/**
 * Topology is known. Walk the tree to find the live-to-dark boundary.
 *
 * The boundary pole is the first dark pole whose parent is live.
 * The faulted span is the wire between this pole and its parent.
 * All dark poles downstream of the boundary are affected.
 */
function exactLocalization(
  allPoles: PoleStatus[],
  darkPoles: PoleStatus[],
): LocalizationResult {
  const statusById = new Map<number, PoleStatus>();
  const childrenOf = new Map<number, number[]>();

  for (const pole of allPoles) {
    statusById.set(pole.poleId, pole);
  }

  for (const pole of allPoles) {
    if (pole.parentPoleId !== null) {
      const children = childrenOf.get(pole.parentPoleId) ?? [];
      children.push(pole.poleId);
      childrenOf.set(pole.parentPoleId, children);
    }
  }

  // A boundary pole is dark, but its parent is live (or it is the root).
  const boundaryPoles = darkPoles.filter((pole) => {
    if (pole.parentPoleId === null) {
      return true;
    }
    const parent = statusById.get(pole.parentPoleId);
    return parent === undefined || !parent.isDark;
  });

  if (boundaryPoles.length === 0) {
    return estimatedLocalization(darkPoles);
  }

  const boundary = boundaryPoles[0];
  const affectedPoleIds = collectDarkSubtree(
    boundary.poleId,
    statusById,
    childrenOf,
  );

  return {
    localizationType: LocalizationType.Exact,
    probablePoleId: boundary.poleId,
    affectedPoleIds,
    confidence: 0, // Calculated by the confidence module
  };
}

// ── Estimated Localization ──────────────────────────────────────────────────

/**
 * No topology available. Cannot walk the tree.
 * Returns the first dark pole as the best available estimate.
 * All dark poles are marked as affected.
 */
function estimatedLocalization(
  darkPoles: PoleStatus[],
): LocalizationResult {
  return {
    localizationType: LocalizationType.Estimated,
    probablePoleId: darkPoles[0].poleId,
    affectedPoleIds: darkPoles.map((p) => p.poleId),
    confidence: 0, // Calculated by the confidence module
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively collects all dark poles in the subtree rooted at `rootId`.
 * Stops descending when a live pole is encountered.
 */
function collectDarkSubtree(
  rootId: number,
  statusById: Map<number, PoleStatus>,
  childrenOf: Map<number, number[]>,
): number[] {
  const result: number[] = [rootId];
  const children = childrenOf.get(rootId) ?? [];

  for (const childId of children) {
    const child = statusById.get(childId);
    if (child !== undefined && child.isDark) {
      result.push(...collectDarkSubtree(childId, statusById, childrenOf));
    }
  }

  return result;
}
