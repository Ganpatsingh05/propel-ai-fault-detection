"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchIncidents, fetchIncident } from "@/lib/api";
import { useState, useMemo } from "react";
import type { Incident, IncidentDetail } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export default function IncidentsPage() {
  const { data: incidents, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents, refetchInterval: 15000 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter(i => {
      const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || (i.location.transformerCode?.toLowerCase() || "").includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || i.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [incidents, search, statusFilter]);

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Incidents Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} total events</p>
        </div>
        <div className="flex gap-3">
          <input type="text" placeholder="Search transformer..." className="bg-[#12122a] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="bg-[#12122a] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#12122a] text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Title / Location</th>
              <th className="px-6 py-4">Fault Type</th>
              <th className="px-6 py-4">Confidence</th>
              <th className="px-6 py-4">Ticket</th>
              <th className="px-6 py-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(inc => (
              <tr key={inc.id} onClick={() => setSelectedId(inc.id)} className="hover:bg-white/[0.02] cursor-pointer transition-colors">
                <td className="px-6 py-4"><span className={`badge badge-${inc.status}`}>{inc.status}</span></td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-200">{inc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{inc.location.feederCode} → {inc.location.transformerCode}</p>
                </td>
                <td className="px-6 py-4 capitalize text-gray-300">{inc.faultType.replace("_", " ")}</td>
                <td className="px-6 py-4"><div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${inc.confidence > 0.8 ? "bg-green-500" : inc.confidence > 0.5 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.round(inc.confidence * 100)}%` }} /></div><span className="text-[10px] text-gray-500 mt-1 block">{(inc.confidence * 100).toFixed(1)}%</span></td>
                <td className="px-6 py-4">{inc.ticket ? <span className={`badge badge-${inc.ticket.priority}`}>{inc.ticket.status}</span> : <span className="text-gray-600">—</span>}</td>
                <td className="px-6 py-4 text-xs text-gray-400">{new Date(inc.detectedAt).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No incidents found matching criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedId && <IncidentDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}

function IncidentDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: inc, isLoading } = useQuery({ queryKey: ["incident", id], queryFn: () => fetchIncident(id), refetchInterval: 15000 });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="fixed right-0 top-0 bottom-0 w-[600px] bg-[#0c0c1d] border-l border-white/10 z-50 overflow-y-auto flex flex-col shadow-2xl"
      >
        {isLoading || !inc ? (
          <div className="p-8 space-y-6"><div className="h-8 skeleton w-1/2" /><div className="h-32 skeleton" /><div className="h-64 skeleton" /></div>
        ) : (
          <>
            <div className="p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-[#0c0c1d]/90 backdrop-blur z-10">
              <div>
                <div className="flex gap-2 items-center mb-2">
                  <span className={`badge badge-${inc.status}`}>{inc.status}</span>
                  {inc.ticket && <span className={`badge badge-${inc.ticket.priority}`}>Ticket: {inc.ticket.status}</span>}
                </div>
                <h2 className="text-xl font-bold text-white">{inc.title}</h2>
                <p className="text-xs text-gray-400 mt-1">{inc.location.feederName} → {inc.location.transformerCode}</p>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Reasoning */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Detection Engine (v{inc.detection.algorithmVersion})</h3>
                <div className="bg-[#12122a] border border-white/5 rounded-lg p-4">
                  <p className="text-sm text-gray-300 leading-relaxed font-mono">{inc.detection.reason}</p>
                  <div className="mt-4 flex gap-6 text-xs border-t border-white/5 pt-4">
                    <div><span className="text-gray-500">Decision: </span><span className="font-semibold text-white capitalize">{inc.detection.decision.replace("_", " ")}</span></div>
                    <div><span className="text-gray-500">Confidence: </span><span className="font-semibold text-white">{(inc.detection.confidence * 100).toFixed(1)}%</span></div>
                  </div>
                </div>
              </section>

              {/* Topology / Location */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-[#12122a] border border-white/5 rounded-lg p-4">
                  <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Probable Location</h3>
                  <p className="text-lg font-bold text-gray-200">{inc.location.probablePoleCode || "Unknown Pole"}</p>
                  <p className="text-xs text-gray-500 mt-1">{inc.location.latitude?.toFixed(5)}, {inc.location.longitude?.toFixed(5)}</p>
                </div>
                <div className="bg-[#12122a] border border-white/5 rounded-lg p-4">
                  <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Affected Area</h3>
                  <p className="text-lg font-bold text-gray-200">{inc.affectedPoles.filter(p => p.status === "dark").length} Poles Dark</p>
                  <p className="text-xs text-gray-500 mt-1">out of {inc.affectedPoles.length} total</p>
                </div>
              </section>

              {/* Recent Telemetry */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Recent Telemetry ({inc.location.transformerCode})</h3>
                <div className="border border-white/5 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-gray-400">
                      <tr><th className="p-3">Time</th><th className="p-3">Device/Pole</th><th className="p-3">Event</th><th className="p-3">V/Batt/RSSI</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {inc.recentTelemetry.slice(0, 5).map((t, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="p-3 text-gray-500">{new Date(t.recordedAt).toLocaleTimeString()}</td>
                          <td className="p-3">{t.poleCode}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${t.eventType === 'power_lost' ? 'bg-red-500/10 text-red-400' : t.eventType === 'power_restored' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{t.eventType}</span></td>
                          <td className="p-3 font-mono text-gray-400 text-[10px]">{t.voltage ? `${t.voltage}V` : '-'} / {t.batteryLevel ? `${t.batteryLevel}mV` : '-'} / {t.signalStrength ? `${t.signalStrength}dBm` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
