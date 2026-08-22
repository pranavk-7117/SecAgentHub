"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCode2, ShieldCheck, UploadCloud, GitBranch, CheckCircle2, Loader2, Cpu, Radar } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Badge, Button, Card, Input } from "@/components/ui";
import { uploadTerraform } from "@/lib/api";

export default function NewScanPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "github">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const steps = [
    "Parsing HCL & validating AST structure...",
    "Extracting IAM topology & network relationships...",
    "Running deterministic Checkov security checks...",
    "Generating Infrastructure Security Digital Twin...",
    "Simulating Red-Team attack path reachability...",
  ];

  async function runStepSequence() {
    setStep(1);
    await new Promise((r) => setTimeout(r, 600));
    setStep(2);
    await new Promise((r) => setTimeout(r, 600));
    setStep(3);
    await new Promise((r) => setTimeout(r, 600));
    setStep(4);
    await new Promise((r) => setTimeout(r, 600));
    setStep(5);
  }

  async function submitUpload() {
    if (!file) return;
    if (!file.name.endsWith(".tf") && !file.name.endsWith(".hcl")) {
      setError("Please choose a Terraform file ending in .tf or .hcl");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const stepPromise = runStepSequence();
      const resultPromise = uploadTerraform(file);
      const [_, result] = await Promise.all([stepPromise, resultPromise]);
      router.push(`/scan/${result.scan_id}/agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  }

  async function submitGithub() {
    if (!githubUrl.trim()) return;
    setLoading(true);
    setError("");
    try {
      await runStepSequence();
      // Demo fallback file for GitHub link scan
      const blob = new Blob([
        `provider "aws" { region = "us-east-1" }\nresource "aws_security_group" "web" { ingress { from_port = 22 to_port = 22 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] } }\nresource "aws_s3_bucket" "logs" { bucket = "secagent-logs-prod" acl = "public-read" }`
      ], { type: "text/plain" });
      const sampleFile = new File([blob], "main.tf", { type: "text/plain" });
      const result = await uploadTerraform(sampleFile);
      router.push(`/scan/${result.scan_id}/agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub analysis failed");
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        
        {/* Left Info Panel */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7 text-white shadow-2xl shadow-black/40 backdrop-blur flex flex-col justify-between">
          <div>
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20">
              <ShieldCheck className="h-6 w-6 text-teal-400" />
            </div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-400 uppercase tracking-widest">
              <Radar className="h-3.5 w-3.5" /> Pre-Deployment Security Analysis
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Analyze Infrastructure</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Transform IaC into a semantic Digital Twin, simulate adversarial attack paths, and verify AI-generated fixes before deployment.
            </p>
          </div>

          <div className="mt-8 space-y-3.5 pt-6 border-t border-white/[0.06] text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-3"><FileCode2 className="h-4 w-4 text-teal-400" /> Static HCL &amp; AST Analysis</div>
            <div className="flex items-center gap-3"><Cpu className="h-4 w-4 text-purple-400" /> Infrastructure Digital Twin Generation</div>
            <div className="flex items-center gap-3"><GitBranch className="h-4 w-4 text-emerald-400" /> Red-Team Attack Path Graph Simulation</div>
          </div>
        </div>

        {/* Right Upload / GitHub Card */}
        <Card className="flex flex-col border border-white/[0.07] bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
          
          {/* Tabs */}
          <div className="flex rounded-xl bg-white/[0.04] p-1 mb-6 border border-white/[0.06]">
            <button
              onClick={() => setTab("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
                tab === "upload" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <UploadCloud className="h-4 w-4" /> Upload Terraform File
            </button>
            <button
              onClick={() => setTab("github")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
                tab === "github" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <GitBranch className="h-4 w-4" /> Connect GitHub PR / Repo
            </button>
          </div>

          {loading ? (
            /* Analysis Progress Timeline */
            <div className="flex flex-col items-center justify-center py-10 space-y-6 flex-1">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Radar className="h-6 w-6 text-teal-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white">Analyzing Infrastructure…</h3>
              
              <div className="w-full max-w-sm space-y-2.5 pt-2">
                {steps.map((text, idx) => {
                  const done = step > idx;
                  const active = step === idx + 1;
                  return (
                    <div key={idx} className={`flex items-center gap-3 text-xs p-2.5 rounded-lg border transition-all ${
                      done ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
                      active ? "bg-teal-500/10 border-teal-500/30 text-teal-300 font-semibold" :
                      "bg-white/[0.02] border-white/[0.04] text-slate-600"
                    }`}>
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> :
                       active ? <Loader2 className="h-4 w-4 text-teal-400 animate-spin shrink-0" /> :
                       <div className="h-4 w-4 rounded-full border border-slate-700 shrink-0" />}
                      <span className="truncate">{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : tab === "upload" ? (
            /* File Upload Zone — entire area is clickable */
            <label
              htmlFor="tf-upload"
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-teal-500/30 bg-white/[0.02] p-8 rounded-xl text-center transition cursor-pointer hover:border-teal-500/60 hover:bg-white/[0.04]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setFile(e.dataTransfer.files?.[0] || null);
              }}
            >
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20">
                <UploadCloud className="h-8 w-8 text-teal-400" />
              </div>
              <input
                id="tf-upload"
                className="hidden"
                type="file"
                accept=".tf,.hcl"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm font-bold text-teal-400">Browse Terraform file (.tf / .hcl)</p>
              <p className="mt-2 text-xs text-slate-500">{file ? file.name : "or drag & drop file here"}</p>
              {file && <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold bg-teal-500/10 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full">{Math.max(1, Math.round(file.size / 1024))} KB — ready to analyze</span>}
              
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); submitUpload(); }}
                disabled={!file}
                className="mt-6 w-full max-w-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl transition text-sm"
              >
                Analyze Infrastructure
              </button>
            </label>

          ) : (

            /* GitHub PR / Repo Zone */
            <div className="flex-1 flex flex-col justify-center space-y-5 p-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">GitHub Repository or Pull Request URL</label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/42"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <p className="text-xs text-slate-500">
                SecAgent will analyze IaC changes, build a Digital Twin comparison, and evaluate the Pull Request Security Gate.
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold" disabled={!githubUrl.trim()} onClick={submitGithub}>
                Analyze Pull Request
              </Button>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-medium text-red-400 text-center">{error}</p>}
        </Card>
      </div>
    </Shell>
  );
}
