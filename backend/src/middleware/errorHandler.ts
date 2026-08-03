import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(error);

  res.status(500).json({
    success: false,
    message: error.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
    stack:
      env.NODE_ENV === "development"
        ? error.stack
        : undefined,
  });
};