"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchDashboard, fetchIncidents } from "@/lib/api";
import dynamic from "next/dynamic";
import type { Incident } from "@/types";
import { useState } from "react";

const IncidentMap = dynamic(() => import("@/components/dashboard/IncidentMap"), { ssr: false });

const SEV_COLOR: Record<string, string> = {
  critical: "from-red-500/20 to-red-900/10 border-red-500/20",
  high: "from-orange-500/20 to-orange-900/10 border-orange-500/20",
  medium: "from-yellow-500/20 to-yellow-900/10 border-yellow-500/20",
  low: "from-blue-500/20 to-blue-900/10 border-blue-500/20",
};

function KPICard({ label, value, sub, color, delay }: { label: string; value: number | string; sub?: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`card p-5 bg-gradient-to-br ${color}`}
    >
      <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </motion.div>
  );
}

function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="card p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2"><span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
        <h3 className="text-sm font-semibold text-gray-300">Live Incidents</h3>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {incidents.length === 0 && <p className="text-xs text-gray-600 py-4 text-center">No active incidents</p>}
        {incidents.slice(0, 15).map((inc, i) => (
          <motion.div key={inc.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3 border border-white/5 hover:border-white/10 transition-colors"
          >
            <span className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${inc.severity === "critical" ? "bg-red-500" : inc.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-200 truncate">{inc.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{inc.location.transformerCode || inc.location.feederCode} • {(inc.confidence * 100).toFixed(0)}% confidence</p>
            </div>
            <span className={`badge badge-${inc.ticket?.priority || "medium"}`}>{inc.ticket?.priority || "—"}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard, refetchInterval: 15000 });
  const { data: incidents, isLoading: loadingInc } = useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents, refetchInterval: 15000 });
  const [selected, setSelected] = useState<Incident | null>(null);

  if (loadingStats || loadingInc) return <DashboardSkeleton />;
  if (!stats) {
    return (
      <div className="card p-12 text-center border-red-500/20 bg-red-500/5">
        <p className="text-red-400 font-semibold mb-2">Backend Connection Failed</p>
        <p className="text-sm text-gray-500">Failed to load dashboard data. Ensure the backend server is running.</p>
      </div>
    );
  }

  const s = stats;
  const inc = incidents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Control Room</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time grid monitoring</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="relative flex h-2 w-2"><span className="pulse-ring absolute h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-green-500" /></span>
          System Online
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard label="Active Incidents" value={s.incidents.active} color={SEV_COLOR.critical} delay={0} />
        <KPICard label="Critical" value={s.incidents.critical} color={SEV_COLOR.high} delay={0.05} />
        <KPICard label="Open Tickets" value={s.tickets.open} color={SEV_COLOR.medium} delay={0.1} />
        <KPICard label="Devices Online" value={s.devices.online} sub={`of ${s.devices.total}`} color="from-green-500/20 to-green-900/10 border-green-500/20" delay={0.15} />
        <KPICard label="Devices Offline" value={s.devices.offline} color={SEV_COLOR.critical} delay={0.2} />
        <KPICard label="Telemetry Today" value={s.telemetryToday} color="from-indigo-500/20 to-indigo-900/10 border-indigo-500/20" delay={0.25} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3">
          <div className="card overflow-hidden" style={{ height: 480 }}>
            <IncidentMap incidents={inc} onSelect={setSelected} />
          </div>
        </div>
        <div className="xl:col-span-1">
          <IncidentFeed incidents={inc.filter(i => i.status === "active")} />
        </div>
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold">{selected.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{selected.location.feederName} → {selected.location.transformerCode}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-lg">×</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-white/[0.03] rounded-lg p-3"><p className="text-[10px] text-gray-500 uppercase">Confidence</p><p className="text-lg font-bold mt-1">{(selected.confidence * 100).toFixed(0)}%</p></div>
            <div className="bg-white/[0.03] rounded-lg p-3"><p className="text-[10px] text-gray-500 uppercase">Fault</p><p className="text-lg font-bold mt-1 capitalize">{selected.faultType.replace("_", " ")}</p></div>
            <div className="bg-white/[0.03] rounded-lg p-3"><p className="text-[10px] text-gray-500 uppercase">Pole</p><p className="text-lg font-bold mt-1">{selected.location.probablePoleCode || "—"}</p></div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 skeleton" />)}
      </div>
      <div className="h-[480px] skeleton" />
    </div>
  );
}
