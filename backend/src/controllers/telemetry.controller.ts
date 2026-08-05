import { Request, Response, NextFunction } from "express";
import { validatePayload, processTelemetry, AppError } from "../services/telemetry.service";
import type { TelemetryPayload } from "../services/telemetry.service";
import { successResponse, errorResponse } from "../utils/apiResponse";

export class TelemetryController {
  static async ingest(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate
      const validationError = validatePayload(req.body);
      if (validationError) {
        res.status(400).json(errorResponse(validationError));
        return;
      }

      const payload = req.body as TelemetryPayload;

      // Process pipeline
      const result = await processTelemetry(payload);

      // Response
      const statusCode = result.incidentId ? 201 : 200;
      const message = result.incidentId
        ? "Telemetry processed. Fault detected — incident created."
        : "Telemetry processed. No fault detected.";

      res.status(statusCode).json(
        successResponse(message, {
          telemetryId: result.telemetryId,
          decision: result.detection.decision,
          confidence: result.detection.confidence,
          faultType: result.detection.faultType,
          reason: result.detection.reason,
          incidentId: result.incidentId,
          ticketId: result.ticketId,
        })
      );
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      next(error);
    }
  }
}
