# Fault Localization Algorithm

## Objective

Automatically identify the probable electrical fault location using telemetry from IoT devices installed on electricity poles.

The algorithm should:

- Detect faults within two minutes.
- Minimize false positives.
- Localize the probable fault span or equipment.
- Group multiple dark poles into a single incident.
- Automatically verify restoration after repair.

---

## Key Observation

The IoT devices report the status of poles (nodes).

Electrical faults usually occur on the wire between two poles (edges).

Therefore, the algorithm does not directly detect faults.

Instead, it infers the failed span by analyzing the boundary between energized and de-energized poles.

---

## High-Level Algorithm

1. Receive telemetry.
2. Validate telemetry.
3. Remove duplicate messages.
4. Update current pole status.
5. Ignore scheduled outages.
6. Detect abnormal power-loss patterns.
7. Locate the live-to-dark boundary.
8. Group affected poles into one incident.
9. Calculate confidence.
10. Create an incident.
11. Create a ticket.
12. Verify restoration using telemetry.

---

## Important Principles

- One electrical fault should generate one incident.
- Multiple dark poles usually indicate one upstream fault.
- A single isolated dark pole is likely a sensor issue rather than a line fault.
- Unknown topology reduces localization confidence.
- The algorithm should report uncertainty instead of pretending to know the exact location.

---

## Challenges

- Missing topology.
- Device failures.
- Duplicate messages.
- Delayed telemetry.
- Missing telemetry.
- Scheduled outages.
- Multiple simultaneous faults.

---

## Algorithm Inputs

1. Telemetry Events
2. Pole Registry
3. Scheduled Outages

---

## Algorithm Output

The algorithm returns a localized incident containing:

- Incident ID
- Fault Type
- Probable Fault Span
- Coordinates
- Pincode
- Number of Affected Poles
- Confidence Score
- Reason

---

## Internal State

The system maintains the latest power status of every monitored pole.

Example:

P1 -> Live

P2 -> Live

P3 -> Dark

P4 -> Dark

---

## Core Observation

The fault is inferred at the first transition from an energized pole to a de-energized pole.

The sensors report node state.

The algorithm infers edge failure.

---

## Processing Pipeline

1. Receive telemetry.
2. Validate telemetry.
3. Remove duplicates.
4. Update pole status.
5. Ignore scheduled outages.
6. Find Live → Dark boundary.
7. Group affected poles.
8. Calculate confidence.
9. Create incident.
10. Create ticket.

---

## Data Structures

- HashMap for pole lookup.
- Tree representation of the electrical network.
- Queue for incoming telemetry.

---

## Performance Goals

- Constant-time pole lookup.
- Incremental updates instead of full network scans.
- Efficient traversal of only the affected network region.

## Future Work

- Confidence scoring.
- Topology inference.
- Noise filtering.
- Fault grouping algorithm.
