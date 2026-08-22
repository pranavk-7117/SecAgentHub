"use client";

import { Brain } from "lucide-react";

export function AIRemediationDiff() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
            <Brain className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Remediation Patch</h2>
            <p className="text-[11px] text-slate-400">Proposed Terraform fix</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 animate-pulse">
          AI PROPOSED PATCH
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-black overflow-hidden font-mono text-[11px]">
        <div className="flex bg-white/[0.03] border-b border-white/[0.05] px-3 py-1.5 text-slate-400 text-[10px]">
          main.tf
        </div>
        <div className="p-3 overflow-x-auto space-y-1">
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
        </div>
      </div>
    </div>
  );
}
