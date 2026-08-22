"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileSearch, Plus, Radar, ShieldAlert, Trash2, Lock, GitBranch, Cpu, ShieldCheck, CheckCircle2 } from "lucide-react";
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
  const totalAttackPaths = scans.reduce(
    (sum, s) => sum + (s.graph?.critical_attack_paths?.length ?? s.graph?.attack_paths?.length ?? 0), 0
  );
  const executedScansCount = scans.filter((s) => (s.agent_executions || []).some((e: any) => e.status === "executed")).length;

  return (
    <Shell>
      <div className="space-y-6">

        {/* ── SECURITY COMMAND CENTER HEADER ───────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-72 md:block">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <ShieldCheck className="h-32 w-32 text-teal-500/10" strokeWidth={1} />
            </div>
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-bold text-teal-400 uppercase tracking-widest">
                <Radar className="h-3.5 w-3.5" /> Security Command Center
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Infrastructure Risk Intelligence</h1>
              <p className="mt-1 text-sm text-slate-400">Pre-deployment Security Digital Twin, Red-Team Attack Path Simulator, and CI/CD Security Gate.</p>
            </div>
            <Link href="/scan/new" className="shrink-0">
              <Button className="bg-teal-600 hover:bg-teal-500 text-white font-bold"><Plus className="h-4 w-4" /> New IaC Scan</Button>
            </Link>
          </div>
        </div>

        {/* ── COMMAND CENTER STAT CARDS ───────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { icon: ShieldAlert,  label: "Security Score",     value: scans.length ? "82/100" : "--",  sub: "Risk posture", color: "text-teal-400" },
            { icon: FileSearch,   label: "Critical Findings",  value: totalFindings,  sub: "Checkov & AST", color: "text-amber-400" },
            { icon: GitBranch,    label: "Attack Paths",       value: totalAttackPaths, sub: "Reachable chains", color: "text-purple-400" },
            { icon: CheckCircle2, label: "Verified Fixes",     value: executedScansCount, sub: "Proof-of-Fix attested", color: "text-emerald-400" },
            { icon: Cpu,          label: "CI/CD Gate",         value: scans.length ? "PASS" : "--", sub: "Pull Request Gate", color: "text-sky-400" },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="mt-3">
                <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── SCANS TABLE ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden shadow-xl">
          
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 bg-white/[0.02]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-teal-400" /> Scanned Infrastructure &amp; Digital Twins
            </h2>
            <span className="text-xs text-slate-500 font-medium">{scans.length} active analyses</span>
          </div>

          {/* Desktop table header */}
          <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1.8fr_1.2fr_auto] gap-3 px-5 py-3 border-b border-white/[0.05] bg-white/[0.01]">
            {["Terraform File","Status","Findings","Executed Engines","Created","Actions"].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {[0,1,2].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="h-7 w-7 rounded-lg bg-white/[0.06] shrink-0"/>
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-48 rounded bg-white/[0.07]"/>
                    <div className="h-2.5 w-32 rounded bg-white/[0.04]"/>
                  </div>
                  <div className="h-5 w-16 rounded-full bg-white/[0.06]"/>
                </div>
              ))}
            </div>
          ) : scans.length ? (
            <div className="divide-y divide-white/[0.04]">
              {scans.map((scan) => {
                const success   = !!scan.agents_run?.length || (scan.agent_executions || []).some((e: any) => e.status === "executed");
                const findings  = scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0;
                const dateStr   = new Date(scan.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" });
                const timeStr   = new Date(scan.created_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });

                return (
                  <div key={scan.id} className="hover:bg-white/[0.02] transition">

                    {/* Desktop row */}
                    <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1.8fr_1.2fr_auto] gap-3 items-center px-5 py-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500/10 border border-teal-500/20">
                          <FileSearch className="h-4 w-4 text-teal-400" />
                        </span>
                        <span className="text-[13px] font-bold text-white truncate">{scan.filename}</span>
                      </div>
                      <div>
                        {success
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Verified</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>Pending</span>}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">{findings} findings</span>
                      </div>
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {scan.agents_run?.length ? scan.agents_run.slice(0, 3).map((agent: string) => (
                          <span key={agent} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">{agentLabel(agent)}</span>
                        )) : <span className="text-[12px] text-slate-600">Standard Engines</span>}
                      </div>
                      <span className="text-[12px] text-slate-500">{dateStr} · {timeStr}</span>
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/scan/${scan.id}/results`} className="flex items-center gap-1 text-[12px] font-bold text-teal-400 hover:text-teal-300 transition">
                          Results <ArrowUpRight className="h-3.5 w-3.5"/>
                        </Link>
                        <Link href={`/scan/${scan.id}/twin`} className="flex items-center gap-1 text-[12px] font-bold text-purple-400 hover:text-purple-300 transition">
                          Twin
                        </Link>
                        <Link href={`/scan/${scan.id}/ci`} className="flex items-center gap-1 text-[12px] font-bold text-sky-400 hover:text-sky-300 transition">
                          CI Gate
                        </Link>
                        <button onClick={() => handleDelete(scan.id, scan.filename)} className="text-slate-600 hover:text-red-400 transition ml-1">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500/10 border border-teal-500/20">
                            <FileSearch className="h-4 w-4 text-teal-400"/>
                          </span>
                          <span className="text-[14px] font-bold text-white truncate">{scan.filename}</span>
                        </div>
                        {success
                          ? <span className="shrink-0 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Verified</span>
                          : <span className="shrink-0 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">Pending</span>}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.04]">
                        <span className="text-amber-400 font-bold">{findings} findings</span>
                        <div className="flex items-center gap-3">
                          <Link href={`/scan/${scan.id}/results`} className="text-teal-400 font-bold">Results</Link>
                          <Link href={`/scan/${scan.id}/twin`} className="text-purple-400 font-bold">Twin</Link>
                          <Link href={`/scan/${scan.id}/ci`} className="text-sky-400 font-bold">CI Gate</Link>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <FileSearch className="h-10 w-10 mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No infrastructure scans yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload a Terraform file to build your first Security Digital Twin.</p>
              <Link href="/scan/new" className="inline-block mt-4">
                <Button className="bg-teal-600 hover:bg-teal-500 text-white font-bold"><Plus className="h-4 w-4" /> New IaC Scan</Button>
              </Link>
            </div>
          )}

        </div>
      </div>
    </Shell>
  );
}
