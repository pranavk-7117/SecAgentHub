"use client";

import { Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export function RemediationOptimizer({
  onGenerateFix
}: {
  onGenerateFix: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500/20 border border-teal-500/30">
          <Target className="h-4 w-4 text-teal-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Remediation Optimizer</h2>
          <p className="text-[11px] text-slate-400">Best fix to break attack paths</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 justify-center">
        
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">Recommended Fix #1</p>
              <p className="text-sm font-semibold text-white">Restrict IAM wildcard permission</p>
              <p className="text-xs text-slate-400 mt-1">Resource: aws_iam_role.ec2_admin_role</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-teal-500/20 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Impact</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">Breaks 5 attack paths</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Risk Reduction</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                4 Critical <ArrowRight className="w-3 h-3 text-slate-500" /> 0 Critical
              </p>
            </div>
          </div>
        </div>

        <Button 
          className="w-full bg-teal-600 hover:bg-teal-500 text-white"
          onClick={onGenerateFix}
        >
          Generate AI Fix
        </Button>
      </div>
    </div>
  );
}
