import { Router } from "express";
import { SimulatorController } from "../../controllers/simulator.controller";

const router = Router();

router.post("/span", SimulatorController.span);
router.post("/transformer", SimulatorController.transformer);
router.post("/feeder", SimulatorController.feeder);
router.post("/device", SimulatorController.device);
router.post("/outage", SimulatorController.outage);
router.post("/restore", SimulatorController.restore);

export default router;
