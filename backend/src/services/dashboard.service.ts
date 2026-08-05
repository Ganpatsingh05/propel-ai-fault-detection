import * as repo from "../database/repositories";

export class DashboardService {
  static async getStats() {
    return repo.getDashboardStats();
  }
}
