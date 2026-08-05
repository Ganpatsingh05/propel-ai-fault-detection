"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTickets, patchTicket } from "@/lib/api";
import { useState } from "react";
import toast from "react-hot-toast";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const { data: tickets, isLoading } = useQuery({ queryKey: ["tickets", status], queryFn: () => fetchTickets(status || undefined), refetchInterval: 15000 });

  const mutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: any }) => patchTicket(id, update),
    onSuccess: (data) => {
      toast.success(`Ticket ${data.id} marked as ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update ticket"),
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 skeleton" />)}</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Operations Queue</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage and resolve field tickets</p>
        </div>
        <div className="flex bg-[#12122a] border border-white/5 rounded-lg p-1">
          {["", "open", "in_progress", "pending_verification", "resolved", "closed"].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${status === s ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {tickets?.map(t => (
          <div key={t.id} className="card p-5 flex items-center justify-between group">
            <div className="flex items-start gap-4">
              <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${t.priority === 'critical' ? 'bg-red-500' : t.priority === 'high' ? 'bg-orange-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <span className="text-xs font-mono text-gray-500">TKT-{t.id.toString().padStart(4, '0')}</span>
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                </div>
                <h3 className="font-semibold text-gray-200">{t.incident.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{new Date(t.createdAt).toLocaleString()} • {t.assignedTo ? `Assigned to ${t.assignedTo}` : "Unassigned"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {t.status === "open" && <button onClick={() => mutation.mutate({ id: t.id, update: { status: "in_progress", assigned_to: "Field Team Alpha" } })} className="px-3 py-1.5 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded text-xs font-semibold">Assign Team</button>}
              {t.status === "in_progress" && <button onClick={() => mutation.mutate({ id: t.id, update: { status: "resolved" } })} className="px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded text-xs font-semibold">Mark Resolved</button>}
              {t.status === "resolved" && <button onClick={() => mutation.mutate({ id: t.id, update: { status: "pending_verification" } })} className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded text-xs font-semibold">Request Verification</button>}
              {t.status === "pending_verification" && <button onClick={() => mutation.mutate({ id: t.id, update: { status: "closed" } })} className="px-3 py-1.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 rounded text-xs font-semibold">Close Ticket</button>}
            </div>
          </div>
        ))}
        {tickets?.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No tickets found in this queue.</div>}
      </div>
    </div>
  );
}
