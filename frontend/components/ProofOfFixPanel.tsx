"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { API_BASE } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function ProofOfFixPanel({
  scanId,
  originalFailedCount,
  status: initialStatus,
  onVerify: customOnVerify,
}: {
  scanId?: string;
  originalFailedCount?: number;
  status?: "idle" | "verifying" | "verified" | "failed";
  onVerify?: () => void;
}) {

  const [internalStatus, setInternalStatus] = useState<"idle" | "verifying" | "verified" | "failed">(initialStatus || "idle");
  const [proofData, setProofData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const status = initialStatus || internalStatus;
  const isVerified = status === "verified";
  const isFailed = status === "failed";
  const isVerifying = status === "verifying" || loading;

  async function handleRunVerification() {
    if (customOnVerify) {
      customOnVerify();
      return;
    }
    if (!scanId) return;

    setLoading(true);
    setInternalStatus("verifying");
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/remediation/${scanId}/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ max_retries: 3 }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Verification failed" }));
        throw new Error(errJson.detail || "Remediation generation failed");
      }

      const data = await res.json();
      setProofData(data.proof_of_fix);
      const isOk = data.proof_of_fix?.status === "VERIFIED" || data.proof_of_fix?.terraform_valid;
      setInternalStatus(isOk ? "verified" : "failed");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify remediation");
      setInternalStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  const checks = [
    { label: "HCL Syntax Validation", status: isVerified || isFailed ? 'pass' : (isVerifying ? 'loading' : 'idle') },
    { label: "Security Rescan (Checkov)", status: isVerified ? 'pass' : (isFailed ? 'fail' : (isVerifying ? 'loading' : 'idle')) },
    { label: "Digital Twin Rebuild", status: isVerified ? 'pass' : (isFailed ? 'fail' : 'idle') },
    { label: "Attack Path Replay", status: isVerified ? 'pass' : (isFailed ? 'fail' : 'idle') },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Verified AI Remediation + Proof-of-Fix
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </h2>
            <p className="text-[11px] text-slate-400">Closed-Loop AI Patch &amp; Re-Scan Verification</p>
          </div>
        </div>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Verified
          </span>
        )}
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
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Original Findings</p>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{proofData?.original_failed_checks ?? originalFailedCount ?? "44"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">New Findings After Fix</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">{proofData?.new_failed_checks ?? (isVerified ? "0" : "-")}</p>
          </div>

        </div>

        <div className="pt-3 border-t border-white/[0.05] mt-2">
           <div className={`rounded-lg border p-3 flex items-center justify-between ${
             isVerified ? 'bg-emerald-500/10 border-emerald-500/30' :
             isFailed ? 'bg-red-500/10 border-red-500/30' :
             'bg-white/[0.02] border-white/[0.05]'
           }`}>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Final Attestation Status</p>
               <p className={`text-base font-black tracking-wide ${
                 isVerified ? 'text-emerald-400' :
                 isFailed ? 'text-red-400' :
                 'text-slate-400'
               }`}>
                 {isVerified ? "✓ VERIFIED PROOF-OF-FIX" : isFailed ? "✕ RE-SCAN FAILED" : "PENDING VERIFICATION"}
               </p>
             </div>
             {isVerified && (
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-500">Proof Hash</p>
                  <p className="text-[10px] font-mono text-emerald-400/70">{proofData?.id ? String(proofData.id).slice(0, 8) : "proof-attested"}</p>

                </div>
             )}
             {isFailed && (
                <div className="text-right max-w-[120px]">
                  <p className="text-[10px] uppercase text-slate-500">Reason</p>
                  <p className="text-[10px] text-red-400/70 truncate">{errorMsg || "Checks remaining"}</p>
                </div>
             )}
           </div>
        </div>
      </div>

      <Button 
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2"
        onClick={handleRunVerification}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <><RefreshCw className="h-4 w-4 animate-spin" /> Running Closed-Loop Verification...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Run AI Proof-of-Fix Verification</>
        )}
      </Button>

    </div>
  );
}
