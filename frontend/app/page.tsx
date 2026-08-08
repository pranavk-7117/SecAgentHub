"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck, ArrowRight, Zap, Cpu, Lock, Network,
  CheckCircle2, ShieldAlert, KeyRound, ClipboardCheck,
  Route, Sparkles, FileCode2, CreditCard, BarChart3,
  ChevronDown, Globe, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const AGENTS = [
  {
    icon: ShieldAlert,
    color: "teal",
    badge: "0.25 USDC",
    name: "Misconfiguration Agent",
    desc: "Uses Checkov to detect open security groups, missing encryption, exposed resources, hardcoded credentials, and storage misconfigurations.",
    tags: ["Open Ports", "S3 Exposure", "Missing Encryption"],
  },
  {
    icon: KeyRound,
    color: "violet",
    badge: "0.30 USDC",
    name: "IAM Risk Agent",
    desc: "Analyses Identity & Access Management configurations for wildcard permissions, admin access abuse, and least privilege violations.",
    tags: ["Wildcard IAM", "Privilege Escalation", "Over-permissive Roles"],
  },
  {
    icon: ClipboardCheck,
    color: "emerald",
    badge: "0.20 USDC",
    name: "Compliance Agent",
    desc: "Evaluates infrastructure against CIS Benchmarks, NIST, PCI DSS, HIPAA, and AWS Security Best Practices. Returns a compliance score.",
    tags: ["CIS Benchmarks", "PCI DSS", "HIPAA"],
  },
  {
    icon: Route,
    color: "amber",
    badge: "0.35 USDC",
    name: "Attack Path Agent",
    desc: "Builds a graph-based attack topology to identify lateral movement opportunities, blast radius, and highest-risk resources.",
    tags: ["Attack Graphs", "Blast Radius", "Lateral Movement"],
  },
  {
    icon: Sparkles,
    color: "cyan",
    badge: "0.50 USDC",
    name: "AI Remediation Agent",
    desc: "Uses an LLM to explain vulnerabilities in plain English, suggest Terraform fixes, and answer developer questions interactively.",
    tags: ["Terraform Fixes", "Plain English", "AI Chat"],
  },
];

const WORKFLOW = [
  { icon: KeyRound, label: "Developer Login", sub: "Authenticated via Supabase Auth" },
  { icon: FileCode2, label: "Upload IaC File", sub: "Terraform (.tf) or HCL" },
  { icon: ShieldAlert, label: "Checkov Scan", sub: "Automatic policy analysis" },
  { icon: Cpu, label: "Select AI Agents", sub: "Pay-per-agent model" },
  { icon: CreditCard, label: "x402 Payment", sub: "USDC on Algorand" },
  { icon: CheckCircle2, label: "Agents Execute", sub: "On-chain verification" },
  { icon: Route, label: "Attack Graph", sub: "Graph-based risk mapping" },
  { icon: BarChart3, label: "Dashboard Report", sub: "Download PDF audit" },
];

const colorMap: Record<string, { bg: string; border: string; text: string; tag: string }> = {
  teal:   { bg: "bg-teal-500/10",   border: "border-teal-500/20",   text: "text-teal-400",   tag: "bg-teal-500/10 text-teal-300 border-teal-500/20" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", tag: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  emerald:{ bg: "bg-emerald-500/10",border: "border-emerald-500/20",text: "text-emerald-400",tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-400",  tag: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  cyan:   { bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   text: "text-cyan-400",   tag: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
};

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 font-sans overflow-x-hidden">

      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-teal-500/8 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-violet-500/6 blur-[160px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-emerald-500/5 blur-[160px] rounded-full" />
      </div>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080c14]/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/25 transition group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 text-slate-950" />
            </span>
            <div>
              <span className="block text-[15px] font-bold text-white tracking-tight leading-none">SecAgent Hub</span>
              <span className="block text-[10px] font-semibold text-teal-400 uppercase tracking-widest">AI Security Marketplace</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {["#features", "#agents", "#workflow", "#pricing"].map((href, i) => (
              <a key={href} href={href} className="px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition font-medium">
                {["Features", "AI Agents", "Workflow", "Pricing"][i]}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold shadow-lg shadow-teal-500/20">
                  Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition px-3 py-2">
                  Sign In
                </Link>
                <Link href="/login">
                  <Button className="border border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold backdrop-blur">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-12 text-center">
        {/* Pill badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/5 px-4 py-2 text-xs font-bold text-teal-400 backdrop-blur tracking-wider uppercase">
          <Zap className="h-3.5 w-3.5" />
          Powered by Algorand x402 · Hackathon 2026
        </div>

        <h1 className="text-5xl md:text-[76px] font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.05]">
          AI Security Agents for{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-500 bg-clip-text text-transparent">
              Cloud Infrastructure
            </span>
            <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-teal-500/50 via-emerald-400/50 to-transparent" />
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Upload your Terraform files. Select specialised AI security agents. Pay only for the analysis you need — all verified on-chain via <strong className="text-teal-400 font-semibold">x402 micropayments</strong>.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-base px-8 py-6 font-black shadow-2xl shadow-teal-500/20">
              Start Free Security Scan <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <a href="#agents">
            <Button className="w-full sm:w-auto border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 text-base px-8 py-6 font-semibold backdrop-blur">
              Explore AI Agents <ChevronDown className="h-4 w-4 ml-1.5" />
            </Button>
          </a>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden max-w-4xl mx-auto">
          {[
            { val: "5", label: "Specialist AI Agents" },
            { val: "< $0.001", label: "Algorand Tx Fee" },
            { val: "30s", label: "Average Scan Time" },
            { val: "100%", label: "On-Chain Verified" },
          ].map(({ val, label }) => (
            <div key={label} className="bg-[#0d1320] px-6 py-5 text-left">
              <span className="block text-2xl font-black text-white">{val}</span>
              <span className="block text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">The Problem We Solve</p>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Security Analysis Should Be<br />
            <span className="text-slate-400">Accessible, Not Expensive</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Globe,
              title: "No More Subscriptions",
              desc: "Enterprise security platforms cost thousands per month. SecAgent Hub uses x402 micropayments — pay per analysis, not per seat.",
              color: "teal",
            },
            {
              icon: Cpu,
              title: "AI-Powered Insights",
              desc: "Raw Checkov output is hard to parse. Our AI agents turn hundreds of findings into prioritised, actionable intelligence.",
              color: "violet",
            },
            {
              icon: Network,
              title: "Graph-Based Risk Mapping",
              desc: "Understand how vulnerabilities connect. Visualise lateral movement paths and blast radius before attackers do.",
              color: "emerald",
            },
          ].map(({ icon: Icon, title, desc, color }) => {
            const c = colorMap[color];
            return (
              <div key={title} className="group border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-7 transition">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border} mb-5 transition group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AI Agents Marketplace ── */}
      <section id="agents" className="relative z-10 border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">AI Security Agents</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Pick Only What You Need
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">
              Each agent is a specialised expert. Select one or combine several — each runs independently and is paid via a unique x402 challenge.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {AGENTS.map(({ icon: Icon, color, badge, name, desc, tags }) => {
              const c = colorMap[color];
              return (
                <div key={name} className={`group relative border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-6 transition hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl`}>
                  <div className="flex items-start justify-between mb-4">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${c.tag}`}>
                      {badge} / run
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">{desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${c.tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Empty 6th slot – CTA card */}
            <div className="border border-dashed border-teal-500/30 bg-teal-500/3 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Zap className="h-6 w-6 text-teal-400" />
              </span>
              <p className="text-white font-bold">Ready to audit your infrastructure?</p>
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold">
                  Launch Free Scan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="relative z-10 border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              From Upload to Insight in Minutes
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-[22px] left-[calc(6.25%+22px)] right-[calc(6.25%+22px)] h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {WORKFLOW.map(({ icon: Icon, label, sub }, i) => (
                <div key={label} className="flex flex-col items-center text-center gap-3 group">
                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0d1320] border border-white/10 text-teal-400 group-hover:border-teal-500/40 group-hover:bg-teal-500/5 transition z-10 relative">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-teal-500 text-slate-950 text-[9px] font-black">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-tight">{label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why x402 ── */}
      <section className="relative z-10 border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Why x402 + Algorand?</p>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Pay-Per-Analysis,<br />Not Per Seat
              </h2>
              <p className="mt-5 text-slate-400 text-lg leading-relaxed">
                Traditional security platforms demand expensive monthly subscriptions. SecAgent Hub introduces a <strong className="text-white">pay-per-analysis</strong> model where every transaction is verified on-chain via the Algorand blockchain.
              </p>
              <ul className="mt-7 space-y-4">
                {[
                  ["No subscriptions", "Select agents and pay only for the analyses you run."],
                  ["On-chain receipts", "Every payment is verified against a unique challenge note on Algorand."],
                  ["Results locked to payments", "Reports and findings are locked until your payment is confirmed on-chain."],
                  ["Near-zero fees", "Algorand transactions cost less than $0.001, making micropayments practical."],
                ].map(([title, text]) => (
                  <li key={title} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300"><strong className="text-white">{title}:</strong> {text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* x402 Flow Visual */}
            <div className="border border-white/5 bg-white/[0.02] rounded-2xl p-6 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">x402 Transaction Flow</p>
              {[
                { step: "01", label: "Select Agents", detail: "User picks from 5 specialist agents", color: "teal" },
                { step: "02", label: "HTTP 402 Challenge", detail: "Backend issues payment challenge with unique nonce", color: "violet" },
                { step: "03", label: "Algorand USDC Transfer", detail: "Signed via Pera Wallet with embedded challenge note", color: "emerald" },
                { step: "04", label: "On-chain Verification", detail: "Indexer confirms receiver, asset ID, amount & note", color: "amber" },
                { step: "05", label: "Agents Execute & Report", detail: "Results unlocked, PDF report available for download", color: "teal" },
              ].map(({ step, label, detail, color }) => {
                const c = colorMap[color];
                return (
                  <div key={step} className={`flex items-start gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${c.bg} ${c.text} text-xs font-black border ${c.border}`}>
                      {step}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Pay Only for What You Run
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Free */}
            <div className="border border-white/5 bg-white/[0.02] rounded-2xl p-8">
              <h3 className="text-base font-bold text-slate-400 uppercase tracking-widest mb-2">Static Scanner</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-slate-500 text-sm">/ forever</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Upload IaC files and get Checkov findings with no cost. Ideal for developers wanting a baseline view.</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                {["Terraform .tf file upload", "Checkov static analysis", "Security findings list", "Dashboard access"].map(f => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-600" />{f}</li>
                ))}
              </ul>
            </div>

            {/* Paid */}
            <div className="border-2 border-teal-500/50 bg-teal-500/[0.03] rounded-2xl p-8 relative">
              <span className="absolute -top-px left-6 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                Recommended
              </span>
              <h3 className="text-base font-bold text-teal-400 uppercase tracking-widest mb-2">AI Agent Analysis</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-black text-white">0.20</span>
                <span className="text-slate-400 text-sm">— 0.50 USDC / agent</span>
              </div>
              <p className="text-slate-300 text-sm mb-6">Select and pay for only the specialist agents you need. All payments verified on Algorand. Results locked until confirmed.</p>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {[
                  "5 specialist AI security agents",
                  "Pera Wallet x402 payments",
                  "Attack graph visualisation",
                  "Compliance scoring (CIS, NIST, PCI DSS)",
                  "AI remediation + interactive chat",
                  "On-chain receipt per transaction",
                  "PDF audit report download",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" />{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 border-t border-white/5 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-500/3 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-3xl px-6 relative">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Stop Guessing.<br />
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Start Securing.</span>
          </h2>
          <p className="mt-5 text-slate-400 text-lg max-w-xl mx-auto">
            Upload your Terraform template, run specialist AI agents, and get a full security audit — in under a minute.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-base px-10 py-6 font-black shadow-2xl shadow-teal-500/20">
                Launch the App <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition">
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-10 bg-[#060a10]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500">
              <ShieldCheck className="h-4 w-4 text-slate-950" />
            </span>
            <span className="text-sm font-bold text-slate-300">SecAgent Hub</span>
            <span className="text-xs text-slate-600">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#agents" className="hover:text-white transition">AI Agents</a>
            <a href="#workflow" className="hover:text-white transition">Workflow</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="/login" className="hover:text-white transition">Login</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
