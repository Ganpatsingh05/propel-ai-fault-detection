import { env } from "../config/env";
import pool from "../database/pool";

export class HealthService {
  static async getHealthStatus() {
    let dbStatus = "disconnected";
    try {
      await pool.query("SELECT 1");
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }

    return {
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      database: dbStatus,
    };
  }
}