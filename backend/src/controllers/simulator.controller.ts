import { Request, Response, NextFunction } from "express";
import { runScenario } from "../simulator/scenarioRunner";
import { ScenarioType } from "../simulator/types";
import { AppError } from "../services/telemetry.service";
import { successResponse, errorResponse } from "../utils/apiResponse";

export class SimulatorController {
  static async span(req: Request, res: Response, next: NextFunction) {
    await SimulatorController.execute(ScenarioType.Span, req, res, next);
  }

  static async transformer(req: Request, res: Response, next: NextFunction) {
    await SimulatorController.execute(
      ScenarioType.Transformer,
      req,
      res,
      next,
    );
  }

  static async feeder(req: Request, res: Response, next: NextFunction) {
    await SimulatorController.execute(ScenarioType.Feeder, req, res, next);
  }

  static async device(req: Request, res: Response, next: NextFunction) {
    await SimulatorController.execute(ScenarioType.Device, req, res, next);
  }

  static async outage(req: Request, res: Response, next: NextFunction) {
    await SimulatorController.execute(ScenarioType.Outage, req, res, next);
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    await SimulatorController.execute(ScenarioType.Restore, req, res, next);
  }

  private static async execute(
    scenario: ScenarioType,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await runScenario(scenario, {
        transformerCode: req.body?.transformer_code,
        feederCode: req.body?.feeder_code,
        deviceSerial: req.body?.device_serial,
      });

      res
        .status(200)
        .json(
          successResponse(
            `Scenario '${scenario}' executed successfully.`,
            result,
          ),
        );
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      next(error);
    }
  }
}
