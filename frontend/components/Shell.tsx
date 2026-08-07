"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">Verifying session...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-slate-900/15">
              <ShieldCheck className="h-5 w-5 text-teal-300" />
            </span>
            <span>
              <span className="block leading-tight text-slate-900">SecAgent Hub</span>
              <span className="block text-xs font-medium text-slate-500">AI security marketplace</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href="/dashboard">Dashboard</Link>
            <Link className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href="/scan/new">New scan</Link>
            
            <div className="h-4 w-px bg-slate-200" />
            
            <div className="flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-slate-400" />
              <span className="max-w-[150px] truncate font-medium text-xs" title={user.email}>{user.email}</span>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

