import { Router } from "express";
import healthRoutes from "./v1/health.routes";
import telemetryRoutes from "./v1/telemetry.routes";
import simulatorRoutes from "./v1/simulator.routes";
import incidentRoutes from "./v1/incident.routes";
import ticketRoutes from "./v1/ticket.routes";
import dashboardRoutes from "./v1/dashboard.routes";

const router = Router();

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

router.use("/v1/health", healthRoutes);
router.use("/v1/telemetry", telemetryRoutes);
router.use("/v1/simulator", simulatorRoutes);
router.use("/v1/incidents", incidentRoutes);
router.use("/v1/tickets", ticketRoutes);
router.use("/v1/dashboard", dashboardRoutes);

export default router;