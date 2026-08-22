"use client";

import { Brain, FileCode } from "lucide-react";

export interface AIRemediationDiffProps {
  selectedFix?: {
    type?: string;
    label?: string;
  } | null;
}

export function AIRemediationDiff({ selectedFix }: AIRemediationDiffProps) {
  const fixType = (selectedFix?.type || "").toLowerCase();
  const fixLabel = (selectedFix?.label || "").toLowerCase();

  // Determine which diff to render based on fixType or fixLabel
  const isSecurityGroup =
    fixType.includes("security_group") ||
    fixType.includes("port_22") ||
    fixType.includes("close_port") ||
    fixLabel.includes("port 22") ||
    fixLabel.includes("ssh") ||
    fixLabel.includes("security group");

  const isS3 =
    fixType.includes("s3") ||
    fixType.includes("bucket") ||
    fixLabel.includes("s3") ||
    fixLabel.includes("bucket");

  const isEncryption =
    fixType.includes("encryption") ||
    fixType.includes("ebs") ||
    fixType.includes("volume") ||
    fixLabel.includes("encryption") ||
    fixLabel.includes("ebs");

  // Default to IAM if matches or fallback
  const isIAM =
    !isSecurityGroup && !isS3 && !isEncryption;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
            <Brain className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Remediation Patch</h2>
            <p className="text-[11px] text-slate-400">
              {selectedFix?.label ? `Fix: ${selectedFix.label}` : "Proposed Terraform fix"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 animate-pulse">
          AI PROPOSED PATCH
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-black overflow-hidden font-mono text-[11px]">
        <div className="flex items-center justify-between bg-white/[0.03] border-b border-white/[0.05] px-3 py-1.5 text-slate-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-slate-500" /> main.tf
          </span>
          <span className="text-[10px] text-emerald-400 font-sans font-semibold">
            {isSecurityGroup
              ? "Close 0.0.0.0/0 Ingress"
              : isS3
              ? "Enforce Private Bucket"
              : isEncryption
              ? "Enable KMS Encryption"
              : "Scope Wildcard Principal"}
          </span>
        </div>

        <div className="p-3 overflow-x-auto space-y-1">
          {isSecurityGroup && (
            <>
              <div className="text-slate-500">  resource "aws_security_group" "web_sg" {"{"}</div>
              <div className="text-slate-500">    name        = "web_server_sg"</div>
              <div className="text-slate-500">    description = "Allow restricted SSH and web ingress"</div>
              <div className="text-slate-500"> </div>
              <div className="text-slate-500">    ingress {"{"}</div>
              <div className="text-slate-500">      from_port   = 22</div>
              <div className="text-slate-500">      to_port     = 22</div>
              <div className="text-slate-500">      protocol    = "tcp"</div>
              <div className="flex bg-red-500/20 text-red-300">
                <span className="w-4 select-none">-</span>
                <span>      cidr_blocks = ["0.0.0.0/0"]</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>      cidr_blocks = ["10.0.0.0/16"]  # Restricted to internal VPC</span>
              </div>
              <div className="text-slate-500">    {"}"}</div>
              <div className="text-slate-500">  {"}"}</div>
            </>
          )}

          {isS3 && (
            <>
              <div className="text-slate-500">  resource "aws_s3_bucket" "data_store" {"{"}</div>
              <div className="text-slate-500">    bucket = "production-data-store"</div>
              <div className="flex bg-red-500/20 text-red-300">
                <span className="w-4 select-none">-</span>
                <span>    acl    = "public-read"</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    acl    = "private"</span>
              </div>
              <div className="text-slate-500">  {"}"}</div>
              <div className="text-slate-500"> </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>  resource "aws_s3_bucket_public_access_block" "block" {"{"}</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    bucket                  = aws_s3_bucket.data_store.id</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    block_public_acls       = true</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    block_public_policy     = true</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    restrict_public_buckets = true</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>  {"}"}</span>
              </div>
            </>
          )}

          {isEncryption && (
            <>
              <div className="text-slate-500">  resource "aws_ebs_volume" "app_data" {"{"}</div>
              <div className="text-slate-500">    availability_zone = "us-east-1a"</div>
              <div className="text-slate-500">    size              = 40</div>
              <div className="flex bg-red-500/20 text-red-300">
                <span className="w-4 select-none">-</span>
                <span>    encrypted         = false</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    encrypted         = true</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>    kms_key_id        = "arn:aws:kms:us-east-1:123456789012:key/app-ebs-key"</span>
              </div>
              <div className="text-slate-500">  {"}"}</div>
            </>
          )}

          {isIAM && (
            <>
              <div className="text-slate-500">  resource "aws_iam_role_policy" "example" {"{"}</div>
              <div className="text-slate-500">    name = "example"</div>
              <div className="text-slate-500">    role = aws_iam_role.example.id</div>
              <div className="text-slate-500"> </div>
              <div className="text-slate-500">    policy = jsonencode({"{"}</div>
              <div className="text-slate-500">      Statement = [{"{"}</div>
              <div className="text-slate-500">        Action   = "sts:AssumeRole"</div>
              <div className="text-slate-500">        Effect   = "Allow"</div>
              <div className="flex bg-red-500/20 text-red-300">
                <span className="w-4 select-none">-</span>
                <span>        Resource = "*"</span>
              </div>
              <div className="flex bg-emerald-500/20 text-emerald-300">
                <span className="w-4 select-none">+</span>
                <span>        Resource = ["arn:aws:iam::123456789012:role/specific-role"]</span>
              </div>
              <div className="text-slate-500">      {"}"}]</div>
              <div className="text-slate-500">    {"}"})</div>
              <div className="text-slate-500">  {"}"}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
