import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service";
import { successResponse } from "../utils/apiResponse";

export class DashboardController {
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DashboardService.getStats();
      res.status(200).json(successResponse("Dashboard stats retrieved.", stats));
    } catch (error) {
      next(error);
    }
  }
}
