"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Maximize2, Box, Globe2, Server, ShieldAlert } from "lucide-react";

function riskTone(risk = 0) {
  if (risk >= 85) return {
    label: "Critical", border: "border-red-500/50", bg: "bg-red-950/40",
    text: "text-red-400", dot: "bg-red-500", iconBg: "bg-red-500/10",
    badgeBorder: "border-red-500/30", barColor: "#ef4444",
  };
  if (risk >= 65) return {
    label: "High", border: "border-amber-500/50", bg: "bg-amber-950/40",
    text: "text-amber-400", dot: "bg-amber-500", iconBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30", barColor: "#f59e0b",
  };
  if (risk >= 35) return {
    label: "Medium", border: "border-sky-500/50", bg: "bg-sky-950/40",
    text: "text-sky-400", dot: "bg-sky-500", iconBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30", barColor: "#38bdf8",
  };
  return {
    label: "Low", border: "border-emerald-500/50", bg: "bg-emerald-950/30",
    text: "text-emerald-400", dot: "bg-emerald-500", iconBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30", barColor: "#10b981",
  };
}

function ResourceNode({ data }: NodeProps) {
  const risk = Number(data.risk || 0);
  const tone = riskTone(risk);
  const kind = String(data.kind || "resource");
  const Icon = kind === "external" ? Globe2
    : kind.includes("security_group") ? ShieldAlert
    : kind.includes("instance") ? Server
    : Box;

  return (
    <div className={`w-48 rounded-xl border ${tone.border} ${tone.bg} p-3 shadow-xl shadow-black/50 backdrop-blur`}>
      <Handle className="!h-2 !w-2 !border-[#07090f] !bg-slate-600" type="target" position={Position.Left} />
      <div className="flex items-start gap-2.5">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone.iconBg} border ${tone.border}`}>
          <Icon className={`h-4 w-4 ${tone.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold text-slate-100">{String(data.label || "resource")}</div>
          <div className="mt-0.5 truncate text-[10px] text-slate-500">{kind}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {tone.label}
        </span>
        <span className={`text-base font-black ${tone.text}`}>{risk}</span>
      </div>
      <Handle className="!h-2 !w-2 !border-[#07090f] !bg-slate-600" type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { riskNode: ResourceNode };

// Inner component that has access to ReactFlow context
function GraphInner({ nodes, edges, onNodeClick, selected, setSelected }: any) {
  const { fitView } = useReactFlow();
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.22, duration: 500 });
  }, [fitView]);

  const selectedTone = riskTone(Number(selected?.risk || 0));

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        onNodeClick={onNodeClick}
        style={{ background: "#0a0d14" }}
      >
        <Background color="#1e2433" gap={24} size={1} />

        {/* Custom dark controls */}
        <Panel position="bottom-left">
          <div
            className="flex flex-col gap-0 overflow-hidden rounded-xl border border-white/[0.08]"
            style={{ background: "#0d1117" }}
          >
            {[
              { label: "+", onClick: () => {} },
              { label: "−", onClick: () => {} },
              { label: "⤢", onClick: handleFitView },
              { label: "⊡", onClick: () => {} },
            ].map(({ label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition text-sm font-bold border-b border-white/[0.05] last:border-0"
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>

        {/* Fit View button — top right overlay, wired to fitView */}
        <Panel position="top-right">
          <button
            onClick={handleFitView}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
            style={{ background: "rgba(10,13,20,0.85)", backdropFilter: "blur(8px)" }}
          >
            <Maximize2 className="h-3 w-3" />
            Fit View
          </button>
        </Panel>
      </ReactFlow>

      {/* Node detail popup */}
      {selected && (
        <div className="absolute bottom-4 right-4 w-72 rounded-xl border border-white/[0.08] p-4 shadow-2xl backdrop-blur z-10"
          style={{ background: "rgba(13,17,27,0.96)" }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{selected.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{selected.kind}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${selectedTone.iconBg} ${selectedTone.text} ${selectedTone.badgeBorder}`}>
              {selectedTone.label}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Number(selected.risk || 0))}%`, background: selectedTone.barColor }} />
          </div>
          <p className="mt-3 text-xs text-slate-400">Risk score {selected.risk ?? 0}. Click other resources to inspect.</p>
          <button onClick={() => setSelected(null)} className="mt-2 text-xs text-slate-600 hover:text-slate-400 transition">✕ dismiss</button>
        </div>
      )}
    </>
  );
}

export function RiskGraph({ graph }: { graph: any }) {
  const [selected, setSelected] = useState<any>(null);

  const nodes = useMemo<Node[]>(() => {
    const rank = (kind = "") => {
      if (kind === "external") return 0;
      if (kind.includes("security_group")) return 1;
      if (kind.includes("instance")) return 2;
      if (kind.includes("iam")) return 3;
      if (kind.includes("s3") || kind.includes("db")) return 4;
      return 5;
    };
    const buckets: Record<number, any[]> = {};
    for (const node of graph?.nodes || []) {
      const bucket = rank(node.data?.kind || "");
      buckets[bucket] = [...(buckets[bucket] || []), node];
    }
    return Object.entries(buckets).flatMap(([bucket, bucketNodes]) =>
      bucketNodes.map((node: any, index: number) => ({
        ...node,
        type: "riskNode",
        position: { x: Number(bucket) * 220, y: index * 120 },
      }))
    );
  }, [graph]);

  const edges = useMemo<Edge[]>(() => {
    return (graph?.edges || []).map((edge: any) => ({
      ...edge,
      animated: edge.risk === "critical",
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.source === "internet" ? "#ef4444" : "#475569",
      },
      style: {
        stroke: edge.risk === "critical" ? "#ef4444" : edge.risk === "high" ? "#f59e0b" : "#334155",
        strokeWidth: edge.risk === "critical" ? 2.4 : edge.risk === "high" ? 2 : 1.3,
      },
      labelStyle: { fill: "#94a3b8", fontWeight: 700, fontSize: 10 },
      labelBgStyle: { fill: "rgba(7,9,15,0.90)", fillOpacity: 1 },
    }));
  }, [graph]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelected(node.data);
  }, []);

  return (
    <div className="relative h-full overflow-hidden rounded-b-2xl" style={{ background: "#0a0d14" }}>
      {/* Hide the default Controls (we render our own via Panel) */}
      <style>{`
        .react-flow__controls { display: none !important; }
        .react-flow__attribution { display: none !important; }
        .react-flow__panel { margin: 12px !important; }
      `}</style>
      <GraphInner
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
  );
}
