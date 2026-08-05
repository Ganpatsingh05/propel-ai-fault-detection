import { Request, Response, NextFunction } from "express";
import { IncidentService } from "../services/incident.service";
import { successResponse, errorResponse } from "../utils/apiResponse";

export class IncidentController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const incidents = await IncidentService.list();
      res.status(200).json(
        successResponse(`${incidents.length} incident(s) found.`, incidents),
      );
    } catch (error) {
      next(error);
    }
  }

  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json(errorResponse("Invalid incident ID."));
        return;
      }

      const incident = await IncidentService.detail(id);
      if (!incident) {
        res.status(404).json(errorResponse(`Incident ${id} not found.`));
        return;
      }

      res.status(200).json(successResponse("Incident details retrieved.", incident));
    } catch (error) {
      next(error);
    }
  }
}
