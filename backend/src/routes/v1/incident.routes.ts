import { Router } from "express";
import { IncidentController } from "../../controllers/incident.controller";

const router = Router();

router.get("/", IncidentController.list);
router.get("/:id", IncidentController.detail);

export default router;
