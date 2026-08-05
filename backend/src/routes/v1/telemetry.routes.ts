import { Router } from "express";
import { TelemetryController } from "../../controllers/telemetry.controller";

const router = Router();

router.post("/", TelemetryController.ingest);

export default router;
