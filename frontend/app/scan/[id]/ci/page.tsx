"use client";

import Link from "next/link";
import { ArrowLeft, GitMerge, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui";

export default function CIPage({ params }: { params: { id: string } }) {
  // Mock data for CI/CD comparison
  const baselineRisk = 75;
  const prRisk = 85;
  const baselinePaths = 2;
  const prPaths = 4;

  const isBlocked = prRisk > baselineRisk || prPaths > baselinePaths;

  return (
    <Shell>
      <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6 flex flex-col items-center">
        
        <div className="w-full max-w-4xl mb-6">
          <Link href={`/scan/${params.id}/results`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Results
          </Link>
        </div>

        <div className="w-full max-w-4xl rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur overflow-hidden">
          
          <div className="border-b border-white/[0.08] bg-white/[0.02] p-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-800 border border-slate-700">
                <GitMerge className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white">PR #42 Security Gate</h1>
                  <span className="px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    feat/add-new-ec2
                  </span>
                </div>
                <p className="text-sm text-slate-400">Comparing PR changes against main branch baseline.</p>
              </div>
            </div>
            
            <div className={`px-6 py-3 rounded-xl border flex items-center gap-3 ${
              isBlocked ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            }`}>
              {isBlocked ? <XCircle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Final Result</p>
                <p className="text-lg font-black">{isBlocked ? "BLOCK MERGE" : "GATE PASSED"}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 gap-8">
              
              {/* Baseline */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500" /> Baseline (main)
                </h3>
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
                  <div className="flex justify-between items-end mb-4">
                    <p className="text-slate-400 text-sm">Blast Radius Risk</p>
                    <p className="text-2xl font-bold text-slate-200">{baselineRisk}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-slate-400 text-sm">Critical Paths</p>
                    <p className="text-2xl font-bold text-slate-200">{baselinePaths}</p>
                  </div>
                </div>
              </div>

              {/* PR */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> PR Changes
                </h3>
                <div className={`rounded-xl border p-5 ${
                  isBlocked ? "border-red-500/20 bg-red-500/[0.03]" : "border-emerald-500/20 bg-emerald-500/[0.03]"
                }`}>
                  <div className="flex justify-between items-end mb-4">
                    <p className="text-slate-400 text-sm">Blast Radius Risk</p>
                    <div className="flex items-center gap-2">
                      {prRisk > baselineRisk && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <p className={`text-2xl font-bold ${prRisk > baselineRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                        {prRisk}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-slate-400 text-sm">Critical Paths</p>
                    <div className="flex items-center gap-2">
                      {prPaths > baselinePaths && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <p className={`text-2xl font-bold ${prPaths > baselinePaths ? 'text-red-400' : 'text-emerald-400'}`}>
                        {prPaths}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
