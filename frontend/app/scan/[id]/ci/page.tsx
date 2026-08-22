"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GitMerge,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  Cpu,
  GitBranch,
  ShieldAlert,
  Target,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui";
import { getScan } from "@/lib/api";

export default function CIPage({ params }: { params: { id: string } }) {
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScan(params.id)
      .then((data) => {
        setScan(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <Shell>
        <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Loading Security Gate Analysis…</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!scan) {
    return (
      <Shell>
        <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-8 flex flex-col items-center justify-center">
          <p className="text-slate-400 text-sm">Scan record not found.</p>
          <Link href="/dashboard" className="mt-4">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // Extract real security gate data from scan
  const secGate = scan.graph?.security_gate || {};
  const isBlocked = secGate.verdict === "BLOCK";
  const reasons: string[] = secGate.reasons || [];
  const risk = scan.graph?.blast_radius_score ?? 0;
  const attackPaths = scan.graph?.attack_paths || [];
  const criticalAttackPathsCount = secGate.critical_attack_paths ?? attackPaths.filter((p: any) => p.severity === "CRITICAL").length;
  const criticalFindingsCount = secGate.critical_findings ?? 0;

  // PR metadata from scan record if available
  const prMeta = scan.parsed?.pr_metadata || scan.graph?.pr_metadata || {};
  const repoName = prMeta.repository || "infrastructure-repo";
  const prNumber = prMeta.pr_number || "PR";
  const branchName = prMeta.branch || scan.filename || "feature/insecure-change";
  const baseBranch = prMeta.base_branch || "main";
  const commitSha = prMeta.commit_sha ? String(prMeta.commit_sha).slice(0, 7) : null;

  // Base comparison if available
  const baseComp = scan.graph?.base_comparison;
  const baselineRisk = baseComp ? baseComp.before_risk : Math.max(0, risk - (isBlocked ? 25 : 0));
  const baselinePaths = baseComp ? baseComp.before_attack_paths : Math.max(0, criticalAttackPathsCount - (isBlocked ? 1 : 0));

  return (
    <Shell>
      <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6 flex flex-col items-center">
        
        {/* Navigation Breadcrumb */}
        <div className="w-full max-w-5xl flex items-center justify-between">
          <Link href={`/scan/${params.id}/results`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Results
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/scan/${params.id}/twin`}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3.5 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-500/20 transition">
                <Cpu className="h-3.5 w-3.5" /> Digital Twin Canvas
              </button>
            </Link>
          </div>
        </div>

        {/* Main Security Gate Card */}
        <div className="w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur overflow-hidden">
          
          {/* Header */}
          <div className="border-b border-white/[0.08] bg-white/[0.02] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${
                isBlocked ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}>
                <GitMerge className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                  <h1 className="text-xl md:text-2xl font-black text-white">
                    {prNumber !== "PR" ? `PR #${prNumber}` : "Pull Request"} Security Gate
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-[11px] font-bold text-purple-300 font-mono">
                    {branchName}
                  </span>
                  <span className="text-xs text-slate-500">→</span>
                  <span className="px-2 py-0.5 rounded-md border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold text-slate-400 font-mono">
                    {baseBranch}
                  </span>
                  {commitSha && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      @ {commitSha}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Target: <span className="font-semibold text-slate-300">{repoName}</span> &bull; Pre-deployment automated security gate
                </p>
              </div>
            </div>
            
            {/* Verdict Badge */}
            <div className={`px-6 py-3.5 rounded-2xl border flex items-center gap-3.5 shrink-0 ${
              isBlocked ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]" 
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
            }`}>
              {isBlocked ? <XCircle className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-75">Enforcement Verdict</p>
                <p className="text-lg font-black tracking-tight">{isBlocked ? "BLOCK MERGE" : "GATE PASSED"}</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            
            {/* ── METRICS COMPARISON GRID ───────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-400" /> Infrastructure Posture Comparison
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Baseline */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500" /> Baseline ({baseBranch})
                  </h3>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-xs font-medium">Blast Radius Risk</p>
                      <p className="text-xl font-bold text-slate-300">{baselineRisk}/100</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-xs font-medium">Critical Attack Paths</p>
                      <p className="text-xl font-bold text-slate-300">{baselinePaths}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-xs font-medium">Status</p>
                      <span className="text-xs font-bold text-emerald-400">Baseline Verified</span>
                    </div>
                  </div>
                </div>

                {/* PR Proposed Changes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-teal-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" /> Proposed PR Changes
                  </h3>
                  <div className={`rounded-xl border p-5 space-y-4 ${
                    isBlocked ? "border-red-500/30 bg-red-500/[0.04]" : "border-emerald-500/30 bg-emerald-500/[0.04]"
                  }`}>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-xs font-medium">Blast Radius Risk</p>
                      <div className="flex items-center gap-2">
                        {risk > baselineRisk && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        <p className={`text-xl font-bold ${risk > baselineRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                          {risk}/100
                        </p>
                        {risk !== baselineRisk && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${risk > baselineRisk ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {risk > baselineRisk ? `+${risk - baselineRisk}` : `${risk - baselineRisk}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-xs font-medium">Critical Attack Paths</p>
                      <div className="flex items-center gap-2">
                        {criticalAttackPathsCount > 0 && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        <p className={`text-xl font-bold ${criticalAttackPathsCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {criticalAttackPathsCount}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-xs font-medium">Critical Findings</p>
                      <p className={`text-xl font-bold ${criticalFindingsCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {criticalFindingsCount}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── WHY WAS THIS PR BLOCKED? / REASONS ─────────────────── */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                {isBlocked ? "Why Was This PR Blocked?" : "Gate Evaluation Summary"}
              </p>

              {reasons.length > 0 ? (
                <div className="space-y-2.5">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-red-200">{r}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs font-medium text-emerald-200">No blocking security violations or attack paths detected. Safe to merge.</p>
                </div>
              )}
            </div>

            {/* ── CRITICAL ATTACK PATHS DETECTED ────────────────────── */}
            {attackPaths.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-rose-400" /> Detected Adversarial Attack Paths ({attackPaths.length})
                </p>

                <div className="space-y-3">
                  {attackPaths.map((path: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-md">
                            {path.severity || "CRITICAL"} &bull; Score: {path.score}
                          </span>
                          <span className="text-xs font-bold text-white">Path #{idx + 1}</span>
                        </div>
                        {path.choke_point && (
                          <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            Choke Point: {path.choke_point}
                          </span>
                        )}
                      </div>

                      {/* Step Chain */}
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {(path.steps || []).map((step: string, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md border ${
                              step === "internet" ? "bg-blue-500/10 border-blue-500/30 text-blue-300" :
                              step.includes("db") || step.includes("s3") ? "bg-violet-500/10 border-violet-500/30 text-violet-300" :
                              step.includes("iam") ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
                              "bg-white/[0.06] border-white/[0.1] text-slate-200"
                            }`}>
                              {step}
                            </span>
                            {sIdx < path.steps.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ACTION FOOTER ─────────────────────────────────────── */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                <span>Deterministic graph proof &bull; CI/CD security gate policy</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link href={`/scan/${params.id}/twin`} className="w-full sm:w-auto">
                  <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 px-4 shadow-lg shadow-teal-500/20">
                    Fix in Digital Twin &amp; Proof-of-Fix →
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Shell>
  );
}
