"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck, ArrowRight, Zap, Cpu, Lock, Network,
  CheckCircle2, ShieldAlert, KeyRound, ClipboardCheck,
  Route, Sparkles, CreditCard, BarChart3, DollarSign,
  TrendingUp, Shield, AlertTriangle, Activity
} from "lucide-react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const AGENTS = [
  {
    icon: ShieldAlert,
    color: "teal",
    badge: "0.25 USDC",
    name: "Misconfiguration Agent",
    desc: "Surfaces publicly exposed resources, open security groups, missing encryption, and hardcoded credentials across your IaC — ranked by severity and exploitability.",
    tags: ["Open Ports", "S3 Exposure", "Missing Encryption"],
  },
  {
    icon: KeyRound,
    color: "violet",
    badge: "0.30 USDC",
    name: "IAM Risk Agent",
    desc: "Analyses every IAM role, policy, and binding for wildcard permissions, administrator access abuse, and least-privilege violations before they become a breach.",
    tags: ["Wildcard Permissions", "Privilege Escalation", "Least Privilege"],
  },
  {
    icon: ClipboardCheck,
    color: "emerald",
    badge: "0.20 USDC",
    name: "Compliance Agent",
    desc: "Maps your infrastructure against CIS Benchmarks, NIST 800-53, PCI DSS, and HIPAA. Returns a scored report with specific control failures and remediation references.",
    tags: ["CIS Benchmarks", "NIST 800-53", "PCI DSS"],
  },
  {
    icon: Route,
    color: "amber",
    badge: "0.35 USDC",
    name: "Attack Path Agent",
    desc: "Constructs a graph-based attack topology from your resource configuration. Identifies viable lateral movement paths and the blast radius of each exploitable entry point.",
    tags: ["Attack Graphs", "Lateral Movement", "Blast Radius"],
  },
  {
    icon: Sparkles,
    color: "cyan",
    badge: "0.50 USDC",
    name: "AI Remediation Agent",
    desc: "Translates raw findings into plain-English explanations, concrete Terraform code fixes, and prioritised remediation steps your team can act on immediately.",
    tags: ["Terraform Fixes", "Plain-English", "AI Reasoning"],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; tag: string }> = {
  teal:    { bg: "bg-teal-500/10",    border: "border-teal-500/20",    text: "text-teal-400",    tag: "bg-teal-500/10 text-teal-300 border-teal-500/20" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  tag: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   tag: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    tag: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
};

// Mock scan findings for the hero visual
const MOCK_FINDINGS = [
  { sev: "HIGH",   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    label: "S3 bucket publicly accessible",       res: "aws_s3_bucket.assets" },
  { sev: "HIGH",   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    label: "Security group allows 0.0.0.0/0",     res: "aws_security_group.web" },
  { sev: "MEDIUM", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  label: "IAM role with wildcard permissions",   res: "aws_iam_role.deploy" },
  { sev: "MEDIUM", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  label: "RDS instance not encrypted at rest",  res: "aws_db_instance.prod" },
  { sev: "LOW",    color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20",  label: "CloudTrail logging disabled",          res: "aws_cloudtrail.main" },
];

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % MOCK_FINDINGS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 overflow-x-hidden" style={{ fontFamily: "'Inter', 'system-ui', sans-serif" }}>

      {/* ── Grid background ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(20,184,166,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* ── Ambient glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-teal-500/7 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] right-[-8%] w-[600px] h-[600px] bg-violet-500/4 blur-[180px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-8%] w-[600px] h-[500px] bg-emerald-500/4 blur-[180px] rounded-full" />
      </div>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07090f]/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl flex h-[62px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/25 transition group-hover:scale-105">
              <ShieldCheck className="h-4 w-4 text-[#07090f]" />
            </span>
            <span className="text-[15px] font-bold text-white tracking-tight">SecAgent Hub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {[["#features", "Why Us"], ["#agents", "Agents"], ["#pricing", "Pricing"]].map(([href, label]) => (
              <a key={href} href={href} className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <button className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[13px] font-bold px-4 py-2 rounded-lg shadow-lg shadow-teal-500/20 transition">
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[13px] font-medium text-slate-400 hover:text-white transition">
                  Sign In
                </Link>
                <Link href="/login">
                  <button className="text-[13px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg transition backdrop-blur">
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Copy */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/5 px-3.5 py-1.5 text-[11px] font-bold text-teal-400 tracking-widest uppercase">
              <Shield className="h-3 w-3" />
              AI-Powered · Pay Per Analysis
            </div>

            <h1 className="text-5xl lg:text-[60px] font-black tracking-[-0.03em] text-white leading-[1.06]">
              Security Agents<br />
              for Cloud{" "}
              <span className="relative whitespace-nowrap">
                <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Infrastructure
                </span>
              </span>
            </h1>

            <p className="mt-5 text-[17px] text-slate-400 max-w-lg leading-relaxed">
              Upload your Terraform configuration, select specialist AI security agents, and get deep infrastructure analysis — paying only per analysis, verified on-chain.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href={user ? "/dashboard" : "/login"}>
                <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[15px] px-7 py-3.5 font-black rounded-xl shadow-2xl shadow-teal-500/20 transition">
                  Run a Security Scan <ArrowRight className="h-4.5 w-4.5" />
                </button>
              </Link>
              <a href="#agents">
                <button className="flex items-center justify-center gap-2 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 text-[15px] px-7 py-3.5 font-semibold rounded-xl transition">
                  View Agents
                </button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex items-center gap-5 text-[12px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />No subscription required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />Results in under a minute</span>
            </div>
          </div>

          {/* Right: Mock scan terminal */}
          <div className="relative">
            {/* Glow behind card */}
            <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-3xl scale-95" />
            <div className="relative border border-white/8 bg-[#0c1018] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-[11px] font-mono text-slate-500">main.tf — Security Scan</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Scanning
                </span>
              </div>

              {/* Scan progress */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400">Analysis Progress</span>
                  <span className="text-[11px] font-bold text-teal-400">94%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" />
                </div>
              </div>

              {/* Risk summary */}
              <div className="grid grid-cols-3 gap-2 px-4 py-3">
                {[
                  { count: "2", label: "High Risk", color: "text-red-400", bg: "bg-red-500/8 border-red-500/15" },
                  { count: "2", label: "Medium Risk", color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/15" },
                  { count: "1", label: "Low Risk", color: "text-slate-400", bg: "bg-slate-500/8 border-slate-500/15" },
                ].map(({ count, label, color, bg }) => (
                  <div key={label} className={`${bg} border rounded-xl px-3 py-2.5 text-center`}>
                    <span className={`block text-xl font-black ${color}`}>{count}</span>
                    <span className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</span>
                  </div>
                ))}
              </div>

              {/* Findings list */}
              <div className="px-4 pb-4 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Findings</p>
                {MOCK_FINDINGS.map(({ sev, color, bg, border, label, res }, idx) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-500 ${
                      activeIdx === idx ? `${bg} ${border}` : "border-transparent"
                    }`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${bg} ${color} border ${border} shrink-0`}>
                      {sev}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-200 truncate">{label}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{res}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Agent badges */}
              <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                <p className="w-full text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Agents Selected</p>
                {["Misconfiguration", "IAM Risk", "Attack Path"].map(a => (
                  <span key={a} className="text-[10px] font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
          {[
            { val: "5", label: "Specialist AI Agents", icon: Cpu },
            { val: "0.20–0.50", label: "USDC per Agent Run", icon: DollarSign },
            { val: "< 60s", label: "Time to Full Report", icon: Activity },
            { val: "100%", label: "On-Chain Verified", icon: Shield },
          ].map(({ val, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 border border-white/[0.05] bg-white/[0.02] rounded-xl px-4 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-500/10 border border-teal-500/15">
                <Icon className="h-4 w-4 text-teal-400" />
              </span>
              <div>
                <span className="block text-lg font-black text-white leading-none">{val}</span>
                <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why SecAgent Hub ── */}
      <section id="features" className="relative z-10 border-t border-white/[0.05] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-3">Why SecAgent Hub</p>
            <h2 className="text-3xl md:text-[46px] font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Security Scanning That<br />Tells You What to Do
            </h2>
            <p className="mt-5 text-slate-400 text-[17px] max-w-xl mx-auto leading-relaxed">
              Most tools produce a wall of findings and leave remediation to you. Our AI agents contextualise risk and deliver precise, actionable guidance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: DollarSign, color: "teal",
                title: "Analyse What You Need",
                desc: "Choose from five specialised agents and run only the analyses relevant to your threat model. Each agent operates independently — no bundle deals, no wasted spend.",
              },
              {
                icon: TrendingUp, color: "violet",
                title: "AI-Driven Prioritisation",
                desc: "Our agents don't just surface issues — they rank findings by exploitability and business impact, and tell you exactly what to fix first.",
              },
              {
                icon: Network, color: "emerald",
                title: "Attack-Path Visibility",
                desc: "Understand how vulnerabilities chain together. Graph-based analysis maps realistic attack paths through your infrastructure before threat actors do.",
              },
            ].map(({ icon: Icon, color, title, desc }) => {
              const c = colorMap[color];
              return (
                <div key={title} className="group border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] rounded-2xl p-7 transition hover:-translate-y-0.5">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border} mb-5`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-[17px] font-bold text-white mb-2.5">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Agents ── */}
      <section id="agents" className="relative z-10 border-t border-white/[0.05] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-14">
            <div>
              <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-3">AI Security Agents</p>
              <h2 className="text-3xl md:text-[46px] font-black text-white tracking-tight leading-tight">
                Pick the Expertise<br />You Need
              </h2>
            </div>
            <p className="text-slate-400 text-[15px] max-w-sm leading-relaxed md:text-right">
              Each agent is purpose-built for a specific security discipline — run them individually or combine them.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {AGENTS.map(({ icon: Icon, color, badge, name, desc, tags }) => {
              const c = colorMap[color];
              return (
                <div key={name} className="group relative border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-6 transition hover:-translate-y-0.5 hover:border-white/10 hover:shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full border ${c.tag}`}>
                      {badge} / run
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-white mb-2">{name}</h3>
                  <p className="text-slate-400 text-[13px] leading-relaxed mb-4">{desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${c.tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="border border-dashed border-teal-500/20 bg-teal-500/[0.02] rounded-2xl p-6 flex flex-col justify-between gap-6">
              <div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20 mb-4">
                  <Zap className="h-5 w-5 text-teal-400" />
                </span>
                <h3 className="text-[16px] font-bold text-white mb-2">Ready to audit your infrastructure?</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">Sign in, upload your Terraform file, and select the agents that match your threat model.</p>
              </div>
              <Link href={user ? "/dashboard" : "/login"}>
                <button className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-[#07090f] text-[13px] font-black px-5 py-2.5 rounded-lg">
                  Get Started <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 border-t border-white/[0.05] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-3">Pricing</p>
            <h2 className="text-3xl md:text-[46px] font-black text-white tracking-tight">
              Pay for What You Run
            </h2>
            <p className="mt-4 text-slate-400 text-[17px] max-w-lg mx-auto">
              Each agent run is a discrete, on-chain transaction. No recurring charges, no hidden fees.
            </p>
          </div>

          <div className="max-w-2xl mx-auto border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.015] mb-10">
            <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-white/[0.02] px-5 py-3 border-b border-white/[0.05]">
              <span>Agent</span>
              <span className="text-center">Primary Capability</span>
              <span className="text-right">Price / Run</span>
            </div>
            {AGENTS.map(({ icon: Icon, color, name, badge, tags }) => {
              const c = colorMap[color];
              return (
                <div key={name} className="grid grid-cols-3 items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg ${c.bg} ${c.text} border ${c.border} shrink-0`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-semibold text-white">{name}</span>
                  </div>
                  <p className="text-center text-[12px] text-slate-500">{tags[0]}</p>
                  <p className={`text-right text-[13px] font-bold ${c.text}`}>{badge}</p>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: CreditCard, title: "Wallet Payments",       desc: "Sign each transaction in Pera Wallet. Every payment includes a unique on-chain note for verification." },
              { icon: Lock,        title: "Results Locked",        desc: "Reports are only unlocked after your transaction is confirmed on-chain — guaranteed by the backend." },
              { icon: BarChart3,   title: "PDF Audit Reports",     desc: "Download a full audit report after any successful agent run for records or team review." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-white/[0.06] bg-white/[0.015] rounded-xl p-5 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/15 mx-auto mb-3">
                  <Icon className="h-4 w-4 text-teal-400" />
                </span>
                <h4 className="text-[14px] font-bold text-white mb-1.5">{title}</h4>
                <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 border-t border-white/[0.05] py-28 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-teal-500/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-2xl px-6 relative">
          <h2 className="text-4xl md:text-[58px] font-black text-white tracking-tight leading-[1.07]">
            Audit Your Infrastructure.<br />
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Before Attackers Do.
            </span>
          </h2>
          <p className="mt-5 text-slate-400 text-[17px] leading-relaxed max-w-lg mx-auto">
            Upload a Terraform file, run the agents that match your risk profile, and get a comprehensive security report — paid per run, verified on-chain.
          </p>
          <div className="mt-9">
            <Link href={user ? "/dashboard" : "/login"}>
              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[15px] px-10 py-4 font-black rounded-xl shadow-2xl shadow-teal-500/20 transition">
                Run Your First Scan <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-[#060810] py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500">
              <ShieldCheck className="h-3.5 w-3.5 text-[#07090f]" />
            </span>
            <span className="text-sm font-bold text-slate-300">SecAgent Hub</span>
            <span className="text-xs text-slate-600">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] font-semibold text-slate-500">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#agents" className="hover:text-white transition">Agents</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
