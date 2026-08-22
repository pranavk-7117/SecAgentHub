"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, User, LayoutDashboard, Plus, Home, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); } else { setUser(session.user); }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.push("/login"); } else { setUser(session.user); }
    });
    return () => { subscription.unsubscribe(); };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f]">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-[13px] font-medium text-slate-500">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navLinks = [
    { href: "/",          label: "Home",       icon: Home },
    { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { href: "/scan/new",  label: "New Scan",   icon: Plus },
  ];


  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100" style={{ fontFamily: "'Inter','system-ui',sans-serif" }}>

      {/* Grid bg */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: `linear-gradient(rgba(20,184,166,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,0.025) 1px,transparent 1px)`,
        backgroundSize: "72px 72px",
      }} />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-teal-500/5 blur-[160px] rounded-full" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07090f]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-[62px]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/25 transition group-hover:scale-105">
              <ShieldCheck className="h-4 w-4 text-[#07090f]" />
            </span>
            <div className="leading-tight">
              <span className="block text-[14px] font-bold text-white tracking-tight">SecAgent Hub</span>
              <span className="block text-[10px] text-slate-500 font-medium">AI Security Marketplace</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition">{label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 border border-white/[0.07] bg-white/[0.02] rounded-lg px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span className="max-w-[140px] truncate text-[12px] font-medium text-slate-400" title={user.email}>{user.email}</span>
            </div>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-red-400 border border-white/[0.06] bg-white/[0.02] hover:border-red-500/20 hover:bg-red-500/5 px-3 py-1.5 rounded-lg transition" title="Sign Out">
              <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign Out</span>
            </button>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-2 rounded-lg hover:bg-white/5 transition">
              {mobileOpen ? <X className="h-5 w-5 text-slate-400" /> : <Menu className="h-5 w-5 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-[#07090f] px-4 py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition">
                <Icon className="h-4 w-4" />{label}
              </Link>
            ))}
            <div className="h-px bg-white/[0.05] my-1" />
            <div className="flex items-center gap-2 px-4 py-2">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] text-slate-500 truncate">{user.email}</span>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
