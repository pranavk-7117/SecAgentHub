"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck, ArrowRight, Zap, Cpu, Lock, Network,
  CheckCircle2, ShieldAlert, KeyRound, ClipboardCheck,
  Route, Sparkles, CreditCard, BarChart3, DollarSign,
  TrendingUp, Shield, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const AGENTS = [
  { icon: ShieldAlert, color: "teal",    badge: "0.25 USDC", name: "Misconfiguration Agent",  desc: "Surfaces publicly exposed resources, open security groups, missing encryption, and hardcoded credentials across your IaC — ranked by severity and exploitability.", tags: ["Open Ports","S3 Exposure","Missing Encryption"] },
  { icon: KeyRound,    color: "violet",  badge: "0.30 USDC", name: "IAM Risk Agent",           desc: "Analyses every IAM role, policy, and binding for wildcard permissions, administrator access abuse, and least-privilege violations before they become a breach.",   tags: ["Wildcard Permissions","Privilege Escalation","Least Privilege"] },
  { icon: ClipboardCheck, color: "emerald", badge: "0.20 USDC", name: "Compliance Agent",     desc: "Maps your infrastructure against CIS Benchmarks, NIST 800-53, PCI DSS, and HIPAA. Returns a scored report with specific control failures and remediation references.", tags: ["CIS Benchmarks","NIST 800-53","PCI DSS"] },
  { icon: Route,       color: "amber",   badge: "0.35 USDC", name: "Attack Path Agent",        desc: "Constructs a graph-based attack topology from your resource configuration. Identifies viable lateral movement paths and the blast radius of each exploitable entry point.", tags: ["Attack Graphs","Lateral Movement","Blast Radius"] },
  { icon: Sparkles,    color: "cyan",    badge: "0.50 USDC", name: "AI Remediation Agent",    desc: "Translates raw findings into plain-English explanations, concrete Terraform code fixes, and prioritised remediation steps your team can act on immediately.", tags: ["Terraform Fixes","Plain-English","AI Reasoning"] },
];

const colorMap: Record<string,{bg:string;border:string;text:string;tag:string}> = {
  teal:    { bg:"bg-teal-500/10",    border:"border-teal-500/20",    text:"text-teal-400",    tag:"bg-teal-500/10 text-teal-300 border-teal-500/20" },
  violet:  { bg:"bg-violet-500/10",  border:"border-violet-500/20",  text:"text-violet-400",  tag:"bg-violet-500/10 text-violet-300 border-violet-500/20" },
  emerald: { bg:"bg-emerald-500/10", border:"border-emerald-500/20", text:"text-emerald-400", tag:"bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  amber:   { bg:"bg-amber-500/10",   border:"border-amber-500/20",   text:"text-amber-400",   tag:"bg-amber-500/10 text-amber-300 border-amber-500/20" },
  cyan:    { bg:"bg-cyan-500/10",    border:"border-cyan-500/20",    text:"text-cyan-400",    tag:"bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
};

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data:{session} }) => { if (session) setUser(session.user); }); },[]);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg-base)", color: "var(--text-primary)", fontFamily:"'Inter','system-ui',sans-serif", transition: "background 0.2s ease" }}>
      <div className="pointer-events-none fixed inset-0 z-0" style={{backgroundImage:`linear-gradient(rgba(20,184,166,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,0.03) 1px,transparent 1px)`,backgroundSize:"72px 72px"}}/>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-teal-500/7 blur-[150px] rounded-full"/>
        <div className="absolute top-[40%] right-[-8%] w-[600px] h-[600px] bg-violet-500/4 blur-[180px] rounded-full"/>
        <div className="absolute bottom-[-5%] left-[-8%] w-[600px] h-[500px] bg-emerald-500/4 blur-[180px] rounded-full"/>
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07090f]/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl flex h-[62px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/25 transition group-hover:scale-105"><ShieldCheck className="h-4 w-4 text-[#07090f]"/></span>
            <span className="text-[15px] font-bold text-white tracking-tight">SecAgent Hub</span>
          </Link>
          <nav className="hidden md:flex items-center gap-0.5">
            {[["#features","Why Us"],["#agents","Agents"],["#pricing","Pricing"]].map(([href,label])=>(
              <a key={href} href={href} className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link href="/dashboard"><button className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[13px] font-bold px-3 sm:px-4 py-2 rounded-lg shadow-lg shadow-teal-500/20 transition">Dashboard <ArrowRight className="h-3.5 w-3.5"/></button></Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-[13px] font-medium text-slate-400 hover:text-white transition">Sign In</Link>
                <Link href="/login"><button className="text-[13px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 sm:px-4 py-2 rounded-lg transition backdrop-blur">Get Started</button></Link>
              </>
            )}
            <ThemeToggle />
            <button onClick={()=>setMobileNavOpen(o=>!o)} className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/5 transition" aria-label="Toggle menu">
              <span className={`block h-0.5 w-5 bg-slate-400 transition-all ${mobileNavOpen?"rotate-45 translate-y-2":""}`}/>
              <span className={`block h-0.5 w-5 bg-slate-400 transition-all ${mobileNavOpen?"opacity-0":""}`}/>
              <span className={`block h-0.5 w-5 bg-slate-400 transition-all ${mobileNavOpen?"-rotate-45 -translate-y-2":""}`}/>
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-[#07090f] px-4 py-4 flex flex-col gap-1">
            {[["#features","Why Us"],["#agents","Agents"],["#pricing","Pricing"]].map(([href,label])=>(
              <a key={href} href={href} onClick={()=>setMobileNavOpen(false)} className="px-4 py-3 rounded-xl text-[14px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition">{label}</a>
            ))}
            <Link href="/login" onClick={()=>setMobileNavOpen(false)} className="px-4 py-3 rounded-xl text-[14px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition">Sign In</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pt-14 sm:pt-20 pb-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/8 px-3.5 py-1.5 text-[11px] font-bold text-teal-400 tracking-widest uppercase">
              <Zap className="h-3 w-3"/>AI-Powered · Pay Per Analysis
            </div>
            <h1 className="text-[38px] sm:text-5xl lg:text-[62px] font-black tracking-[-0.03em] text-white leading-[1.04]">
              AI Security Agents<br/>for{" "}
              <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-400 bg-clip-text text-transparent">Cloud Infrastructure</span>
            </h1>
            <p className="mt-5 text-[15px] sm:text-[17px] text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Upload your Terraform configuration, select specialist AI security agents, and get deep infrastructure analysis — paying only per analysis, verified on-chain.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href={user?"/dashboard":"/login"} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[15px] px-7 py-3.5 font-black rounded-xl shadow-2xl shadow-teal-500/25 transition">
                  Run a Security Scan <ArrowRight className="h-4 w-4"/>
                </button>
              </Link>
              <a href="#agents" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 text-[15px] px-7 py-3.5 font-semibold rounded-xl transition backdrop-blur">
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-white/5 shrink-0">
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-slate-300"><polygon points="2,1 9,5 2,9"/></svg>
                  </span>
                  See How It Works
                </button>
              </a>
            </div>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 text-[12px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-teal-500"/>No subscription required</span>
              <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-teal-500"/>Results in under a minute</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-500"/>On-chain verified</span>
            </div>
          </div>

          {/* Floating cards */}
          <div className="relative hidden lg:flex items-center justify-center" style={{minHeight:"460px"}}>
            <div className="absolute inset-0 bg-teal-500/8 blur-[90px] rounded-full scale-75"/>
            <div className="absolute inset-0 bg-violet-500/4 blur-[120px] rounded-full scale-50"/>
            <div className="relative z-10 grid h-36 w-36 place-items-center rounded-3xl" style={{background:"linear-gradient(135deg,rgba(20,184,166,0.15),rgba(16,185,129,0.08))",backdropFilter:"blur(20px)",border:"1px solid rgba(20,184,166,0.25)"}}>
              <div className="grid h-[88px] w-[88px] place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-2xl shadow-teal-500/50">
                <ShieldCheck className="h-11 w-11 text-[#07090f]"/>
              </div>
              <div className="absolute inset-[-22px] rounded-full border border-teal-500/20 animate-spin" style={{animationDuration:"14s"}}>
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-teal-400 shadow-lg shadow-teal-400"/>
              </div>
              <div className="absolute inset-[-42px] rounded-full border border-teal-500/10 animate-spin" style={{animationDuration:"22s",animationDirection:"reverse"}}>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400"/>
              </div>
            </div>
            <div className="absolute top-4 left-0 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 min-w-[148px]" style={{background:"rgba(12,16,24,0.88)",backdropFilter:"blur(20px)"}}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Infrastructure</p>
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 border border-violet-500/20 shrink-0">
                  <svg className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div><p className="text-[12px] font-bold text-white">main.tf</p><p className="flex items-center gap-1 text-[10px] text-teal-400 font-medium mt-0.5"><CheckCircle2 className="h-2.5 w-2.5"/>Uploaded</p></div>
              </div>
            </div>
            <div className="absolute top-4 right-0 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 min-w-[148px]" style={{background:"rgba(12,16,24,0.88)",backdropFilter:"blur(20px)"}}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">AI Agents</p>
              <p className="text-[12px] font-bold text-white mb-2">5 Agents Selected</p>
              <div className="flex items-center">
                {["bg-teal-400","bg-violet-500","bg-emerald-400","bg-amber-400","bg-cyan-400"].map((c,i)=>(
                  <span key={i} className={`h-6 w-6 rounded-full ${c} border-2 border-[#0c1018]`} style={{marginLeft:i>0?"-6px":"0"}}/>
                ))}
                <span className="ml-2 text-[10px] text-teal-400 font-semibold">View all</span>
              </div>
            </div>
            <div className="absolute bottom-8 left-0 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 min-w-[160px]" style={{background:"rgba(12,16,24,0.88)",backdropFilter:"blur(20px)"}}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Analysis</p>
              <p className="text-[11px] text-slate-400 mb-2">In Progress...</p>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1"><div className="h-full w-[94%] bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"/></div>
              <p className="text-right text-[11px] font-black text-teal-400">94%</p>
            </div>
            <div className="absolute bottom-8 right-0 border border-white/10 rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/50 min-w-[148px]" style={{background:"rgba(12,16,24,0.88)",backdropFilter:"blur(20px)"}}>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Report</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4"><p className="text-[11px] text-slate-400">Vulnerabilities Found</p><span className="text-[15px] font-black text-red-400">5</span></div>
                <div className="flex items-center justify-between gap-4"><p className="text-[11px] text-slate-400">Risk Issues</p><span className="text-[15px] font-black text-amber-400">4</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          {[
            {val:"5",           sub1:"Specialist AI Agents", sub2:"Working for you",       icon:Cpu,        color:"text-teal-400",    ring:"bg-teal-500/10 border-teal-500/20"},
            {val:"$0.20–$0.50", sub1:"USDC per Agent Run",   sub2:"Transparent pricing",   icon:DollarSign, color:"text-violet-400",  ring:"bg-violet-500/10 border-violet-500/20"},
            {val:"< 60s",       sub1:"Time to Full Report",  sub2:"Fast & accurate",        icon:Activity,   color:"text-amber-400",   ring:"bg-amber-500/10 border-amber-500/20"},
            {val:"100%",        sub1:"On-Chain Verified",    sub2:"Tamper-proof results",   icon:Shield,     color:"text-emerald-400", ring:"bg-emerald-500/10 border-emerald-500/20"},
          ].map(({val,sub1,sub2,icon:Icon,color,ring})=>(
            <div key={val} className="flex items-center gap-3 border border-white/[0.06] bg-white/[0.02] rounded-xl px-3 sm:px-4 py-3.5">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${ring}`}><Icon className={`h-5 w-5 ${color}`}/></span>
              <div className="min-w-0">
                <span className={`block text-sm sm:text-lg font-black leading-none ${color} truncate`}>{val}</span>
                <span className="block text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{sub1}</span>
                <span className="block text-[9px] text-slate-600 font-medium truncate">{sub2}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 border-t border-white/[0.05] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-3">Why SecAgent Hub</p>
            <h2 className="text-[26px] sm:text-[32px] md:text-[42px] font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">Security Scanning That Tells You What to Do</h2>
            <p className="mt-4 sm:mt-5 text-slate-400 text-[15px] sm:text-[17px] max-w-xl mx-auto leading-relaxed">Most tools produce a wall of findings and leave remediation to you. Our AI agents contextualise risk and deliver precise, actionable guidance.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {[
              {icon:DollarSign,color:"teal",   title:"Analyse What You Need",    desc:"Choose from five specialised agents and run only the analyses relevant to your threat model. Each agent operates independently — no bundle deals, no wasted spend."},
              {icon:TrendingUp,color:"violet", title:"AI-Driven Prioritisation", desc:"Our agents rank findings by exploitability and business impact, and tell you exactly what to fix first."},
              {icon:Network,   color:"emerald",title:"Attack-Path Visibility",   desc:"Understand how vulnerabilities chain together. Graph-based analysis maps realistic attack paths through your infrastructure before threat actors do."},
            ].map(({icon:Icon,color,title,desc})=>{
              const c=colorMap[color];
              return (
                <div key={title} className="group border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] rounded-2xl p-7 transition hover:-translate-y-0.5">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border} mb-5`}><Icon className="h-5 w-5"/></span>
                  <h3 className="text-[17px] font-bold text-white mb-2.5">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="relative z-10 border-t border-white/[0.05] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 sm:mb-14">
            <div>
              <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-3">AI Security Agents</p>
              <h2 className="text-[26px] sm:text-[32px] md:text-[42px] font-black text-white tracking-tight leading-tight">Pick the Expertise You Need</h2>
            </div>
            <p className="text-slate-400 text-[15px] max-w-sm leading-relaxed md:text-right">Each agent is purpose-built for a specific security discipline — run them individually or combine them.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {AGENTS.map(({icon:Icon,color,badge,name,desc,tags})=>{
              const c=colorMap[color];
              return (
                <div key={name} className="group relative border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-6 transition hover:-translate-y-0.5 hover:border-white/10 hover:shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${c.bg} ${c.text} border ${c.border}`}><Icon className="h-5 w-5"/></span>
                    <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full border ${c.tag}`}>{badge} / run</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-white mb-2">{name}</h3>
                  <p className="text-slate-400 text-[13px] leading-relaxed mb-4">{desc}</p>
                  <div className="flex flex-wrap gap-1.5">{tags.map(tag=>(<span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${c.tag}`}>{tag}</span>))}</div>
                </div>
              );
            })}
            <div className="border border-dashed border-teal-500/20 bg-teal-500/[0.02] rounded-2xl p-6 flex flex-col justify-between gap-6">
              <div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20 mb-4"><Zap className="h-5 w-5 text-teal-400"/></span>
                <h3 className="text-[16px] font-bold text-white mb-2">Ready to audit your infrastructure?</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">Sign in, upload your Terraform file, and select the agents that match your threat model.</p>
              </div>
              <Link href={user?"/dashboard":"/login"}>
                <button className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-[#07090f] text-[13px] font-black px-5 py-2.5 rounded-lg">Get Started <ArrowRight className="h-4 w-4"/></button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 border-t border-white/[0.05] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-[11px] font-bold text-teal-400 uppercase tracking-[0.2em] mb-3">Pricing</p>
            <h2 className="text-[28px] sm:text-3xl md:text-[46px] font-black text-white tracking-tight">Pay for What You Run</h2>
            <p className="mt-4 text-slate-400 text-[15px] sm:text-[17px] max-w-lg mx-auto">Each agent run is a discrete, on-chain transaction. No recurring charges, no hidden fees.</p>
          </div>
          <div className="hidden sm:block max-w-2xl mx-auto border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.015] mb-10">
            <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-white/[0.02] px-5 py-3 border-b border-white/[0.05]">
              <span>Agent</span><span className="text-center">Primary Capability</span><span className="text-right">Price / Run</span>
            </div>
            {AGENTS.map(({icon:Icon,color,name,badge,tags})=>{
              const c=colorMap[color];
              return (
                <div key={name} className="grid grid-cols-3 items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg ${c.bg} ${c.text} border ${c.border} shrink-0`}><Icon className="h-3.5 w-3.5"/></span>
                    <span className="text-[13px] font-semibold text-white">{name}</span>
                  </div>
                  <p className="text-center text-[12px] text-slate-500">{tags[0]}</p>
                  <p className={`text-right text-[13px] font-bold ${c.text}`}>{badge}</p>
                </div>
              );
            })}
          </div>
          <div className="sm:hidden max-w-md mx-auto space-y-2 mb-8">
            {AGENTS.map(({icon:Icon,color,name,badge,tags})=>{
              const c=colorMap[color];
              return (
                <div key={name} className="flex items-center justify-between px-4 py-3.5 border border-white/[0.06] bg-white/[0.015] rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${c.bg} ${c.text} border ${c.border} shrink-0`}><Icon className="h-4 w-4"/></span>
                    <div><p className="text-[13px] font-semibold text-white">{name}</p><p className="text-[11px] text-slate-500">{tags[0]}</p></div>
                  </div>
                  <span className={`text-[13px] font-bold ${c.text} shrink-0 ml-3`}>{badge}</span>
                </div>
              );
            })}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
            {[
              {icon:CreditCard,title:"Wallet Payments",  desc:"Sign each transaction in Pera Wallet. Every payment includes a unique on-chain note for verification."},
              {icon:Lock,       title:"Results Locked",   desc:"Reports are only unlocked after your transaction is confirmed on-chain — guaranteed by the backend."},
              {icon:BarChart3,  title:"PDF Audit Reports",desc:"Download a full audit report after any successful agent run for records or team review."},
            ].map(({icon:Icon,title,desc})=>(
              <div key={title} className="border border-white/[0.06] bg-white/[0.015] rounded-xl p-5 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/15 mx-auto mb-3"><Icon className="h-4 w-4 text-teal-400"/></span>
                <h4 className="text-[14px] font-bold text-white mb-1.5">{title}</h4>
                <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-white/[0.05] py-20 sm:py-28 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-teal-500/5 via-transparent to-transparent"/>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 relative">
          <h2 className="text-[30px] sm:text-4xl md:text-[52px] font-black text-white tracking-tight leading-[1.1]">
            Audit Your Infrastructure —{" "}
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">Before Attackers Do.</span>
          </h2>
          <p className="mt-4 sm:mt-5 text-slate-400 text-[15px] sm:text-[17px] leading-relaxed max-w-lg mx-auto">Upload a Terraform file, run the agents that match your risk profile, and get a comprehensive security report — paid per run, verified on-chain.</p>
          <div className="mt-7 sm:mt-9 px-4 sm:px-0">
            <Link href={user?"/dashboard":"/login"}>
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#07090f] text-[15px] px-8 sm:px-10 py-4 font-black rounded-xl shadow-2xl shadow-teal-500/20 transition">
                Run Your First Scan <ArrowRight className="h-5 w-5"/>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-[#060810] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col items-center gap-5 md:flex-row md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500"><ShieldCheck className="h-3.5 w-3.5 text-[#07090f]"/></span>
            <span className="text-sm font-bold text-slate-300">SecAgent Hub</span>
            <span className="text-xs text-slate-600">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[12px] font-semibold text-slate-500">
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
