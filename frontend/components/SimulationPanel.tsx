"use client";

import { useState } from "react";
import { Play, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui";

const FIX_OPTIONS = [
  { id: "remove_wildcard", label: "Restrict IAM wildcard (*)", type: "iam_permission" },
  { id: "close_port_22", label: "Close public Port 22 (SSH)", type: "security_group" },
  { id: "remove_public_s3", label: "Remove public S3 access", type: "s3_bucket" },
  { id: "enable_encryption", label: "Enable EBS encryption", type: "ec2_volume" },
];

export function SimulationPanel({
  onSimulate,
  onReset,
  isSimulating
}: {
  onSimulate: (mutation: any) => void;
  onReset: () => void;
  isSimulating: boolean;
}) {
  const [selectedFix, setSelectedFix] = useState(FIX_OPTIONS[0].id);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/20 border border-purple-500/30">
          <Zap className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Counterfactual "What-If"</h2>
          <p className="text-[11px] text-slate-400">Test fixes without modifying infra</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
            Select Hypothetical Change
          </label>
          <div className="flex flex-col gap-2">
            {FIX_OPTIONS.map(fix => (
              <label 
                key={fix.id} 
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  selectedFix === fix.id 
                    ? 'border-purple-500/50 bg-purple-500/10' 
                    : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input 
                  type="radio" 
                  name="fix_option" 
                  value={fix.id} 
                  checked={selectedFix === fix.id}
                  onChange={() => setSelectedFix(fix.id)}
                  className="accent-purple-500 w-4 h-4"
                />
                <span className={`text-sm font-medium ${selectedFix === fix.id ? 'text-purple-200' : 'text-slate-300'}`}>
                  {fix.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            onClick={() => onSimulate(FIX_OPTIONS.find(f => f.id === selectedFix))}
          >
            <Play className="w-4 h-4" /> Simulate Fix
          </Button>
          <Button 
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            onClick={onReset}
            disabled={!isSimulating}
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
