import type {
  ApiResponse,
  DashboardStats,
  Incident,
  IncidentDetail,
  Ticket,
  SimulationResult,
} from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Request failed");
  return json.data as T;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export const fetchDashboard = () => request<DashboardStats>("/dashboard");

// ── Incidents ───────────────────────────────────────────────────────────────

export const fetchIncidents = () => request<Incident[]>("/incidents");

export const fetchIncident = (id: number) =>
  request<IncidentDetail>(`/incidents/${id}`);

// ── Tickets ─────────────────────────────────────────────────────────────────

export const fetchTickets = (status?: string, priority?: string) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  const qs = params.toString();
  return request<Ticket[]>(`/tickets${qs ? `?${qs}` : ""}`);
};

export const patchTicket = (
  id: number,
  body: { status?: string; assigned_to?: string; notes?: string },
) => request<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) });

// ── Simulator ───────────────────────────────────────────────────────────────

export type ScenarioType = "span" | "transformer" | "feeder" | "device" | "outage" | "restore";

export const runSimulation = (scenario: ScenarioType, body?: Record<string, string>) =>
  request<SimulationResult>(`/simulator/${scenario}`, {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
