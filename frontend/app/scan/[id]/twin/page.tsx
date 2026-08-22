"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, ArrowRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui";
import { DigitalTwinCanvas } from "@/components/DigitalTwinCanvas";
import { SimulationPanel } from "@/components/SimulationPanel";
import { PathDetailsPanel } from "@/components/PathDetailsPanel";
import { RemediationOptimizer } from "@/components/RemediationOptimizer";
import { AIRemediationDiff } from "@/components/AIRemediationDiff";
import { ProofOfFixPanel } from "@/components/ProofOfFixPanel";
import { getScan } from "@/lib/api";

export default function DigitalTwinPage({ params }: { params: { id: string } }) {
  const [scan, setScan] = useState<any>(null);
  const [mode, setMode] = useState<"CURRENT" | "HYPOTHETICAL">("CURRENT");
  const [hypoGraph, setHypoGraph] = useState<any>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [elementType, setElementType] = useState<'node' | 'edge' | null>(null);
  const [showAIFix, setShowAIFix] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");

  useEffect(() => {
    getScan(params.id).then(setScan);
  }, [params.id]);

  const handleSimulate = (mutation: any) => {
    // Mock simulation logic (frontend only for now)
    // Normally this would be a POST /counterfactual
    setMode("HYPOTHETICAL");
    setShowAIFix(false);
    setVerifyStatus("idle");
    
    // Create a mock hypothetical graph by removing 1 critical edge
    if (scan?.graph) {
      const mockGraph = JSON.parse(JSON.stringify(scan.graph));
      if (mockGraph.edges.length > 0) {
        // Just arbitrarily drop the first critical edge to simulate breaking a path
        const criticalIndex = mockGraph.edges.findIndex((e: any) => e.risk === "critical");
        if (criticalIndex >= 0) {
          mockGraph.edges.splice(criticalIndex, 1);
        }
      }
      setHypoGraph(mockGraph);
    }
  };

  const handleReset = () => {
    setMode("CURRENT");
    setHypoGraph(null);
    setShowAIFix(false);
    setVerifyStatus("idle");
  };

  const handleElementClick = (type: 'node' | 'edge', data: any) => {
    setElementType(type);
    setSelectedElement(data);
  };

  const handleGenerateFix = () => {
    setShowAIFix(true);
  };

  const handleVerify = () => {
    setVerifyStatus("verifying");
    setTimeout(() => {
      // Mock successful verification
      setVerifyStatus("verified");
    }, 2000);
  };

  if (!scan) return <Shell><div className="p-8 text-white">Loading Digital Twin...</div></Shell>;

  return (
    <Shell>
      <div style={{ background: "#07090f" }} className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/scan/${params.id}/results`}>
              <button className="flex items-center justify-center w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-500" /> Security Digital Twin
              </h1>
              <p className="text-xs text-slate-400">Interactive infrastructure model & counterfactual simulations.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-semibold">
            <div className={`px-4 py-2 rounded-xl border ${mode === "CURRENT" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-white/[0.02] border-white/[0.05] text-slate-500"}`}>
              Current Risk: {scan.graph?.blast_radius_score || 0}
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <div className={`px-4 py-2 rounded-xl border transition-all ${mode === "HYPOTHETICAL" ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "bg-white/[0.02] border-white/[0.05] text-slate-500"}`}>
              Hypothetical Risk: {mode === "HYPOTHETICAL" ? Math.max(0, (scan.graph?.blast_radius_score || 0) - 25) : "--"}
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[600px]">
          
          {/* Left Panel: Simulation & Optimizer */}
          <div className="col-span-1 space-y-6 flex flex-col h-full">
            <SimulationPanel 
              onSimulate={handleSimulate} 
              onReset={handleReset} 
              isSimulating={mode === "HYPOTHETICAL"} 
            />
            <div className="flex-1">
              <RemediationOptimizer onGenerateFix={handleGenerateFix} />
            </div>
          </div>

          {/* Center: Graph Canvas */}
          <div className="col-span-2 relative h-full rounded-2xl shadow-xl shadow-black/40 overflow-hidden">
            <DigitalTwinCanvas 
              baseGraph={scan.graph} 
              hypotheticalGraph={hypoGraph} 
              mode={mode} 
              onElementClick={handleElementClick}
            />
            <PathDetailsPanel 
              selectedElement={selectedElement} 
              elementType={elementType} 
              onClose={() => setSelectedElement(null)} 
            />
          </div>

          {/* Right Panel: AI Fix & Proof */}
          <div className="col-span-1 space-y-6 flex flex-col h-full">
            {showAIFix ? (
              <>
                <AIRemediationDiff />
                <ProofOfFixPanel status={verifyStatus} onVerify={handleVerify} />
              </>
            ) : (
              <div className="rounded-2xl border border-white/[0.05] border-dashed bg-white/[0.01] p-5 flex flex-col items-center justify-center text-center h-full text-slate-500">
                <p className="text-sm">Click "Generate AI Fix" from the optimizer to view the patch and verify.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
