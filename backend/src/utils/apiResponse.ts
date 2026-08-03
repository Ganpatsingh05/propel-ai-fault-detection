import { ApiResponse } from "../types/api-response";

export function successResponse<T>(
  message: string,
  data?: T
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(
  message: string
): ApiResponse<null> {
  return {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
}