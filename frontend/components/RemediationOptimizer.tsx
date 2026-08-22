"use client";

import { useMemo } from "react";
import { Target, TrendingDown, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";

interface AttackPath {
  id: string;
  choke_point: string;
  score: number;
  severity: string;
  steps?: string[];
}

interface ChokePointFix {
  node: string;
  count: number;
  label: string;
  effort: "High Impact" | "Medium Impact" | "Low Impact";
}

function nodeLabel(nodeId: string): string {
  if (!nodeId || nodeId === "internet") return "Public Internet";
  const parts = nodeId.split(".");
  if (parts.length >= 2) {
    const type = parts[0].replace("aws_", "").replace(/_/g, " ");
    const name = parts.slice(1).join(".");
    return `${name} (${type})`;
  }
  return nodeId;
}

export function RemediationOptimizer({
  onGenerateFix,
  attackPaths,
}: {
  onGenerateFix: (fix?: { type: string; label: string; pathsBlocked: number }) => void;
  attackPaths?: AttackPath[];
}) {
  const rankedFixes = useMemo<ChokePointFix[]>(() => {
    const paths = attackPaths || [];
    if (!paths.length) return [];

    // Count how many attack paths each choke_point appears in
    const chokeImpact: Record<string, number> = {};
    paths.forEach((p) => {
      if (p.choke_point && p.choke_point !== "internet") {
        chokeImpact[p.choke_point] = (chokeImpact[p.choke_point] || 0) + 1;
      }
    });

    return Object.entries(chokeImpact)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([node, count]): ChokePointFix => ({
        node,
        count,
        label: nodeLabel(node),
        effort: count >= 3 ? "High Impact" : count >= 2 ? "Medium Impact" : "Low Impact",
      }));
  }, [attackPaths]);

  const totalPaths = attackPaths?.length ?? 0;
  const hasPaths = rankedFixes.length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500/20 border border-teal-500/30">
          <Target className="h-4 w-4 text-teal-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Choke-Point Optimizer</h2>
          <p className="text-[11px] text-slate-400">Smallest fixes, largest impact</p>
        </div>
      </div>

      {totalPaths > 0 && (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-1">
          {totalPaths} attack path{totalPaths !== 1 ? "s" : ""} analyzed
        </p>
      )}

      <div className="flex-1 flex flex-col gap-3 justify-start overflow-auto">
        {hasPaths ? (
          <>
            {rankedFixes.map((fix, idx) => (
              <div
                key={fix.node}
                className={`rounded-xl border p-3.5 ${
                  idx === 0
                    ? "border-teal-500/40 bg-teal-500/10"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${idx === 0 ? "text-teal-400" : "text-slate-500"}`}>
                      {idx === 0 ? "★ Best Fix" : `Fix #${idx + 1}`}
                    </p>
                    <p className="text-xs font-semibold text-white truncate">{fix.label}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    fix.effort === "High Impact" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                    fix.effort === "Medium Impact" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                    "bg-slate-500/10 border-slate-500/30 text-slate-400"
                  }`}>{fix.effort}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Breaks {fix.count} attack path{fix.count !== 1 ? "s" : ""}
                  </p>
                  <Button
                    className="h-7 px-3 text-[11px] bg-teal-600 hover:bg-teal-500 text-white"
                    onClick={() => onGenerateFix({ type: fix.node, label: fix.label, pathsBlocked: fix.count })}
                  >
                    Apply Fix
                  </Button>
                </div>
              </div>
            ))}
          </>
        ) : (
          // Fallback when no real attack path data
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">Recommended Fix</p>
              <p className="text-sm font-semibold text-white">Restrict IAM wildcard permission</p>
              <p className="text-[11px] text-slate-400 mt-1">Run a security analysis to see real attack-path impact</p>
              <div className="mt-3 pt-3 border-t border-teal-500/20">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Zap className="w-3 h-3" /> High-impact change</p>
              </div>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white" onClick={() => onGenerateFix()}>
              Generate AI Fix
            </Button>
          </div>
        )}

        {hasPaths && (
          <div className="mt-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <p className="text-[11px] text-slate-400">
              Ranked by graph-centrality attack-path coverage, not severity alone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
