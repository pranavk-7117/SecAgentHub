"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileSearch, Plus, Radar, ShieldAlert, WalletCards, Trash2, Lock } from "lucide-react";

import { Shell } from "@/components/Shell";
import { Badge, Button, Card, Table } from "@/components/ui";
import { listScans } from "@/lib/api";

export default function DashboardPage() {
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => { loadScans(); }, []);

  function loadScans() {
    listScans().then((data) => setScans(data.scans || []));
  }

  async function handleDelete(scanId: string, filename: string) {
    if (!window.confirm(`Are you sure you want to delete scan "${filename}"?`)) return;
    try {
      const { deleteScan } = await import("@/lib/api");
      await deleteScan(scanId);
      loadScans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete scan");
    }
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-col gap-5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-xl shadow-black/30 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400">
            <Radar className="h-3.5 w-3.5" />
            Terraform AWS security
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Security scans</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Upload infrastructure code, unlock specialist agents, and review attack paths in one focused workspace.</p>
        </div>
        <Link href="/scan/new">
          <Button><Plus className="h-4 w-4" /> New Scan</Button>
        </Link>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="border-teal-500/15">
          <ShieldAlert className="mb-4 h-5 w-5 text-teal-400" />
          <p className="text-sm text-slate-500">Total scans</p>
          <p className="mt-2 text-3xl font-bold text-white">{scans.length}</p>
        </Card>
        <Card className="border-amber-500/15">
          <FileSearch className="mb-4 h-5 w-5 text-amber-400" />
          <p className="text-sm text-slate-500">Open findings</p>
          <p className="mt-2 text-3xl font-bold text-white">{scans.reduce((sum, scan) => sum + (scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0), 0)}</p>
        </Card>
        <Card className="border-sky-500/15">
          <WalletCards className="mb-4 h-5 w-5 text-sky-400" />
          <p className="text-sm text-slate-500">Payment mode</p>
          <p className="mt-2 text-xl font-bold text-white">x402 Testnet</p>
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        {scans.length ? (
          <Table>
            <thead className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">File</th>
                <th>Status</th>
                <th>Findings</th>
                <th>Risk</th>
                <th>Agents used</th>
                <th>Created</th>
                <th className="pr-5"></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} className="border-t border-white/[0.04] transition hover:bg-white/[0.03]">
                  <td className="px-5 py-4 font-semibold text-slate-200">{scan.filename}</td>
                  <td>
                    {scan.agents_run?.length ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Success</Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Failed</Badge>
                    )}
                  </td>
                  <td><Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">{scan.findings_summary?.failed_count ?? scan.raw_checkov_json?.results?.failed_checks?.length ?? 0} findings</Badge></td>
                  <td><span className="font-semibold text-slate-300">{scan.graph?.blast_radius_score ?? 0}</span></td>
                  <td>
                    {scan.agents_run?.length ? (
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {scan.agents_run.map((agent: string) => {
                          const exec = scan.agent_executions?.find((e: any) => e.agent_id === agent);
                          const isMainnet = exec?.network === "mainnet";
                          return (
                            <div key={agent} className="flex items-center gap-1">
                              <Badge className="bg-teal-500/10 text-teal-300 border-teal-500/20">{agentLabel(agent)}</Badge>
                              <Badge className={isMainnet ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1 py-0" : "bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px] px-1 py-0"}>
                                {isMainnet ? "MainNet" : "TestNet"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-600">None</span>
                    )}
                  </td>
                  <td className="text-slate-500">{new Date(scan.created_at).toLocaleString()}</td>
                  <td className="pr-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {scan.agents_run?.length ? (
                        <Link className="inline-flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300 transition" href={`/scan/${scan.id}/results`}>
                          Open <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600 cursor-not-allowed select-none" title="Run agents to unlock scan results">
                          Locked <Lock className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <button onClick={() => handleDelete(scan.id, scan.filename)} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-red-400 transition" title="Delete Scan">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/15">
              <FileSearch className="h-8 w-8 text-teal-400" />
            </div>
            <p className="text-lg font-semibold text-white">No scans yet</p>
            <p className="max-w-md text-sm text-slate-500">Start with a Terraform file and SecAgent Hub will build findings, agent options, and an attack graph.</p>
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
