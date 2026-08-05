import { Request, Response, NextFunction } from "express";
import { TicketService } from "../services/ticket.service";
import { AppError } from "../services/telemetry.service";
import { successResponse, errorResponse } from "../utils/apiResponse";

export class TicketController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const tickets = await TicketService.list(status, priority);
      res.status(200).json(
        successResponse(`${tickets.length} ticket(s) found.`, tickets),
      );
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json(errorResponse("Invalid ticket ID."));
        return;
      }

      const updated = await TicketService.update(id, req.body);
      res.status(200).json(successResponse("Ticket updated.", updated));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      next(error);
    }
  }
}
