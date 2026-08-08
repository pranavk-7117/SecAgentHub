"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight, ShieldAlert, Zap, Cpu, Lock, Network, DollarSign, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[700px] bg-gradient-to-b from-teal-500/10 to-transparent blur-[130px] pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/10 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute top-2/3 left-10 w-[450px] h-[450px] bg-gradient-to-br from-cyan-500/5 to-transparent blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold group">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/25 transition group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block leading-tight text-white font-bold tracking-tight">SecAgent Hub</span>
              <span className="block text-[10px] font-semibold text-teal-400/90 tracking-wide uppercase">AI security marketplace</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#agents" className="hover:text-white transition">AI Agents</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="https://github.com/lc215640-stack/SecAgentHub" target="_blank" className="hover:text-white transition">GitHub</a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-semibold shadow-md shadow-teal-500/10">
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition">
                  Sign In
                </Link>
                <Link href="/login">
                  <Button className="bg-slate-900 border border-slate-800 text-slate-100 hover:bg-slate-850 hover:text-white font-semibold transition">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-20 text-center relative z-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/5 px-3 py-1.5 text-xs font-semibold text-teal-400 backdrop-blur">
          <Zap className="h-3.5 w-3.5" />
          Autonomous AWS Terraform Scanner
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          Secure Infrastructure with <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Algorand-backed AI Agents
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload AWS Terraform code, pay on-demand in USDC via x402, and interactively remediate risk vectors with specialized security agents.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-base px-8 py-6 font-semibold shadow-xl shadow-teal-600/15">
              Launch Free Audit <ArrowRight className="h-5 w-5 ml-1.5" />
            </Button>
          </Link>
          <a href="#features">
            <Button className="w-full sm:w-auto border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850 hover:text-white text-base px-8 py-6 font-semibold backdrop-blur transition">
              See How It Works
            </Button>
          </a>
        </div>

        {/* Live Metrics Ticker */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-900 pt-8 text-left">
          <div>
            <span className="block text-2xl font-bold text-white">12,840+</span>
            <span className="block text-xs text-slate-500 font-medium uppercase mt-0.5 tracking-wider">Audits Verified</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">99.8%</span>
            <span className="block text-xs text-slate-500 font-medium uppercase mt-0.5 tracking-wider">Accuracy Rate</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">&lt; $0.001</span>
            <span className="block text-xs text-slate-500 font-medium uppercase mt-0.5 tracking-wider">Algorand Tx Fee</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">30 Seconds</span>
            <span className="block text-xs text-slate-500 font-medium uppercase mt-0.5 tracking-wider">Avg Scan Duration</span>
          </div>
        </div>

        {/* Hero Image Mockup Container */}
        <div className="mt-16 border border-slate-900 bg-slate-950/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-3xl max-w-5xl mx-auto">
          <div className="border border-slate-850 bg-slate-900/90 rounded-xl overflow-hidden aspect-[16/9] flex flex-col justify-between p-6 relative group">
            {/* Header Mockup */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-red-500/80" />
                <span className="h-3.5 w-3.5 rounded-full bg-yellow-500/80" />
                <span className="h-3.5 w-3.5 rounded-full bg-green-500/80" />
              </div>
              <div className="rounded bg-slate-950 px-3 py-1 text-xs text-slate-400 border border-slate-800">
                secagent-hub.app/scan/d3c-91e/results
              </div>
              <span className="text-xs text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded font-semibold border border-teal-500/20">
                USDC Verified
              </span>
            </div>

            {/* Core Visualization Mockup */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
              <div className="text-center md:text-left max-w-sm">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500/10 text-teal-400 shadow-inner border border-teal-500/20 mb-4">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                </span>
                <p className="text-xl font-bold text-white tracking-wide">Interactive Attack Graph</p>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Map security group relationships, public-facing EC2 subnets, and privilege escalations in real-time.
                </p>
              </div>

              {/* Graphical placeholder nodes */}
              <div className="flex items-center gap-4 bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 shadow-lg">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-red-500/10 border border-red-500/25">
                  <span className="text-xs font-bold text-red-400">EC2</span>
                </div>
                <div className="h-0.5 w-8 border-t-2 border-dashed border-slate-700" />
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-teal-500/10 border border-teal-500/25">
                  <span className="text-xs font-bold text-teal-400">SG</span>
                </div>
                <div className="h-0.5 w-8 border-t-2 border-dashed border-slate-700" />
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber-500/10 border border-amber-500/25">
                  <span className="text-xs font-bold text-amber-400">IAM</span>
                </div>
              </div>
            </div>
            
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-slate-900 bg-slate-950/30 py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Enterprise security features, <br />
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">tailored for HCL templates.</span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Combine robust static policy parsing with advanced generative compliance reviews on-demand.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="border border-slate-900 bg-slate-900/30 backdrop-blur-md rounded-2xl p-7 hover:border-slate-800 transition shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-500/10 text-teal-400 mb-5 border border-teal-500/20">
                <Cpu className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-white">Autonomous Agent Hub</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Hire specialized AI agents to analyze IAM privileges, trace network connections, and verify audit compliance.
              </p>
            </div>

            <div className="border border-slate-900 bg-slate-900/30 backdrop-blur-md rounded-2xl p-7 hover:border-slate-800 transition shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-5 border border-emerald-500/20">
                <Network className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-white">Algorand x402 Settle</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Seamless crypto verification. Scan payments trigger smart-receipt validations matching transaction notes directly on the ledger.
              </p>
            </div>

            <div className="border border-slate-900 bg-slate-900/30 backdrop-blur-md rounded-2xl p-7 hover:border-slate-800 transition shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400 mb-5 border border-cyan-500/20">
                <Lock className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-white">Locked Down Results</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Unpaid or failed transactions block findings, graph rendering, and PDF reports automatically. Full data privacy is guaranteed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Agents Marketplace Showcase */}
      <section id="agents" className="border-t border-slate-900 py-24 bg-slate-950/60 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Hire Specialized AI Security Experts
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Select and pay only for the agents you need.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Compliance Agent */}
            <div className="border border-slate-850 bg-slate-900/40 rounded-2xl p-8 flex flex-col justify-between hover:border-teal-500/30 transition shadow-xl">
              <div>
                <span className="inline-block text-[10px] uppercase font-bold text-teal-400 bg-teal-500/15 border border-teal-500/20 px-2 py-0.5 rounded-full mb-4">
                  0.5 USDC / Run
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">Compliance Expert</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Reviews resources against CIS benchmarks, SOC2 guidelines, and HIPAA standards. Generates professional compliance scoring.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 border-t border-slate-800/60 pt-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Checks 80+ security controls</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Generates PDF audit reports</li>
              </ul>
            </div>

            {/* Blast Radius Agent */}
            <div className="border border-slate-850 bg-slate-900/40 rounded-2xl p-8 flex flex-col justify-between hover:border-emerald-500/30 transition shadow-xl">
              <div>
                <span className="inline-block text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-4">
                  1.0 USDC / Run
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">Blast Radius Graph</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Builds visual topology graphs of security rules and IAM policies. Projects potential routes an attacker could exploit.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 border-t border-slate-800/60 pt-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Interactive network maps</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Computes blast radius scores</li>
              </ul>
            </div>

            {/* Remediation Agent */}
            <div className="border border-slate-850 bg-slate-900/40 rounded-2xl p-8 flex flex-col justify-between hover:border-cyan-500/30 transition shadow-xl">
              <div>
                <span className="inline-block text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/20 px-2 py-0.5 rounded-full mb-4">
                  1.5 USDC / Run
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">Remediation Script</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Provides copy-paste shell scripts, Terraform patch templates, and CLI fixes to immediately eliminate exposures.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 border-t border-slate-800/60 pt-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-500" /> Interactive AI chat advice</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-500" /> Terraform code snippets</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-t border-slate-900 py-24 bg-slate-950/30 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Pay-as-you-go, No Subscriptions
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Top up your wallet and pay only for verified agent runs.
            </p>
          </div>

          <div className="grid gap-8 max-w-4xl mx-auto md:grid-cols-2">
            {/* Free Tier */}
            <div className="border border-slate-850 bg-slate-900/20 rounded-2xl p-8 flex flex-col justify-between backdrop-blur shadow-xl">
              <div>
                <h3 className="text-xl font-bold text-slate-300">Basic Auditor</h3>
                <div className="mt-4 flex items-baseline text-white">
                  <span className="text-5xl font-extrabold tracking-tight">$0</span>
                  <span className="ml-1 text-slate-400 text-sm font-medium">/ forever</span>
                </div>
                <p className="mt-4 text-slate-400 text-sm">
                  Perfect for running local static checks before paying for specialist agents.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-slate-400 border-t border-slate-800/60 pt-6 mt-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> Static HCL parser</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> 1-click scan uploads</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> User dashboard tracker</li>
              </ul>
            </div>

            {/* Paid Tier */}
            <div className="border-2 border-teal-500/50 bg-slate-900/60 rounded-2xl p-8 flex flex-col justify-between backdrop-blur shadow-2xl relative">
              <span className="absolute top-0 right-6 -translate-y-1/2 bg-teal-500 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1 rounded-full tracking-wider shadow-lg shadow-teal-500/20">
                RECOMMENDED
              </span>
              <div>
                <h3 className="text-xl font-bold text-teal-400">Security Professional</h3>
                <div className="mt-4 flex items-baseline text-white">
                  <span className="text-5xl font-extrabold tracking-tight">On-Demand</span>
                </div>
                <p className="mt-4 text-slate-300 text-sm">
                  Powered by x402. Pay between 0.5 - 1.5 USDC per specialist agent run.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-slate-300 border-t border-slate-800/60 pt-6 mt-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Pera Wallet Algorand connect</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Run Specialist compliance checks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Full Attack Graph Visuals</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> 100% verified on-chain receipts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t border-slate-900 py-24 text-center bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/5 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 relative z-10">
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Ready to secure your cloud templates?
          </h2>
          <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Upload your Terraform templates and run an on-demand audit in seconds. No setups required.
          </p>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-base px-8 py-6 font-semibold shadow-xl shadow-teal-600/15">
                Launch Application
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950 text-slate-500 text-xs">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-500" />
            <span className="text-slate-300 font-bold">SecAgent Hub</span>
            <span>&copy; {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#agents" className="hover:text-white transition">AI Agents</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="/login" className="hover:text-white transition">Client Login</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
