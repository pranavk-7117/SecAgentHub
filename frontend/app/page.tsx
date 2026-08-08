"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight, ShieldAlert, Zap, Cpu, Lock, Network } from "lucide-react";
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
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-teal-500/5 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/5 to-transparent blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block leading-tight text-white font-bold">SecAgent Hub</span>
              <span className="block text-[10px] font-medium text-slate-400">AI security marketplace</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#features" className="hover:text-white transition">Marketplace</a>
            <a href="#features" className="hover:text-white transition">Compliance</a>
            <a href="https://github.com/lc215640-stack/SecAgentHub" target="_blank" className="hover:text-white transition">GitHub</a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-semibold">
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
                  Sign In
                </Link>
                <Link href="/login">
                  <Button className="bg-slate-900 border border-slate-800 text-slate-100 hover:bg-slate-800 hover:text-white font-semibold">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center relative z-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/5 px-3 py-1.5 text-xs font-semibold text-teal-400">
          <Zap className="h-3.5 w-3.5" />
          Autonomous Terraform Guard
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Secure Your Infrastructure <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
            With Autonomous AI Agents
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload AWS Terraform code, unlock specialized security agents on-demand with x402, and interactively eliminate policy exposures.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-base px-8 py-6 font-semibold shadow-xl shadow-teal-600/10">
              Start Free Scan <ArrowRight className="h-5 w-5 ml-1.5" />
            </Button>
          </Link>
          <a href="#features">
            <Button className="w-full sm:w-auto border border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-850 hover:text-white text-base px-8 py-6 font-semibold backdrop-blur">
              See How It Works
            </Button>
          </a>
        </div>

        {/* Hero Image Mockup Container */}
        <div className="mt-16 border border-slate-900 bg-slate-950/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-3xl max-w-5xl mx-auto">
          <div className="border border-slate-850 bg-slate-900 rounded-xl overflow-hidden aspect-[16/9] flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all duration-500" />
            
            {/* Visual placeholder details */}
            <div className="text-center z-10 px-6">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-500/10 text-teal-400 shadow-inner mx-auto mb-5 border border-teal-500/20">
                <ShieldAlert className="h-8 w-8 animate-pulse" />
              </span>
              <p className="text-lg font-bold text-white tracking-wide">Interactive Graph Visualization</p>
              <p className="text-slate-400 text-sm max-w-sm mt-2">
                Inspect AWS security group relations, IAM path risks, and misconfiguration blast radius vectors live in the dashboard.
              </p>
            </div>
            
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-slate-900 bg-slate-950/50 py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
              Securing Infrastructure is Hard. <br />
              <span className="text-teal-400">Agents Make It Simple.</span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              SecAgent Hub brings the best of static security checks and deep generative reasoning together in one unified platform.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="border border-slate-900 bg-slate-900/40 rounded-2xl p-6 hover:border-slate-800 transition">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 mb-5">
                <Cpu className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-white">Autonomous Specialist AI</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Unlock specialized agents for IAM risk analysis, misconfigurations, attack paths, and compliance. Get actionable remediation scripts instantly.
              </p>
            </div>

            <div className="border border-slate-900 bg-slate-900/40 rounded-2xl p-6 hover:border-slate-800 transition">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 mb-5">
                <Network className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-white">Algorand x402 Micropayments</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Pay only for what you run. Powered by the Algorand blockchain, transactions are executed instantly in USDC with full verification tracking.
              </p>
            </div>

            <div className="border border-slate-900 bg-slate-900/40 rounded-2xl p-6 hover:border-slate-800 transition">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 mb-5">
                <Lock className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-white">Locked Down Compliance</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Scan reports are tightly guarded. Only authenticated users can access logs, and PDF reports are locked until payment transactions settle successfully.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t border-slate-900 py-24 text-center bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/5 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 relative z-10">
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Ready to secure your cloud HCL?
          </h2>
          <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
            Upload your Terraform templates and run an on-demand audit in seconds. No setups required.
          </p>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-base px-8 py-6 font-semibold shadow-xl shadow-teal-600/10">
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
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#features" className="hover:text-white transition">Marketplace</a>
            <a href="/login" className="hover:text-white transition">Client Login</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
