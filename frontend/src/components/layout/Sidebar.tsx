"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/incidents", label: "Incidents", icon: "🔴" },
  { href: "/tickets", label: "Tickets", icon: "🎫" },
  { href: "/simulator", label: "Simulator", icon: "🧪" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-white/5 bg-[#0c0c1d]">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-white/5">
        <span className="text-xl">⚡</span>
        <div>
          <h1 className="text-sm font-bold tracking-wide text-white">PROPEL AI</h1>
          <p className="text-[10px] text-gray-500 tracking-widest">FAULT DETECTION</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-indigo-500"
                  />
                )}
                <span className="text-base">{n.icon}</span>
                <span className="font-medium">{n.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 px-4 py-3">
        <p className="text-[10px] text-gray-600 text-center">v1.0 • Rule Engine</p>
      </div>
    </aside>
  );
}
