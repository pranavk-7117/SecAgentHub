"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck, ArrowRight, Zap, Cpu, Lock, Network,
  CheckCircle2, ShieldAlert, KeyRound, ClipboardCheck,
  Route, Sparkles, CreditCard, BarChart3, DollarSign,
  Globe, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const AGENTS = [
  {
    icon: ShieldAlert,
    color: "teal",
    badge: "0.25 USDC",
    name: "Misconfiguration Agent",
    desc: "Runs a deep Checkov policy scan across your Infrastructure-as-Code to surface publicly exposed resources, open security groups, missing encryption, hardcoded credentials, and storage misconfigurations — ranked by severity.",
    tags: ["Open Ports", "S3 Exposure", "Missing Encryption", "Hardcoded Secrets"],
  },
  {
    icon: KeyRound,
    color: "violet",
    badge: "0.30 USDC",
    name: "IAM Risk Agent",
    desc: "Analyses every IAM role, policy, and binding in your configuration for wildcard permissions, administrator access abuse, and least-privilege violations — before they become a real breach.",
    tags: ["Wildcard Permissions", "Privilege Escalation", "Least Privilege"],
  },
  {
    icon: ClipboardCheck,
    color: "emerald",
    badge: "0.20 USDC",
    name: "Compliance Agent",
    desc: "Maps your infrastructure against CIS Benchmarks, NIST 800-53, PCI DSS, HIPAA, and AWS Security Best Practices. Returns a scored report with specific control failures and remediation references.",
    tags: ["CIS Benchmarks", "NIST 800-53", "PCI DSS", "HIPAA"],
  },
  {
    icon: Route,
    color: "amber",
    badge: "0.35 USDC",
    name: "Attack Path Agent",
    desc: "Constructs a graph-based attack topology from your resource configuration. Identifies viable lateral movement paths, reachable critical assets, and the blast radius of each exploitable entry point.",
    tags: ["Attack Graph", "Lateral Movement", "Blast Radius"],
  },
  {
    icon: Sparkles,
    color: "cyan",
    badge: "0.50 USDC",
    name: "AI Remediation Agent",
    desc: "Uses a large language model to translate raw security findings into plain-English explanations, concrete Terraform code fixes, and prioritised remediation steps your team can act on immediately.",
    tags: ["Terraform Fixes", "Plain-English Explanations", "AI Reasoning"],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; tag: string; glow: string }> = {
  teal:    { bg: "bg-teal-500/10",    border: "border-teal-500/20",    text: "text-teal-400",    tag: "bg-teal-500/10 text-teal-300 border-teal-500/20",    glow: "group-hover:shadow-teal-500/10" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  tag: "bg-violet-500/10 text-violet-300 border-violet-500/20",  glow: "group-hover:shadow-violet-500/10" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", glow: "group-hover:shadow-emerald-500/10" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   tag: "bg-amber-500/10 text-amber-300 border-amber-500/20",   glow: "group-hover:shadow-amber-500/10" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    tag: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",    glow: "group-hover:shadow-cyan-500/10" },
};

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 overflow-x-hidden" style={{ fontFamily: "'Inter', 'system-ui', sans-serif" }}>

      {/* ── Ambient glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/6 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 right-[-10%] w-[500px] h-[500px] bg-violet-500/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-[-5%] w-[500px] h-[400px] bg-emerald-500/4 blur-[150px] rounded-full" />
      </div>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07090f]/85 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/20 transition group-hover:scale-105">
              <ShieldCheck className="h-4 w-4 text-slate-950" />
            </span>
            <div className="leading-none">
              <span className="block text-[15px] font-bold text-white tracking-tight">SecAgent Hub</span>
              <span className="block text-[9px] font-semibold text-teal-400 uppercase tracking-[0.15em] mt-0.5">AI Security Marketplace</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[["#features", "Features"], ["#agents", "Agents"], ["#pricing", "Pricing"]].map(([href, label]) => (
              <a key={href} href={href} className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/20 px-5">
                  Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[13px] font-medium text-slate-400 hover:text-white transition px-3 py-2">
                  Sign In
                </Link>
                <Link href="/login">
                  <Button className="border border-teal-500/40 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-sm font-semibold px-5">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-16 text-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/5 px-4 py-1.5 text-[11px] font-bold text-teal-400 tracking-widest uppercase">
          <Zap className="h-3 w-3" />
          x402 Micropayments · Algorand Blockchain
        </div>

        <h1 className="text-5xl md:text-[72px] font-black tracking-[-0.03em] text-white max-w-5xl mx-auto leading-[1.04]">
          Specialist AI Security<br />
          <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
            Agents for IaC
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload your Terraform files, select the security agents your team needs, and receive deep, AI-powered analysis in minutes — paying only for each analysis you run.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={user ? "/dashboard" : "/login"}>
            <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-[15px] px-8 py-6 font-black shadow-2xl shadow-teal-500/20 rounded-xl">
              Run a Security Scan <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <a href="#agents">
            <Button className="border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] text-[15px] px-8 py-6 font-semibold rounded-xl backdrop-blur">
              View All Agents
            </Button>
          </a>
        </div>

        {/* Metrics */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/5 border border-white/5 rounded-2xl overflow-hidden max-w-3xl mx-auto bg-white/[0.015]">
          {[
            { val: "5", label: "Specialist AI Agents" },
            { val: "0.20–0.50", label: "USDC per Agent Run" },
            { val: "~30s", label: "Average Scan Time" },
            { val: "100%", label: "On-Chain Verified" },
          ].map(({ val, label }) => (
            <div key={label} className="px-6 py-5 text-left">
              <span className="block text-2xl font-black text-white">{val}</span>
              <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem / Features ── */}
      <section id="features" className="relative z-10 border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.18em] mb-3">The Problem</p>
            <h2 className="text-3xl md:text-[44px] font-black text-white tracking-tight">
              Checkov Findings Are Just the Beginning
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Static scanners produce hundreds of findings but can't tell you which ones matter, how they connect, or how to fix them. That's where SecAgent Hub's AI agents come in.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Globe,
                color: "teal",
                title: "Pay Per Analysis",
                desc: "No subscriptions, no seat licences. Every agent run costs a fixed amount of USDC, paid directly on the Algorand blockchain via x402 micropayments.",
              },
              {
                icon: Cpu,
                color: "violet",
                title: "Prioritised AI Intelligence",
                desc: "Our agents don't just list findings — they rank, explain, and connect them. Understand exactly which vulnerabilities to fix first and why.",
              },
              {
                icon: Network,
                color: "emerald",
                title: "Graph-Based Attack Modelling",
                desc: "Visualise how an attacker would move through your infrastructure. Map lateral paths, identify blast radius, and secure your critical assets proactively.",
              },
            ].map(({ icon: Icon, color, title, desc }) => {
              const c = colorMap[color];
              return (
                <div key={title} className="group border border-white/[0.06] bg-white/[0.018] hover:bg-white/[0.03] rounded-2xl p-7 transition">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border} mb-5`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-[18px] font-bold text-white mb-2.5">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Agents ── */}
      <section id="agents" className="relative z-10 border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.18em] mb-3">AI Security Agents</p>
            <h2 className="text-3xl md:text-[44px] font-black text-white tracking-tight">
              Select the Expertise You Need
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">
              Each agent is a purpose-built security expert. Run them individually or combine them — each executes independently with its own x402 payment challenge.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {AGENTS.map(({ icon: Icon, color, badge, name, desc, tags }) => {
              const c = colorMap[color];
              return (
                <div
                  key={name}
                  className={`group relative border border-white/[0.06] bg-white/[0.018] hover:bg-white/[0.03] rounded-2xl p-7 transition hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl ${c.glow}`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${c.tag}`}>
                      {badge} / run
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2.5">{name}</h3>
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

            {/* CTA slot */}
            <div className="border border-dashed border-teal-500/20 bg-teal-500/[0.02] rounded-2xl p-7 flex flex-col items-start justify-between gap-6">
              <div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20 mb-5">
                  <Zap className="h-5 w-5 text-teal-400" />
                </span>
                <h3 className="text-[17px] font-bold text-white mb-2">Ready to audit your infrastructure?</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Sign in, upload your Terraform file, and select the agents that match your threat model.</p>
              </div>
              <Link href={user ? "/dashboard" : "/login"}>
                <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm">
                  Get Started <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.18em] mb-3">Pricing</p>
            <h2 className="text-3xl md:text-[44px] font-black text-white tracking-tight">
              Pay for What You Run
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              Each agent run is a discrete transaction on the Algorand blockchain. No recurring charges. No hidden fees.
            </p>
          </div>

          {/* Agent price table */}
          <div className="max-w-3xl mx-auto border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.018] mb-10">
            <div className="grid grid-cols-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-white/[0.02] px-6 py-3 border-b border-white/[0.06]">
              <span>Agent</span>
              <span className="text-center">Specialisation</span>
              <span className="text-right">Price per Run</span>
            </div>
            {AGENTS.map(({ icon: Icon, color, name, badge, tags }) => {
              const c = colorMap[color];
              return (
                <div key={name} className="grid grid-cols-3 items-center px-6 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3">
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

          {/* Value props */}
          <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto text-center">
            {[
              { icon: CreditCard, title: "Pera Wallet Payments", desc: "Sign each transaction directly in Pera Wallet. Every payment includes a unique on-chain note for verification." },
              { icon: Lock, title: "Results Locked to Payment", desc: "Agent reports are only accessible after your transaction is confirmed on-chain — guaranteed by the backend." },
              { icon: BarChart3, title: "PDF Audit Reports", desc: "Download a full audit report after any successful agent run for your records or your team's review." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-white/[0.06] bg-white/[0.018] rounded-2xl p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20 mx-auto mb-4">
                  <Icon className="h-4.5 w-4.5 text-teal-400" />
                </span>
                <h4 className="text-[14px] font-bold text-white mb-1.5">{title}</h4>
                <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 border-t border-white/[0.06] py-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-teal-500/[0.03] to-transparent" />
        <div className="mx-auto max-w-2xl px-6 relative">
          <h2 className="text-4xl md:text-[56px] font-black text-white tracking-tight leading-tight">
            Audit Your Infrastructure.<br />
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Before Attackers Do.</span>
          </h2>
          <p className="mt-5 text-slate-400 text-[17px] leading-relaxed">
            Upload a Terraform file, run the agents that match your risk profile, and get a comprehensive security report — paid per run, verified on-chain.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-[15px] px-10 py-6 font-black shadow-2xl shadow-teal-500/20 rounded-xl">
                Run Your First Scan <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#060810] py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-950" />
            </span>
            <span className="text-sm font-bold text-slate-300">SecAgent Hub</span>
            <span className="text-xs text-slate-600 ml-1">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
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
