"use client";

import { useMemo, useState } from "react";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Box, Globe2, Server, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui";

function riskTone(risk = 0) {
  if (risk >= 85) return { label: "Critical", border: "border-red-300", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" };
  if (risk >= 65) return { label: "High", border: "border-amber-300", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
  if (risk >= 35) return { label: "Medium", border: "border-sky-400", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" };
  return { label: "Low", border: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
}

function ResourceNode({ data }: NodeProps) {
  const risk = Number(data.risk || 0);
  const tone = riskTone(risk);
  const kind = String(data.kind || "resource");
  const Icon = kind === "external" ? Globe2 : kind.includes("security_group") ? ShieldAlert : kind.includes("instance") ? Server : Box;

  return (
    <div className={`w-52 rounded-lg border ${tone.border} ${tone.bg} p-3 shadow-[0_14px_34px_rgba(15,23,42,0.10)]`}>
      <Handle className="!h-2 !w-2 !border-white !bg-slate-500" type="target" position={Position.Left} />
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white shadow-sm">
          <Icon className={`h-5 w-5 ${tone.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-slate-950">{String(data.label || "resource")}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{kind}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          {tone.label}
        </span>
        <span className={`text-lg font-bold ${tone.text}`}>{risk}</span>
      </div>
      <Handle className="!h-2 !w-2 !border-white !bg-slate-500" type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { riskNode: ResourceNode };

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
        position: { x: Number(bucket) * 260, y: index * 130 }
      }))
    );
  }, [graph]);

  const edges = useMemo<Edge[]>(() => {
    return (graph?.edges || []).map((edge: any) => ({
      ...edge,
      animated: edge.risk === "critical",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: edge.source === "internet" ? "#dc2626" : "#64748b" },
      style: {
        stroke: edge.risk === "critical" ? "#dc2626" : edge.risk === "high" ? "#d97706" : "#64748b",
        strokeWidth: edge.risk === "critical" ? 2.4 : edge.risk === "high" ? 2 : 1.3
      },
      labelStyle: { fill: "#475569", fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: "rgba(255,255,255,0.86)" }
    }));
  }, [graph]);

  const selectedTone = riskTone(Number(selected?.risk || 0));

  return (
    <div className="relative h-full overflow-hidden rounded-lg bg-[linear-gradient(135deg,#f8fafc_0%,#eef6f5_100%)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        onNodeClick={(_, node) => setSelected(node.data)}
      >
        <Background color="#cbd5e1" gap={22} />
        <Controls />
      </ReactFlow>
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Attack surface map
        </div>
        <div className="mt-1 text-xs text-slate-500">{nodes.length} resources, {edges.length} relationships</div>
      </div>
      {selected ? (
        <div className="absolute bottom-4 right-4 w-80 rounded-lg border border-white/80 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{selected.label}</p>
              <p className="mt-1 text-xs text-slate-500">{selected.kind}</p>
            </div>
            <Badge className={`${selectedTone.bg} ${selectedTone.text} ${selectedTone.border}`}>{selectedTone.label}</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full ${selectedTone.dot}`} style={{ width: `${Math.min(100, Number(selected.risk || 0))}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">Risk score {selected.risk ?? 0}. Click other resources to inspect their tier and exposure.</p>
        </div>
      ) : null}
    </div>
  );
}
