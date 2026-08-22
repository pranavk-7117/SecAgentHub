"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileSearch, Plus, Radar, ShieldAlert, WalletCards, Trash2, Lock } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui";
import { listScans } from "@/lib/api";

function agentLabel(agentId: string) {
  return agentId
    .replace("misconfiguration", "Misconfig")
    .replace("iam_risk", "IAM")
    .replace("compliance", "Compliance")
    .replace("attack_path", "Attack Path")
    .replace("ai_remediation", "AI Fix");
}

export default function DashboardPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadScans(); }, []);

  function loadScans() {
    setLoading(true);
    listScans()
      .then((data) => setScans(data.scans || []))
      .finally(() => setLoading(false));
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
      <div className="space-y-5">

        {/* Hero header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] p-5 sm:p-6 backdrop-blur">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/8 px-3 py-1 text-[11px] font-bold text-teal-400 uppercase tracking-widest">
              <Radar className="h-3 w-3" /> Terraform AWS Security
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Security Scans</h1>
            <p className="mt-1 text-[13px] text-slate-400">Upload infrastructure code, run AI agents, and review attack paths.</p>
          </div>
          <Link href="/scan/new" className="shrink-0">
            <Button><Plus className="h-4 w-4" /> New Scan</Button>
          </Link>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ShieldAlert,  label: "Scans",     value: scans.length,   color: "text-teal-400"   },
            { icon: FileSearch,   label: "Findings",  value: totalFindings,  color: "text-amber-400"  },
            { icon: WalletCards,  label: "x402",      value: "Testnet",      color: "text-violet-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Scan list */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">

          {/* Desktop table header */}
          <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_2fr_1.2fr_auto] gap-3 px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
            {["File","Status","Findings","Agents","Created",""].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="h-7 w-7 rounded-lg bg-white/[0.06] shrink-0"/>
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-48 rounded bg-white/[0.07]"/>
                    <div className="h-2.5 w-32 rounded bg-white/[0.04]"/>
                  </div>
                  <div className="h-5 w-16 rounded-full bg-white/[0.06]"/>
                  <div className="h-5 w-20 rounded-full bg-white/[0.04]"/>
                </div>
              ))}
            </div>
          ) : scans.length ? (
            <div className="divide-y divide-white/[0.04]">
              {scans.map((scan) => {
                const success   = !!scan.agents_run?.length;
                const findings  = scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0;
                const dateStr   = new Date(scan.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" });
                const timeStr   = new Date(scan.created_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });

                return (
                  <div key={scan.id} className="hover:bg-white/[0.02] transition">

                    {/* ── Desktop row ── */}
                    <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_2fr_1.2fr_auto] gap-3 items-center px-5 py-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-800 border border-white/5">
                          <FileSearch className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                        <span className="text-[13px] font-semibold text-white truncate">{scan.filename}</span>
                      </div>
                      <div>
                        {success
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Success</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-red-400"/>Failed</span>}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">{findings} findings</span>
                      </div>
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {scan.agents_run?.length ? scan.agents_run.slice(0, 3).map((agent: string) => (
                          <span key={agent} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">{agentLabel(agent)}</span>
                        )) : <span className="text-[12px] text-slate-600">None</span>}
                        {(scan.agents_run?.length ?? 0) > 3 && <span className="text-[10px] text-slate-500">+{scan.agents_run.length - 3}</span>}
                      </div>
                      <span className="text-[12px] text-slate-500">{dateStr} · {timeStr}</span>
                      <div className="flex items-center justify-end gap-3">
                        {success
                          ? <Link href={`/scan/${scan.id}/results`} className="flex items-center gap-1 text-[12px] font-bold text-teal-400 hover:text-teal-300 transition">Open <ArrowUpRight className="h-3.5 w-3.5"/></Link>
                          : <span className="flex items-center gap-1 text-[12px] text-slate-600 cursor-not-allowed">Locked <Lock className="h-3.5 w-3.5"/></span>}
                        <button onClick={() => handleDelete(scan.id, scan.filename)} className="text-slate-600 hover:text-red-400 transition"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </div>

                    {/* ── Mobile card ── */}
                    <div className="md:hidden px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800 border border-white/5">
                            <FileSearch className="h-4 w-4 text-slate-400"/>
                          </span>
                          <span className="text-[14px] font-bold text-white truncate">{scan.filename}</span>
                        </div>
                        {success
                          ? <span className="shrink-0 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Success</span>
                          : <span className="shrink-0 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">Failed</span>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">{findings} findings</span>
                        <span className="text-[11px] text-slate-500">{dateStr}</span>
                        {scan.agents_run?.slice(0, 2).map((agent: string) => (
                          <span key={agent} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">{agentLabel(agent)}</span>
                        ))}
                        {(scan.agents_run?.length ?? 0) > 2 && <span className="text-[10px] text-slate-500">+{scan.agents_run.length - 2} more</span>}
                      </div>

                      <div className="flex items-center justify-end gap-4">
                        {success
                          ? <Link href={`/scan/${scan.id}/results`} className="flex items-center gap-1 text-[13px] font-bold text-teal-400">Open <ArrowUpRight className="h-3.5 w-3.5"/></Link>
                          : <span className="flex items-center gap-1 text-[13px] text-slate-600"><Lock className="h-3.5 w-3.5"/>Locked</span>}
                        <button onClick={() => handleDelete(scan.id, scan.filename)} className="text-slate-600 hover:text-red-400 transition"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/15">
                <FileSearch className="h-7 w-7 text-teal-400"/>
              </div>
              <div>
                <p className="text-base font-bold text-white">No scans yet</p>
                <p className="mt-1 text-[13px] text-slate-500 max-w-xs">Upload a Terraform file to get started.</p>
              </div>
              <Link href="/scan/new"><Button><Plus className="h-4 w-4"/>Upload Terraform</Button></Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
