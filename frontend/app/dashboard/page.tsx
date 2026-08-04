"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileSearch, Plus, Radar, ShieldAlert, WalletCards } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Badge, Button, Card, Table } from "@/components/ui";
import { listScans } from "@/lib/api";

export default function DashboardPage() {
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => {
    listScans().then((data) => setScans(data.scans || []));
  }, []);

  return (
    <Shell>
      <div className="mb-8 flex flex-col gap-5 rounded-xl border border-white/80 bg-white/70 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            <Radar className="h-3.5 w-3.5" />
            Terraform AWS security
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Security scans</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Upload infrastructure code, unlock specialist agents with x402, and review attack paths in one focused workspace.</p>
        </div>
        <Link href="/scan/new">
          <Button><Plus className="h-4 w-4" /> New Scan</Button>
        </Link>
      </div>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="border-teal-100">
          <ShieldAlert className="mb-4 h-5 w-5 text-teal-700" />
          <p className="text-sm text-slate-500">Total scans</p>
          <p className="mt-2 text-3xl font-semibold">{scans.length}</p>
        </Card>
        <Card className="border-amber-100">
          <FileSearch className="mb-4 h-5 w-5 text-amber-600" />
          <p className="text-sm text-slate-500">Open findings</p>
          <p className="mt-2 text-3xl font-semibold">{scans.reduce((sum, scan) => sum + (scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0), 0)}</p>
        </Card>
        <Card className="border-sky-100">
          <WalletCards className="mb-4 h-5 w-5 text-sky-600" />
          <p className="text-sm text-slate-500">Payment mode</p>
          <p className="mt-2 text-xl font-semibold">x402 Testnet</p>
        </Card>
      </section>
      <Card className="overflow-hidden p-0">
        {scans.length ? (
          <Table>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">File</th><th>Findings</th><th>Risk</th><th>Agents used</th><th>Created</th><th className="pr-5"></th></tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} className="border-t border-border bg-white/70 transition hover:bg-teal-50/50">
                  <td className="px-5 py-4 font-semibold">{scan.filename}</td>
                  <td><Badge className="bg-amber-50 text-amber-700">{scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0} findings</Badge></td>
                  <td><span className="font-semibold">{scan.graph?.blast_radius_score ?? 0}</span></td>
                  <td>
                    {scan.agents_run?.length ? (
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {scan.agents_run.map((agent: string) => <Badge key={agent} className="bg-teal-50 text-teal-700">{agentLabel(agent)}</Badge>)}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">None</span>
                    )}
                  </td>
                  <td>{new Date(scan.created_at).toLocaleString()}</td>
                  <td className="pr-5 text-right"><Link className="inline-flex items-center gap-1 font-semibold text-teal-700" href={`/scan/${scan.id}/results`}>Open <ArrowUpRight className="h-4 w-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-teal-50">
              <FileSearch className="h-8 w-8 text-teal-700" />
            </div>
            <p className="text-lg font-semibold">No scans yet</p>
            <p className="max-w-md text-sm text-slate-600">Start with a Terraform file and SecAgent Hub will build findings, agent options, and an attack graph.</p>
            <Link href="/scan/new"><Button>Upload Terraform</Button></Link>
          </div>
        )}
      </Card>
    </Shell>
  );
}

function agentLabel(agentId: string) {
  return agentId
    .replace("misconfiguration", "Misconfig")
    .replace("iam_risk", "IAM")
    .replace("compliance", "Compliance")
    .replace("attack_path", "Attack path")
    .replace("ai_remediation", "AI fix");
}
