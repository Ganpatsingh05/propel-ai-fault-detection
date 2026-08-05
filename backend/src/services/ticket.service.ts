import * as repo from "../database/repositories";
import { AppError } from "./telemetry.service";

// Strict linear workflow — each status can only transition to the next
const WORKFLOW: Record<string, string> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "pending_verification",
  pending_verification: "closed",
};

const VALID_STATUSES = new Set(Object.keys(WORKFLOW).concat("closed"));

export class TicketService {
  static async list(status?: string, priority?: string) {
    const statusFilter = status || null;
    const priorityFilter = priority || null;
    return repo.getTicketsList(statusFilter, priorityFilter);
  }

  static async update(
    id: number,
    body: { status?: string; assigned_to?: string; notes?: string },
  ) {
    const ticket = await repo.getTicketById(id);
    if (!ticket) {
      throw new AppError(404, `Ticket ${id} not found.`);
    }

    if (body.status) {
      // Validate the status is a known value
      if (!VALID_STATUSES.has(body.status)) {
        throw new AppError(
          400,
          `Invalid status '${body.status}'. ` +
            `Valid statuses: ${[...VALID_STATUSES].join(", ")}.`,
        );
      }

      // Validate the transition is allowed
      const expectedNext = WORKFLOW[ticket.status];
      if (body.status !== expectedNext) {
        throw new AppError(
          422,
          `Cannot transition from '${ticket.status}' to '${body.status}'. ` +
            `Next valid status: ${expectedNext ? `'${expectedNext}'` : "none (already closed)"}.`,
        );
      }

      // "in_progress" requires assigned_to
      if (body.status === "in_progress" && !body.assigned_to && !ticket.assignedTo) {
        throw new AppError(
          400,
          `'assigned_to' is required when moving a ticket to in_progress.`,
        );
      }
    }

    // Apply update
    const updated = await repo.updateTicketFields(id, {
      status: body.status,
      assignedTo: body.assigned_to,
      notes: body.notes,
    });

    // Cascade status to incident when resolved or closed
    if (body.status === "resolved") {
      await repo.updateIncidentStatus(ticket.incidentId, "resolved");
    }

    return updated;
  }
}
