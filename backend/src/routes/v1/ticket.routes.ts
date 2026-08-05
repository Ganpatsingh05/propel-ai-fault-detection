import { Router } from "express";
import { TicketController } from "../../controllers/ticket.controller";

const router = Router();

router.get("/", TicketController.list);
router.patch("/:id", TicketController.update);

export default router;
