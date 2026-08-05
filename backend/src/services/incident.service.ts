import * as repo from "../database/repositories";

export class IncidentService {
  static async list() {
    return repo.getIncidentsList();
  }

  static async detail(id: number) {
    const incident = await repo.getIncidentDetail(id);
    if (!incident) return null;

    // Fetch affected poles and recent telemetry in parallel
    const [affectedPoles, recentTelemetry] = await Promise.all([
      incident.transformerId
        ? repo.getAffectedPoles(incident.transformerId)
        : Promise.resolve([]),
      incident.transformerId
        ? repo.getRecentTelemetry(incident.transformerId, 20)
        : Promise.resolve([]),
    ]);

    return {
      ...incident,
      affectedPoles,
      recentTelemetry,
    };
  }
}
