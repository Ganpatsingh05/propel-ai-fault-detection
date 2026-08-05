/**
 * Detection result domain types.
 * Represents the output of the fault detection engine.
 * A detection result may or may not produce an incident.
 */

export enum Decision {
  FaultDetected = "fault_detected",
  NoFault = "no_fault",
  InsufficientData = "insufficient_data",
}

export enum FaultType {
  Span = "span",
  Transformer = "transformer",
  Feeder = "feeder",
  DeviceFailure = "device_failure",
}

export interface DetectionResult {
  decision: Decision;
  confidence: number;
  algorithmVersion: string;
  reason: string;
  probablePoleId: number | null;
  faultType: FaultType | null;
}
