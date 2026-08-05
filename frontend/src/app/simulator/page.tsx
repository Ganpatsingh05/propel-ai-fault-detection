"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runSimulation, type ScenarioType } from "@/lib/api";
import type { SimulationResult } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const SCENARIOS: { type: ScenarioType; label: string; desc: string; icon: string; color: string }[] = [
  { type: "span", label: "Span Fault", desc: "Midpoint break, downstream poles dark", icon: "⚡", color: "text-red-500 bg-red-500/10" },
  { type: "transformer", label: "Transformer Fault", desc: "All poles on transformer go dark", icon: "🏢", color: "text-orange-500 bg-orange-500/10" },
  { type: "feeder", label: "Feeder Fault", desc: "Entire feeder goes offline", icon: "🏭", color: "text-purple-500 bg-purple-500/10" },
  { type: "device", label: "Device Failure", desc: "Single device dies, neighbors alive", icon: "📡", color: "text-yellow-500 bg-yellow-500/10" },
  { type: "outage", label: "Scheduled Outage", desc: "Planned maintenance (suppressed)", icon: "🔧", color: "text-blue-500 bg-blue-500/10" },
  { type: "restore", label: "Power Restoration", desc: "Restores power and resolves tickets", icon: "🔋", color: "text-green-500 bg-green-500/10" },
];

export default function SimulatorPage() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SimulationResult | null>(null);

  const mutation = useMutation({
    mutationFn: (type: ScenarioType) => runSimulation(type),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Simulation complete");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err: any) => {
      setResult(null);
      toast.error(err.message || "Simulation failed");
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-xl font-bold text-white">Fault Simulator</h1>
        <p className="text-xs text-gray-500 mt-0.5">Inject deterministic scenarios into the telemetry pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {SCENARIOS.map(s => (
          <button key={s.type} onClick={() => mutation.mutate(s.type)} disabled={mutation.isPending}
            className={`card p-5 text-left transition-all ${mutation.isPending ? "opacity-50 cursor-not-allowed" : "hover:border-white/20 hover:bg-white/[0.02]"}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${s.color} text-xl flex-shrink-0`}>{s.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-200">{s.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                <div className="mt-3 text-[10px] font-bold tracking-widest uppercase text-indigo-400">Inject →</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-12 text-center">
            <span className="pulse-ring inline-block h-4 w-4 bg-indigo-500 rounded-full mb-4" />
            <p className="text-gray-400 text-sm animate-pulse">Running telemetry simulation through pipeline...</p>
          </motion.div>
        )}

        {result && !mutation.isPending && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 border-indigo-500/30 bg-[#0c0c1d]">
            <h2 className="text-lg font-bold text-white mb-2">Simulation Result</h2>
            <p className="text-sm text-gray-400 mb-6">{result.description}</p>
            
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-[#12122a] p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-500 uppercase">Events Generated</p><p className="text-2xl font-bold mt-1 text-white">{result.eventsGenerated}</p></div>
              <div className="bg-[#12122a] p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-500 uppercase">Detection Result</p><p className={`text-xl font-bold mt-2 capitalize ${result.summary.decision === 'fault_detected' ? 'text-red-400' : 'text-green-400'}`}>{result.summary.decision?.replace("_", " ") || "None"}</p></div>
              <div className="bg-[#12122a] p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-500 uppercase">Incidents Created</p><p className="text-2xl font-bold mt-1 text-white">{result.summary.incidentIds.length}</p></div>
              <div className="bg-[#12122a] p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-500 uppercase">Tickets Raised</p><p className="text-2xl font-bold mt-1 text-white">{result.summary.ticketIds.length}</p></div>
            </div>

            <h3 className="text-sm font-semibold text-gray-300 mb-3 border-b border-white/5 pb-2">Pipeline Trace (Chronological)</h3>
            <div className="space-y-2">
              {result.events.map((e, i) => (
                <div key={i} className="flex items-stretch gap-4 bg-white/[0.02] border border-white/5 rounded-lg p-3 text-xs">
                  <div className="w-16 flex flex-col justify-center text-gray-500 font-mono text-[10px]">SEQ_{String(e.payload.seq).padStart(4, '0')}</div>
                  <div className="w-48 border-l border-white/5 pl-4">
                    <p className="font-semibold text-gray-300">{(e.payload.pole_id as string)}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] inline-block mt-1 ${e.payload.event === 'power_lost' ? 'bg-red-500/10 text-red-400' : e.payload.event === 'power_restored' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{e.payload.event as string}</span>
                  </div>
                  <div className="flex-1 border-l border-white/5 pl-4">
                    {e.error ? (
                      <p className="text-red-400 font-mono text-[10px] mt-1">{e.error}</p>
                    ) : e.result ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-gray-500">Classifier: </span><span className="text-gray-200">{e.result.detection.decision}</span></div>
                        <div><span className="text-gray-500">Fault: </span><span className="text-gray-200">{e.result.detection.faultType || "N/A"}</span></div>
                        <div className="col-span-2 text-[10px] text-gray-400 mt-1 font-mono break-words">{e.result.detection.reason}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
