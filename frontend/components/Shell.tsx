import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-slate-900/15">
              <ShieldCheck className="h-5 w-5 text-teal-300" />
            </span>
            <span>
              <span className="block leading-tight">SecAgent Hub</span>
              <span className="block text-xs font-medium text-slate-500">AI security marketplace</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm text-slate-600">
            <Link className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href="/dashboard">Dashboard</Link>
            <Link className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href="/scan/new">New scan</Link>
            <span className="ml-2 hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 md:flex">
              <Activity className="h-3.5 w-3.5" />
              Testnet
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
