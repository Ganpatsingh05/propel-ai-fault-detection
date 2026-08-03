import { Request, Response } from "express";
import { errorResponse } from "../utils/apiResponse";

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json(errorResponse("Route not found"));
};