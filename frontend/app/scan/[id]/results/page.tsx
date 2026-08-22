"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  AlertTriangle,
  Brain,
  ChevronRight,
  Download,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  Target,
  Lock,
  Trash2,
  Maximize2,
  GitBranch,
  Cpu,
  ShieldAlert,
} from "lucide-react";
import { RiskGraph } from "@/components/RiskGraph";
import { Shell } from "@/components/Shell";
import { API_BASE, askScan, getScan, deleteScan } from "@/lib/api";
import { Badge, Button, Card, Input, Table } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { ProofOfFixPanel } from "@/components/ProofOfFixPanel";



export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [scan, setScan] = useState<any>();
  const [severity, setSeverity] = useState("ALL");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<number>>(new Set());

  useEffect(() => {
    getScan(params.id).then(setScan);
    // Fast refresh — poll every 4s until agents have run
    const timer = setInterval(() => {
      getScan(params.id).then((data) => {
        setScan(data);
        const done = (data?.agent_executions || []).some((e: any) => e.status === "executed");
        if (done) clearInterval(timer);
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [params.id]);

  const findings = useMemo(() => {
    const rows = scan?.raw_checkov_json?.results?.failed_checks || [];
    return severity === "ALL" ? rows : rows.filter((finding: any) => (finding.severity || "UNKNOWN").toUpperCase() === severity);
  }, [scan, severity]);

  async function sendQuestion() {
    if (!question.trim() || asking) return;
    setAsking(true);
    try {
      const result = await askScan(params.id, question);
      setAnswer(result.answer);
    } finally {
      setAsking(false);
    }
  }

  async function handleDeleteScan() {
    if (!window.confirm("Are you sure you want to delete this scan and all its execution receipts permanently?")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteScan(params.id);
      router.push("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete scan");
      setDeleting(false);
    }
  }

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`${API_BASE}/api/v1/scan/${params.id}/report`, { headers });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ detail: "Failed to download report" }));
        throw new Error(payload.detail || "Failed to download report");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secagent-${params.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download report");
    } finally {
      setDownloading(false);
    }
  }


  if (!scan) {
    return (
      <Shell>
        <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6">
          {/* Skeleton header */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 animate-pulse">
            <div className="h-4 w-24 rounded-full bg-white/[0.06] mb-4"/>
            <div className="h-8 w-64 rounded-lg bg-white/[0.08] mb-3"/>
            <div className="h-3 w-48 rounded bg-white/[0.04]"/>
          </div>
          {/* Skeleton stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 animate-pulse">
                <div className="h-9 w-9 rounded-xl bg-white/[0.06] mb-3"/>
                <div className="h-3 w-20 rounded bg-white/[0.04] mb-2"/>
                <div className="h-10 w-16 rounded-lg bg-white/[0.08]"/>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] h-48 animate-pulse flex items-center justify-center">
            <p className="text-slate-500 text-sm">Loading scan data…</p>
          </div>
        </div>
      </Shell>
    );
  }

  const allFindings = scan?.raw_checkov_json?.results?.failed_checks || [];
  // Use findings_summary (computed fresh by backend) as primary source for pass count
  // This ensures correctness even for scans saved before the --quiet fix
  const failCount = scan?.findings_summary?.failed_count ?? allFindings.length;
  const passCount = scan?.findings_summary?.passed_count ?? (scan?.raw_checkov_json?.results?.passed_checks?.length ?? 0);
  const totalChecks = passCount + failCount;
  const passRatio = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;
  const risk = scan.graph?.blast_radius_score ?? 0;
  const attackPathsCount = scan.graph?.critical_attack_paths?.length ?? 0;
  const executedAgents = (scan.agent_executions || []).filter((row: any) => row.status === "executed" && row.output_data);
  const executedAgentIds = executedAgents.map((row: any) => row.agent_id);

  // Graph stats
  const nodeCount = scan.graph?.nodes?.length ?? 10;
  const edgeCount = scan.graph?.edges?.length ?? 16;

  if (executedAgents.length === 0) {
    return (
      <Shell>
        <div style={{ background: "#07090f" }} className="min-h-screen p-4 md:p-8">
          <div className="max-w-2xl mx-auto my-12 text-center rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] backdrop-blur shadow-xl p-10">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <Lock className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Scan Results Locked</h2>
            <p className="mt-3 text-slate-400">
              No successful agent executions have been verified for this scan. Select and run at least one agent from the dashboard to unlock findings, remediation guidance, and compliance reports.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
              <Link href={`/scan/${scan.id}/agents`}>
                <Button className="bg-slate-800 hover:bg-slate-900 text-white border-none">Configure &amp; Pay Agents</Button>
              </Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }


  return (
    <Shell>
      <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6">

        {/* ── HEADER CARD ────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur">
          {/* Decorative shield glow (desktop only) */}
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-72 md:block">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-teal-500/10 blur-3xl scale-150" />
                <ShieldCheck className="relative h-32 w-32 text-teal-500/20" strokeWidth={1} />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 min-w-0">
              {/* Scan ID badge */}
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-400 tracking-wide">
                SCAN ID &nbsp;{String(scan.id).slice(0, 8)}
              </div>
              {/* Filename */}
              <h1 className="text-3xl font-bold tracking-tight text-white truncate">{scan.filename}</h1>
              <p className="mt-2 text-sm text-slate-400">Attack graph, agent findings, remediation guidance, and x402 receipts.</p>
              {/* Agent badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {executedAgentIds.length
                  ? executedAgentIds.map((agentId: string) => {
                      const exec = scan.agent_executions?.find((e: any) => e.agent_id === agentId);
                      const isMainnet = exec?.network === "mainnet";
                      return (
                        <div key={agentId} className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400">
                            {agentLabel(agentId)}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isMainnet ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-sky-500/30 bg-sky-500/10 text-sky-400"}`}>
                            {isMainnet ? "MainNet" : "TestNet"}
                          </span>
                        </div>
                      );
                    })
                  : (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                      No agents executed yet
                    </span>
                  )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 flex-wrap items-center gap-3 self-start">
              <Link href={`/scan/${scan.id}/twin`}>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3.5 py-2 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/20 shadow-lg shadow-teal-500/10">
                  <Cpu className="h-4 w-4 text-teal-400" />
                  Digital Twin &amp; Simulation
                </button>
              </Link>

              <Link href={`/scan/${scan.id}/ci`}>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3.5 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20 shadow-lg shadow-purple-500/10">
                  <GitBranch className="h-4 w-4 text-purple-400" />
                  CI/CD Security Gate
                </button>
              </Link>

              {executedAgents.length === 0 ? (
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-500 opacity-50 cursor-not-allowed"
                >
                  <Lock className="h-4 w-4" /> Locked
                </button>
              ) : (
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4 text-slate-400" />
                  {downloading ? "Downloading…" : "Download Report"}
                </button>
              )}
              <button
                onClick={handleDeleteScan}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting…" : "Delete Scan"}
              </button>
            </div>

          </div>
        </div>

        {/* ── 5-STAGE SECURITY WORKFLOW STRIP ──────────────────────── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 flex items-center justify-between overflow-x-auto gap-2">
          {[
            { stage: "① UNDERSTAND",    desc: "IaC → Scan → Digital Twin",         active: true,  done: true  },
            { stage: "② ATTACK",        desc: "Attack Paths → Evidence",            active: true,  done: true  },
            { stage: "③ EXPERIMENT",    desc: "What-If → Counterfactual",           active: false, done: false },
            { stage: "④ FIX",           desc: "Optimize → AI Patch → Verify",      active: false, done: false },
            { stage: "⑤ ENFORCE",       desc: "Proof-of-Fix → CI/CD Gate",          active: false, done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className={`flex flex-col items-center text-center px-4 py-2 rounded-xl border transition-all ${
                s.done ? "border-teal-500/40 bg-teal-500/10" :
                "border-white/[0.05] bg-white/[0.02] opacity-50"
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${s.done ? "text-teal-400" : "text-slate-500"}`}>{s.stage}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 whitespace-nowrap">{s.desc}</p>
              </div>
              {i < 4 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
            </div>
          ))}
          <Link href={`/scan/${scan.id}/twin`} className="shrink-0 ml-2">
            <button className="text-[10px] font-bold text-teal-400 border border-teal-500/30 bg-teal-500/10 px-3 py-2 rounded-lg hover:bg-teal-500/20 transition whitespace-nowrap">
              Open Twin →
            </button>
          </Link>
        </div>

        {/* ── COMPLIANCE: AGENT BREAKDOWN ───────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Overall Risk */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20">
                <Target className="h-4 w-4 text-red-400" />
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${risk >= 70 ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
                {risk >= 70 ? "Critical" : "Watch"}
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overall Risk</p>
            <p className="mt-1 text-4xl font-bold text-white">{risk}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${Math.min(100, risk)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Severe security issues detected</p>
          </div>

          {/* Findings */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Findings</p>
            <p className="mt-1 text-4xl font-bold text-white">{scan.findings_summary?.failed_count ?? allFindings.length}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: `${Math.min(100, (scan.findings_summary?.failed_count ?? allFindings.length) * 5)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Across attack graph &amp; agents</p>
          </div>

          {/* Pass / Fail Ratio */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 shadow-lg shadow-black/20">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                passRatio >= 60
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}>
                {passRatio >= 60 ? "Healthy" : "At Risk"}
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Pass / Fail Ratio</p>
            <p className="mt-1 text-3xl font-bold text-white">{passRatio}%</p>
            {/* Split progress bar: green = pass, red = fail */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06] flex">
              <div className="h-full rounded-l-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${passRatio}%` }} />
              <div className="h-full rounded-r-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${100 - passRatio}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400">{passCount} passed</span>
              <span className="text-[11px] font-semibold text-red-400">{failCount} failed</span>
            </div>
          </div>

          {/* Attack Paths */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-5 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                <GitBranch className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Attack Paths</p>
            <p className="mt-1 text-4xl font-bold text-white">{attackPathsCount}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400" style={{ width: `${Math.min(100, attackPathsCount * 20)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Critical paths identified</p>
          </div>
        </section>

        {/* ── ATTACK SURFACE MAP + CRITICAL ATTACK PATHS ──────────────── */}
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">

          {/* Graph card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-xl shadow-black/30 overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
              <div>
                <h2 className="text-base font-bold text-white">Attack Surface Map</h2>
                <p className="text-xs text-slate-500">{nodeCount} resources, {edgeCount} relationships</p>
              </div>
            </div>
            <div className="h-[460px] md:h-[520px]">
              <RiskGraph graph={scan.graph} />
            </div>
          </div>

          {/* Critical Attack Paths card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-xl shadow-black/30 flex flex-col overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
              <h2 className="text-base font-bold text-white">Critical Attack Paths</h2>
              <p className="mt-0.5 text-xs text-slate-500">Top reachable chains highlighted for triage</p>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {(scan.graph?.critical_attack_paths || []).map((path: string[], index: number) => {
                const steps = Array.isArray(path) ? path : String(path).split(" → ");
                const isExpanded = expandedPaths.has(index);
                const first = steps[0];
                const last = steps[steps.length - 1];
                return (
                  <div
                    key={index}
                    onClick={() => setExpandedPaths(prev => {
                      const next = new Set(prev);
                      isExpanded ? next.delete(index) : next.add(index);
                      return next;
                    })}
                    className="group cursor-pointer rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 transition hover:bg-red-500/[0.09] hover:border-red-500/30"
                  >
                    {isExpanded ? (
                      <div className="space-y-1">
                        {steps.map((step: string, si: number) => (
                          <div key={si} className="flex items-start gap-2">
                            <span className="text-[10px] font-bold text-red-400/60 mt-0.5 shrink-0">{String(si + 1).padStart(2, "0")}</span>
                            <span className="text-xs text-red-300 break-all leading-snug">{step}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-300 truncate">{first}</p>
                          {steps.length > 2 && (
                            <p className="text-[10px] text-red-400/50 mt-0.5">{steps.length - 2} intermediate steps</p>
                          )}
                          <p className="text-xs text-red-400 truncate">{last}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-red-400/40 group-hover:text-red-400/70 transition" />
                      </div>
                    )}
                  </div>
                );
              })}
              {!scan.graph?.critical_attack_paths?.length && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3.5 text-sm font-medium text-emerald-400">
                  ✓ No public attack path detected.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── AI PROOF-OF-FIX REMEDIATION SECTION ──────────────────────── */}
        <ProofOfFixPanel scanId={scan.id} />

        {/* ── FINDINGS + AI CHAT ────────────────────────────────────────── */}
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Findings table */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-xl shadow-black/30 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
              <div>
                <h2 className="text-base font-bold text-white">Findings</h2>
                <p className="text-xs text-slate-500">{findings.length} {severity === "ALL" ? "total" : severity.toLowerCase()} issues</p>
              </div>
              <select
                className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
              >
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"].map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL" ? "All Findings" : item}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full">
                <tbody>
                  {findings.map((finding: any, index: number) => (
                    <tr
                      key={`${finding.check_id}-${index}`}
                      className="group border-t border-white/[0.04] align-middle transition hover:bg-white/[0.03]"
                    >
                      <td className="w-36 px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <SeverityBadge severity={finding.severity || "LOW"} />
                          {finding.category && (
                            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              {finding.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm font-semibold text-slate-200">{finding.check_id}</p>
                        <p className="mt-0.5 text-xs text-slate-500 leading-snug">{finding.check_name}</p>
                        {finding.resource && (
                          <p className="mt-0.5 text-[10px] font-mono text-teal-500/70 truncate">{finding.resource}</p>
                        )}
                      </td>
                      {finding.resource_count != null && (
                        <td className="py-3 pr-4 text-right">
                          <span className="text-xs font-medium text-amber-400">
                            Detected in {finding.resource_count} resource{finding.resource_count !== 1 ? "s" : ""}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                  {findings.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                        No findings for the selected severity.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Remediation Chat */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-xl shadow-black/30 p-5 flex flex-col">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <MessageSquare className="h-4 w-4 text-teal-400" />
                AI Remediation Chat
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Ask about this scan or any finding.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={question}
                placeholder="e.g. impact, exploitability, Terraform fix…"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") sendQuestion(); }}
                className="flex-1"
              />
              <button
                onClick={sendQuestion}
                disabled={asking || !question.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-bold text-teal-400 transition hover:bg-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {asking ? (
                  <><span className="h-4 w-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"/> Asking…</>
                ) : "Ask"}
              </button>
            </div>
            {answer ? (
              <div className="mt-4 flex-1 max-h-80 overflow-auto rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300">
                <Markdown content={answer} />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-xs text-slate-500 space-y-2">
                <p className="font-medium text-slate-400">Try asking:</p>
                {["What is the blast radius of the IAM misconfiguration?","Give me a Terraform fix for the open security group.","Which finding should I fix first?"].map(q => (
                  <button key={q} onClick={() => { setQuestion(q); }} className="block text-left w-full text-[11px] text-teal-400/70 hover:text-teal-400 transition truncate">
                    ↳ {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── AGENT ANALYSIS ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-xl shadow-black/30 overflow-hidden">
          <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Brain className="h-5 w-5 text-teal-400" />
              Agent Analysis
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Distinct outputs from the agents you paid for and executed.</p>
          </div>
          {executedAgents.length ? (
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {executedAgents.map((execution: any) => (
                <AgentOutput key={execution.id} execution={execution} />
              ))}
            </div>
          ) : (
            <div className="m-5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 text-sm text-slate-500">
              No agent output has been executed for this scan yet.
            </div>
          )}
        </div>

        {/* ── PAYMENT RECEIPTS ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-xl shadow-black/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
            <ReceiptText className="h-5 w-5 text-teal-400" />
            Payment Receipts
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <thead className="text-left text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {(scan.agent_executions || []).map((row: any) => {
                  const receipt = row.output_data?.x402_receipt || {};
                  const verifiedBy = receipt.verified_by || (row.tx_hash?.startsWith("mock-") ? "GoPlausible x402 Facilitator (Mock)" : "GoPlausible x402 Facilitator");

                  return (
                    <tr key={row.id} className="border-t border-white/[0.04]">
                      <td className="py-3 pr-4 text-sm font-medium text-slate-200">{agentLabel(row.agent_id)}</td>
                      <td className="pr-4">
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          {row.status}
                        </span>
                      </td>
                      <td className="pr-4 text-sm text-slate-400">{row.amount_paid}</td>
                      <td className="py-3">
                        <div className="flex flex-col gap-1">
                          <a
                            className="font-mono text-xs text-teal-400 break-all hover:text-teal-300"
                            href={`https://testnet.explorer.perawallet.app/tx/${row.tx_hash}`}
                            target="_blank"
                          >
                            {row.tx_hash}
                          </a>
                          <span className="text-[11px] text-slate-500">
                            Verified by:{" "}
                            <span className="font-semibold text-teal-400">{verifiedBy}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>

      </div>
    </Shell>
  );
}

function AgentOutput({ execution }: { execution: any }) {
  const data = execution.output_data || {};
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 shadow-sm transition hover:border-teal-500/20 hover:bg-white/[0.05]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{data.agent || execution.agent_id}</h3>
          <p className="mt-1 text-xs text-slate-500">{data.summary || "Agent completed analysis."}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          {execution.status}
        </span>
      </div>
      {execution.agent_id === "misconfiguration" ? <MisconfigurationOutput data={data} /> : null}
      {execution.agent_id === "iam_risk" ? <IamOutput data={data} /> : null}
      {execution.agent_id === "compliance" ? <ComplianceOutput data={data} /> : null}
      {execution.agent_id === "attack_path" ? <AttackPathOutput data={data} /> : null}
      {execution.agent_id === "ai_remediation" ? <RemediationOutput data={data} /> : null}
    </div>
  );
}

function MisconfigurationOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {(data.exposures || []).map((item: any, index: number) => (
        <div key={index} className="rounded-lg border border-red-500/20 bg-red-500/[0.07] p-3 text-sm">
          <div className="font-semibold text-red-300">{item.issue}</div>
          <div className="mt-1 text-red-400/80 text-xs">{item.resource}</div>
        </div>
      ))}
      <ul className="space-y-2 text-sm text-slate-400">
        {(data.recommendations || []).map((item: string) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function IamOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3 text-sm">
      {(data.risks || []).map((risk: any, index: number) => (
        <div key={index} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] p-3">
          <div className="font-semibold text-amber-300">{risk.type}</div>
          <div className="mt-1 text-amber-400/80 text-xs">{risk.detail}</div>
        </div>
      ))}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-slate-400 text-xs">
        <span className="font-semibold text-slate-300">Privilege actions:</span>{" "}
        {(data.privilege_escalation_actions || []).join(", ") || "None detected"}
      </div>
    </div>
  );
}

function ComplianceOutput({ data }: { data: any }) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Object.entries(data.frameworks || {}).map(([name, score]) => (
          <div key={name} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <div className="text-lg font-semibold text-white">{String(score)}%</div>
            <div className="text-xs text-slate-500">{name}</div>
          </div>
        ))}
      </div>
      <div className="max-h-44 overflow-auto space-y-2">
        {(data.failed_controls || []).map((control: any, index: number) => (
          <div key={index} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-sm">
            <div className="font-semibold text-slate-200">{control.check_id}</div>
            <div className="text-xs text-slate-500">{(control.mapped_frameworks || []).join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttackPathOutput({ data }: { data: any }) {
  const paths = data.paths || [];
  return (
    <div className="space-y-3">
      {paths.slice(0, 4).map((path: any, index: number) => (
        <div key={index} className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-300">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500/20 text-xs text-red-400">
              {index + 1}
            </span>
            <span>{(path.path || []).join(" → ")}</span>
          </div>
          {(path.sequence || []).map((step: any) => (
            <div key={step.step} className="text-red-400/70 text-xs">
              {step.step}. {step.node}
            </div>
          ))}
        </div>
      ))}
      {paths.length > 4 ? (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs font-medium text-slate-500">
          + {paths.length - 4} additional paths included in the report.
        </div>
      ) : null}
      {!paths.length ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] p-3 text-sm text-emerald-400">
          No public attack path found.
        </div>
      ) : null}
    </div>
  );
}

function RemediationOutput({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Markdown content={data.explanation} />
      <pre className="max-h-56 overflow-auto rounded-xl border border-white/[0.07] bg-slate-950 p-3 text-xs text-slate-100 font-mono">
        {data.corrected_hcl}
      </pre>
      <ol className="space-y-1.5 text-sm text-slate-400 list-decimal pl-5">
        {(data.steps || []).map((step: string) => <li key={step}>{step}</li>)}
      </ol>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const upper = severity.toUpperCase();
  const styles =
    upper === "CRITICAL"
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : upper === "HIGH"
        ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
        : upper === "MEDIUM"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-blue-500/30 bg-blue-500/10 text-blue-400";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}>
      {upper}
    </span>
  );
}

function agentLabel(agentId: string) {
  return agentId
    .replace("misconfiguration", "Misconfiguration Agent")
    .replace("iam_risk", "IAM Risk Agent")
    .replace("compliance", "Compliance Agent")
    .replace("attack_path", "Attack Path Agent")
    .replace("ai_remediation", "AI Remediation Agent");
}
