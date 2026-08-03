import { env } from "../config/env";

export class HealthService {
  static getHealthStatus() {
    return {
      environment: env.NODE_ENV,
      uptime: process.uptime(),
    };
  }
}