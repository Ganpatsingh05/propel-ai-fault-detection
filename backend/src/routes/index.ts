import { Router } from "express";
import healthRoutes from "./v1/health.routes";

const router = Router();

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

router.use("/v1/health", healthRoutes);

export default router;