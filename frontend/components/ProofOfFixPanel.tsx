"use client";

import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";

export function ProofOfFixPanel({
  status,
  onVerify
}: {
  status: "idle" | "verifying" | "verified" | "failed";
  onVerify: () => void;
}) {
  const isVerified = status === "verified";
  const isFailed = status === "failed";
  const isVerifying = status === "verifying";

  const checks = [
    { label: "HCL Syntax Validation", status: isVerified || isFailed ? 'pass' : (isVerifying ? 'loading' : 'idle') },
    { label: "Security Rescan", status: isVerified ? 'pass' : (isFailed ? 'fail' : (isVerifying ? 'loading' : 'idle')) },
    { label: "Digital Twin Rebuild", status: isVerified ? 'pass' : (isFailed ? 'fail' : 'idle') },
    { label: "Attack Path Replay", status: isVerified ? 'pass' : (isFailed ? 'fail' : 'idle') },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Proof-of-Fix</h2>
          <p className="text-[11px] text-slate-400">Backend verification status</p>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-300 text-xs">{check.label}</span>
            {check.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {check.status === 'fail' && <XCircle className="w-4 h-4 text-red-400" />}
            {check.status === 'loading' && <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />}
            {check.status === 'idle' && <div className="w-4 h-4 rounded-full border-2 border-slate-700" />}
          </div>
        ))}

        {/* Stats */}
        <div className="pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Target Path Closed</p>
            <p className="text-xs font-bold text-white mt-0.5">{isVerified ? "✓ Yes" : "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">New Critical Paths</p>
            <p className="text-xs font-bold text-white mt-0.5">{isVerified ? "0" : "-"}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.05] mt-2">
           <div className={`rounded-lg border p-3 flex items-center justify-between ${
             isVerified ? 'bg-emerald-500/10 border-emerald-500/30' :
             isFailed ? 'bg-red-500/10 border-red-500/30' :
             'bg-white/[0.02] border-white/[0.05]'
           }`}>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Final Status</p>
               <p className={`text-lg font-black tracking-wide ${
                 isVerified ? 'text-emerald-400' :
                 isFailed ? 'text-red-400' :
                 'text-slate-400'
               }`}>
                 {isVerified ? "✓ VERIFIED" : isFailed ? "✕ FAILED" : "PENDING"}
               </p>
             </div>
             {isVerified && (
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-500">Artifact Hash</p>
                  <p className="text-[10px] font-mono text-emerald-400/70">abc123ff</p>
                </div>
             )}
             {isFailed && (
                <div className="text-right max-w-[120px]">
                  <p className="text-[10px] uppercase text-slate-500">Reason</p>
                  <p className="text-[10px] text-red-400/70 truncate">Integration failed</p>
                </div>
             )}
           </div>
        </div>
      </div>

      <Button 
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white"
        onClick={onVerify}
        disabled={isVerifying || isVerified}
      >
        {isVerifying ? "Verifying with Backend..." : "Run Verification"}
      </Button>

    </div>
  );
}
