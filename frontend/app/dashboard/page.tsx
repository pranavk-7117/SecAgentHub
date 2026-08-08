"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight, FileSearch, Plus, Radar, ShieldAlert,
  WalletCards, Trash2, Lock, ShieldCheck, Activity, AlertTriangle
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { listScans } from "@/lib/api";

function agentLabel(agentId: string) {
  return agentId
    .replace("misconfiguration", "Misconfig")
    .replace("iam_risk", "IAM")
    .replace("compliance", "Compliance")
    .replace("attack_path", "Attack Path")
    .replace("ai_remediation", "AI Fix");
}

const AGENT_COLORS: Record<string, string> = {
  misconfiguration: "bg-teal-500/15 text-teal-300 border-teal-500/25",
  iam_risk:         "bg-violet-500/15 text-violet-300 border-violet-500/25",
  compliance:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  attack_path:      "bg-amber-500/15 text-amber-300 border-amber-500/25",
  ai_remediation:   "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
};

export default function DashboardPage() {
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => { loadScans(); }, []);

  function loadScans() {
    listScans().then((data) => setScans(data.scans || []));
  }

  async function handleDelete(scanId: string, filename: string) {
    if (!window.confirm(`Delete scan "${filename}"?`)) return;
    try {
      const { deleteScan } = await import("@/lib/api");
      await deleteScan(scanId);
      loadScans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete scan");
    }
  }

  const totalFindings = scans.reduce(
    (sum, s) => sum + (s.findings_summary?.failed_count ?? s.raw_checkov_json?.results?.failed_checks?.length ?? 0), 0
  );

  return (
    <Shell>
      <div className="space-y-6">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0d1117] to-[#0a0f14] p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-teal-500/8 blur-[80px] rounded-full" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 bg-violet-500/6 blur-[60px] rounded-full" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/8 px-3 py-1 text-[11px] font-bold text-teal-400 uppercase tracking-widest">
                <Radar className="h-3 w-3" />
                Terraform AWS Security
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Security Scans</h1>
              <p className="mt-2 max-w-xl text-[14px] text-slate-400 leading-relaxed">
                Upload infrastructure code, run specialist AI security agents, and review attack paths in one focused workspace.
              </p>
            </div>
            <Link href="/scan/new" className="shrink-0">
              <button className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[14px] font-black px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition whitespace-nowrap">
                <Plus className="h-4 w-4" /> New Scan
              </button>
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldAlert,  label: "Total Scans",    value: scans.length,   color: "text-teal-400",    ring: "bg-teal-500/10 border-teal-500/20" },
            { icon: AlertTriangle,label: "Open Findings",  value: totalFindings,  color: "text-amber-400",   ring: "bg-amber-500/10 border-amber-500/20" },
            { icon: WalletCards,  label: "Payment Mode",   value: "x402 Testnet", color: "text-violet-400",  ring: "bg-violet-500/10 border-violet-500/20" },
          ].map(({ icon: Icon, label, value, color, ring }) => (
            <div key={label} className="flex items-center gap-4 border border-white/[0.06] bg-white/[0.02] rounded-xl px-5 py-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${ring}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </span>
              <div>
                <p className="text-[12px] text-slate-500 font-medium">{label}</p>
                <p className={`text-2xl font-black leading-none mt-1 ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Scans table / list */}
        <div className="border border-white/[0.06] bg-white/[0.015] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_auto] gap-4 items-center px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
            {["File","Status","Findings","Agents Used","Created",""].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</span>
            ))}
          </div>

          {scans.length ? (
            <div className="divide-y divide-white/[0.04]">
              {scans.map((scan) => {
                const success   = !!scan.agents_run?.length;
                const findings  = scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0;
                const dateStr   = new Date(scan.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

                return (
                  <div key={scan.id} className="group hover:bg-white/[0.02] transition">
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_2fr_1fr_auto] gap-4 items-center px-5 py-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-800 border border-white/5">
                          <FileSearch className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                        <span className="text-[13px] font-semibold text-white truncate">{scan.filename}</span>
                      </div>
                      <div>
                        {success ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />Failed
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                          {findings} findings
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {scan.agents_run?.length ? scan.agents_run.map((agent: string) => {
                          const exec = scan.agent_executions?.find((e: any) => e.agent_id === agent);
                          const isMainnet = exec?.network === "mainnet";
                          return (
                            <div key={agent} className="flex items-center gap-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${AGENT_COLORS[agent] || "bg-slate-500/10 text-slate-300 border-slate-500/20"}`}>
                                {agentLabel(agent)}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${isMainnet ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"}`}>
                                {isMainnet ? "Main" : "Test"}
                              </span>
                            </div>
                          );
                        }) : <span className="text-[12px] text-slate-600">None</span>}
                      </div>
                      <span className="text-[12px] text-slate-500">{dateStr}</span>
                      <div className="flex items-center justify-end gap-3">
                        {success ? (
                          <Link href={`/scan/${scan.id}/results`} className="flex items-center gap-1 text-[12px] font-bold text-teal-400 hover:text-teal-300 transition">
                            Open <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-slate-600 cursor-not-allowed" title="Run agents to unlock">
                            Locked <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <button onClick={() => handleDelete(scan.id, scan.filename)} className="text-slate-600 hover:text-red-400 transition" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="sm:hidden px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800 border border-white/5">
                            <FileSearch className="h-4 w-4 text-slate-400" />
                          </span>
                          <span className="text-[14px] font-bold text-white truncate">{scan.filename}</span>
                        </div>
                        {success ? (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Success</span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Failed</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{findings} findings</span>
                        <span className="text-[11px] text-slate-500">{dateStr}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {scan.agents_run?.slice(0,2).map((agent: string) => (
                            <span key={agent} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${AGENT_COLORS[agent] || "bg-slate-500/10 text-slate-300 border-slate-500/20"}`}>
                              {agentLabel(agent)}
                            </span>
                          ))}
                          {(scan.agents_run?.length ?? 0) > 2 && <span className="text-[10px] text-slate-500">+{scan.agents_run.length - 2} more</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {success ? (
                            <Link href={`/scan/${scan.id}/results`} className="flex items-center gap-1 text-[12px] font-bold text-teal-400">
                              Open <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1 text-[12px] text-slate-600"><Lock className="h-3.5 w-3.5" />Locked</span>
                          )}
                          <button onClick={() => handleDelete(scan.id, scan.filename)} className="text-slate-600 hover:text-red-400 transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-500/10 border border-teal-500/15">
                <FileSearch className="h-8 w-8 text-teal-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">No scans yet</p>
                <p className="mt-1 max-w-sm text-[13px] text-slate-500 leading-relaxed">Start with a Terraform file and SecAgent Hub will build findings, agent options, and an attack graph.</p>
              </div>
              <Link href="/scan/new">
                <button className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-[#07090f] text-[13px] font-black px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition">
                  <Plus className="h-4 w-4" /> Upload Terraform
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
