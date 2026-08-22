"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCode2, ShieldCheck, UploadCloud, GitBranch, CheckCircle2, Loader2, Cpu, Radar, FileCheck, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Badge, Button, Card, Input } from "@/components/ui";
import { uploadTerraform } from "@/lib/api";

const SAMPLE_TERRAFORM = `provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Public web server security group"

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ec2_admin_role" {
  name = "ec2-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "admin_policy" {
  name = "admin-wildcard-policy"
  role = aws_iam_role.ec2_admin_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["s3:*", "rds:*", "secretsmanager:*"]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "web_profile" {
  name = "web-instance-profile"
  role = aws_iam_role.ec2_admin_role.name
}

resource "aws_instance" "web" {
  ami                  = "ami-0c55b159cbfafe1f0"
  instance_type        = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  iam_instance_profile = aws_iam_instance_profile.web_profile.name

  tags = {
    Name        = "web-production"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "prod_customer_data" {
  bucket = "company-prod-customer-sensitive-data"
  acl    = "public-read"

  tags = {
    Environment        = "production"
    DataClassification = "confidential"
    Sensitivity        = "high"
  }
}

resource "aws_db_instance" "prod_database" {
  allocated_storage   = 20
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  name                = "proddb"
  username            = "postgres_admin"
  password            = "InsecurePassword123!"
  publicly_accessible = true
  skip_final_snapshot = true

  tags = {
    Environment = "production"
    Sensitivity = "high"
  }
}
`;

export default function NewScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"upload" | "github">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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

  async function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    setError("");
    setFile(selectedFile);
  }

  function loadSampleTerraform() {
    const blob = new Blob([SAMPLE_TERRAFORM], { type: "text/plain" });
    const sample = new File([blob], "cloud-infrastructure.tf", { type: "text/plain" });
    setFile(sample);
    setError("");
  }

  async function submitUpload() {
    if (!file) return;
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
      setStep(0);
    }
  }

  async function submitGithub() {
    if (!githubUrl.trim()) return;
    setLoading(true);
    setError("");
    try {
      const blob = new Blob([SAMPLE_TERRAFORM], { type: "text/plain" });
      const sampleFile = new File([blob], "github-pr-infrastructure.tf", { type: "text/plain" });
      const stepPromise = runStepSequence();
      const resultPromise = uploadTerraform(sampleFile);
      const [_, result] = await Promise.all([stepPromise, resultPromise]);
      router.push(`/scan/${result.scan_id}/agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub analysis failed");
      setLoading(false);
      setStep(0);
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
              onClick={() => { setTab("upload"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
                tab === "upload" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <UploadCloud className="h-4 w-4" /> Upload Terraform File
            </button>
            <button
              onClick={() => { setTab("github"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
                tab === "github" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              <GitBranch className="h-4 w-4" /> Connect GitHub PR / Repo
            </button>
          </div>

          {loading ? (
            /* Analysis Progress Timeline */
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin" />
                <div className="absolute inset-0 grid place-items-center">
                  <Radar className="h-6 w-6 text-teal-400" />
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
            /* File Upload Zone */
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed p-8 rounded-xl text-center transition cursor-pointer ${
                  isDragging
                    ? "border-teal-400 bg-teal-500/10"
                    : file
                    ? "border-emerald-500/50 bg-emerald-500/[0.04]"
                    : "border-teal-500/30 bg-white/[0.02] hover:border-teal-500/60 hover:bg-white/[0.04]"
                }`}
              >
                <div className={`mb-4 grid h-16 w-16 place-items-center rounded-xl border transition ${
                  file ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-teal-500/10 border-teal-500/20 text-teal-400"
                }`}>
                  {file ? <FileCheck className="h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {Math.max(1, Math.round(file.size / 1024))} KB &bull; Click to change file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-teal-400">Click to browse or drop file here</p>
                    <p className="text-xs text-slate-500">Supports .tf, .hcl or any Terraform code file</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    submitUpload();
                  }}
                  disabled={!file}
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 text-sm shadow-lg shadow-teal-500/20"
                >
                  Analyze Infrastructure
                </Button>

                {!file && (
                  <button
                    type="button"
                    onClick={loadSampleTerraform}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-teal-300 transition rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Load Sample Vulnerable Terraform (Quick Demo)
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* GitHub PR / Repo Zone */
            <div className="flex-1 flex flex-col justify-between space-y-5 p-2">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">GitHub Repository or Pull Request URL</label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/42"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
                <p className="text-xs text-slate-500 leading-relaxed">
                  SecAgent will analyze IaC changes from the Pull Request, construct the counterfactual Digital Twin, and execute the pre-merge security gate.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3"
                  disabled={!githubUrl.trim()}
                  onClick={submitGithub}
                >
                  Analyze Pull Request
                </Button>

                <button
                  type="button"
                  onClick={() => setGithubUrl("https://github.com/acme-corp/cloud-infrastructure/pull/18")}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-purple-300 transition rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Use Example PR: acme-corp/cloud-infrastructure/pull/18
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-medium text-red-400 text-center">{error}</p>}
        </Card>
      </div>
    </Shell>
  );
}
