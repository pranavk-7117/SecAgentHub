"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
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
import { Maximize2, Box, Globe2, Server, ShieldAlert, Zap } from "lucide-react";

function riskTone(risk = 0) {
  if (risk >= 85) return { label:"Critical", border:"border-red-500/50",     bg:"bg-red-950/40",     text:"text-red-400",     dot:"bg-red-500",     iconBg:"bg-red-500/10",     badgeBorder:"border-red-500/30",     barColor:"#ef4444" };
  if (risk >= 65) return { label:"High",     border:"border-amber-500/50",   bg:"bg-amber-950/40",   text:"text-amber-400",   dot:"bg-amber-500",   iconBg:"bg-amber-500/10",   badgeBorder:"border-amber-500/30",   barColor:"#f59e0b" };
  if (risk >= 35) return { label:"Medium",   border:"border-sky-500/50",     bg:"bg-sky-950/40",     text:"text-sky-400",     dot:"bg-sky-500",     iconBg:"bg-sky-500/10",     badgeBorder:"border-sky-500/30",     barColor:"#38bdf8" };
  return             { label:"Low",      border:"border-emerald-500/50", bg:"bg-emerald-950/30", text:"text-emerald-400", dot:"bg-emerald-500", iconBg:"bg-emerald-500/10", badgeBorder:"border-emerald-500/30", barColor:"#10b981" };
}

function ResourceNode({ data }: NodeProps) {
  const risk  = Number(data.risk || 0);
  const tone  = riskTone(risk);
  const kind  = String(data.kind || "resource");
  const isChanged = data.isChanged;
  
  const Icon  = kind === "external" ? Globe2
              : kind.includes("security_group") ? ShieldAlert
              : kind.includes("instance") ? Server
              : Box;

  return (
    <div className={`w-48 rounded-xl border ${tone.border} ${tone.bg} p-3 shadow-xl shadow-black/50 backdrop-blur ${isChanged ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#0a0d14]' : ''}`}>
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
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />{tone.label}
        </span>
        <span className={`text-base font-black ${tone.text}`}>{risk}</span>
      </div>
      <Handle className="!h-2 !w-2 !border-[#07090f] !bg-slate-600" type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { riskNode: ResourceNode };

function FitViewPanel() {
  const { fitView } = useReactFlow();
  return (
    <Panel position="top-right">
      <button
        onClick={() => fitView({ padding: 0.22, duration: 500 })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
        style={{ background: "rgba(10,13,20,0.85)", backdropFilter: "blur(8px)" }}
      >
        <Maximize2 className="h-3 w-3" /> Fit View
      </button>
    </Panel>
  );
}

function DarkControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left">
      <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08]" style={{ background: "#0d1117" }}>
        {[
          { label: "+", action: () => zoomIn({ duration: 200 }) },
          { label: "−", action: () => zoomOut({ duration: 200 }) },
          { label: "⤢", action: () => fitView({ padding: 0.22, duration: 500 }) },
        ].map(({ label, action }) => (
          <button key={label} onClick={action} className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition text-sm font-bold border-b border-white/[0.05] last:border-0">{label}</button>
        ))}
      </div>
    </Panel>
  );
}

export function DigitalTwinCanvas({
  baseGraph,
  hypotheticalGraph,
  mode, // "CURRENT" or "HYPOTHETICAL"
  onElementClick
}: {
  baseGraph: any;
  hypotheticalGraph: any | null;
  mode: "CURRENT" | "HYPOTHETICAL";
  onElementClick: (type: 'node' | 'edge', data: any) => void;
}) {
  
  const currentGraph = mode === "CURRENT" ? baseGraph : hypotheticalGraph;

  const nodes = useMemo<Node[]>(() => {
    if (!currentGraph?.nodes) return [];
    const rank = (kind = "") => {
      if (kind === "external") return 0;
      if (kind.includes("security_group")) return 1;
      if (kind.includes("instance")) return 2;
      if (kind.includes("iam")) return 3;
      if (kind.includes("s3") || kind.includes("db")) return 4;
      return 5;
    };
    const buckets: Record<number, any[]> = {};
    for (const node of currentGraph.nodes) {
      const bucket = rank(node.data?.kind || "");
      buckets[bucket] = [...(buckets[bucket] || []), node];
    }
    
    // Check which nodes are changed/new in hypothetical
    const originalNodeIds = new Set(baseGraph?.nodes?.map((n:any) => n.id) || []);
    
    return Object.entries(buckets).flatMap(([bucket, bucketNodes]) =>
      bucketNodes.map((node: any, i: number) => {
        const isNew = mode === "HYPOTHETICAL" && !originalNodeIds.has(node.id);
        return {
          ...node,
          type: "riskNode",
          position: { x: Number(bucket) * 250, y: i * 150 },
          data: { ...node.data, isChanged: isNew }
        };
      })
    );
  }, [currentGraph, baseGraph, mode]);

  const edges = useMemo<Edge[]>(() => {
    if (!currentGraph?.edges) return [];
    
    const baseEdgesStr = new Set(baseGraph?.edges?.map((e:any) => `${e.source}-${e.target}`) || []);
    const hypoEdgesStr = new Set(hypotheticalGraph?.edges?.map((e:any) => `${e.source}-${e.target}`) || []);

    let allEdges = [...(currentGraph.edges)];

    // If in hypothetical mode, we also render broken edges (in base, but not in hypo)
    if (mode === "HYPOTHETICAL") {
      const brokenEdges = (baseGraph?.edges || []).filter((e:any) => !hypoEdgesStr.has(`${e.source}-${e.target}`));
      brokenEdges.forEach((e:any) => {
        allEdges.push({ ...e, isBroken: true });
      });
    }

    return allEdges.map((edge: any) => {
      const id = `${edge.source}-${edge.target}`;
      const isNew = mode === "HYPOTHETICAL" && !baseEdgesStr.has(id) && !edge.isBroken;
      const isBroken = edge.isBroken;
      
      let strokeColor = "#334155";
      if (isBroken) strokeColor = "#10b981"; // Emerald for broken paths
      else if (isNew) strokeColor = "#ef4444"; // Red for new risks
      else if (edge.risk === "critical") strokeColor = "#f59e0b"; // Amber for critical

      return {
        ...edge,
        id: edge.id || id,
        animated: edge.risk === "critical" && !isBroken,
        type: "smoothstep",
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: strokeColor 
        },
        style: {
          stroke: strokeColor,
          strokeWidth: isBroken ? 2 : (edge.risk === "critical" ? 2.4 : 1.5),
          strokeDasharray: isBroken ? "5,5" : undefined,
          opacity: isBroken ? 0.6 : 1,
        },
        label: isBroken ? "Broken Path" : (isNew ? "New Risk" : (edge.evidence ? "Has Evidence" : "")),
        labelStyle: { fill: isBroken ? "#10b981" : (isNew ? "#ef4444" : "#94a3b8"), fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: "rgba(7,9,15,0.90)", fillOpacity: 1 },
      };
    });
  }, [currentGraph, baseGraph, hypotheticalGraph, mode]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    onElementClick('node', node.data);
  }, [onElementClick]);
  
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    onElementClick('edge', edge);
  }, [onElementClick]);

  return (
    <div className="relative h-full w-full bg-[#0a0d14] rounded-2xl overflow-hidden border border-white/[0.05]">
      <style>{`
        .react-flow__controls { display:none!important; }
        .react-flow__attribution { display:none!important; }
        .react-flow__panel { margin:16px!important; }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        style={{ background: "#0a0d14" }}
      >
        <Background color="#1e2433" gap={24} size={1.5} />
        <FitViewPanel />
        <DarkControls />
      </ReactFlow>

      {/* Mode Indicator Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest backdrop-blur ${
          mode === "CURRENT" 
            ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
            : "border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
        }`}>
          {mode === "CURRENT" ? "CURRENT STATE" : "HYPOTHETICAL SIMULATION"}
        </div>
      </div>
    </div>
  );
}
