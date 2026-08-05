import { Request, Response } from "express";
import { HealthService } from "../services/health.service";
import { successResponse } from "../utils/apiResponse";

export class HealthController {
  static async getHealth(_req: Request, res: Response) {
    const data = await HealthService.getHealthStatus();

    res.status(200).json(
      successResponse("Backend is running successfully", data)
    );
  }
}
