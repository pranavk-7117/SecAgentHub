"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Brain, Download, MessageSquare, ReceiptText, ShieldCheck, Target, Lock, Trash2 } from "lucide-react";
import { RiskGraph } from "@/components/RiskGraph";
import { Shell } from "@/components/Shell";
import { API_BASE, askScan, getScan, deleteScan } from "@/lib/api";
import { Badge, Button, Card, Input, Table } from "@/components/ui";
import { Markdown } from "@/components/Markdown";


export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [scan, setScan] = useState<any>();
  const [severity, setSeverity] = useState("ALL");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getScan(params.id).then(setScan);
  }, [params.id]);

  const findings = useMemo(() => {
    const rows = scan?.raw_checkov_json?.results?.failed_checks || [];
    return severity === "ALL" ? rows : rows.filter((finding: any) => (finding.severity || "UNKNOWN").toUpperCase() === severity);
  }, [scan, severity]);

  async function sendQuestion() {
    if (!question.trim()) return;
    const result = await askScan(params.id, question);
    setAnswer(result.answer);
  }

  async function handleDeleteScan() {
    if (!window.confirm("Are you sure you want to delete this scan and all its execution receipts permanently?")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteScan(params.id);
      router.push("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete scan");
      setDeleting(false);
    }
  }

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`${API_BASE}/api/v1/scan/${params.id}/report`, { headers });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ detail: "Failed to download report" }));
        throw new Error(payload.detail || "Failed to download report");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secagent-${params.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download report");
    } finally {
      setDownloading(false);
    }
  }


  if (!scan) {
    return <Shell><Card>Loading scan...</Card></Shell>;
  }

  const compliance = scan.agent_executions?.find((row: any) => row.agent_id === "compliance")?.output_data?.score ?? Math.max(0, 100 - (findings.length * 8));
  const risk = scan.graph?.blast_radius_score ?? 0;
  const executedAgents = (scan.agent_executions || []).filter((row: any) => row.status === "executed" && row.output_data);
  const executedAgentIds = executedAgents.map((row: any) => row.agent_id);

  return (
    <Shell>
      {executedAgents.length === 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Scan Report Locked</span>: No successful agent executions have been verified for this scan. Select and run at least one agent from the dashboard to unlock PDF downloads and full audit compliance records.
          </div>
        </div>
      ) : null}
      <div className="mb-8 flex flex-col gap-5 rounded-xl border border-white/80 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Scan ID {String(scan.id).slice(0, 8)}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">{scan.filename}</h1>
          <p className="mt-2 text-slate-600">Attack graph, agent findings, remediation guidance, and x402 receipts.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {executedAgentIds.length ? executedAgentIds.map((agentId: string) => (
              <Badge key={agentId} className="bg-teal-50 text-teal-700">{agentLabel(agentId)} used</Badge>
            )) : <Badge className="bg-slate-100 text-slate-600">No agents executed yet</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {executedAgents.length === 0 ? (
            <Button disabled className="opacity-50 cursor-not-allowed bg-slate-100 border border-slate-200 text-slate-400">
              <Lock className="h-4 w-4 mr-1.5" /> Locked
            </Button>
          ) : (
            <Button onClick={handleDownloadReport} disabled={downloading}>
              <Download className="h-4 w-4 mr-1.5" /> {downloading ? "Downloading..." : "Download Report"}
            </Button>
          )}
          <Button 
            onClick={handleDeleteScan} 
            disabled={deleting}
            className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-semibold"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete Scan
          </Button>
        </div>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <Target className="mb-4 h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-slate-500">Overall risk</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-4xl font-semibold">{risk}</p>
            <Badge className={risk >= 70 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}>{risk >= 70 ? "Critical" : "Watch"}</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, risk)}%` }} />
          </div>
        </Card>
        <Card>
          <AlertTriangle className="mb-4 h-5 w-5 text-amber-600" />
          <p className="text-sm font-medium text-slate-500">Findings</p>
          <p className="mt-3 text-4xl font-semibold">{scan.findings_summary?.failed_count ?? 0}</p>
        </Card>
        <Card>
          <ShieldCheck className="mb-4 h-5 w-5 text-teal-700" />
          <p className="text-sm font-medium text-slate-500">Compliance</p>
          <p className="mt-3 text-4xl font-semibold">{compliance}%</p>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="h-[580px] overflow-hidden p-0">
          <RiskGraph graph={scan.graph} />
        </Card>
        <Card>
          <h2 className="mb-2 text-xl font-semibold">Critical attack paths</h2>
          <p className="mb-4 text-sm text-slate-600">Top reachable chains are highlighted in the graph and capped here for triage.</p>
          <div className="max-h-[455px] space-y-2 overflow-auto pr-2">
            {(scan.graph?.critical_attack_paths || []).map((path: string[], index: number) => (
              <div key={index} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-900">{path.join(" -> ")}</div>
            ))}
            {!scan.graph?.critical_attack_paths?.length ? <p className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-700">No public path detected.</p> : null}
          </div>
        </Card>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Findings</h2>
            <select className="h-9 rounded-md border border-border bg-white px-2 text-sm font-medium" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="max-h-96 overflow-auto">
            <Table>
              <tbody>
                {findings.map((finding: any, index: number) => (
                  <tr key={`${finding.check_id}-${index}`} className="border-t border-border align-top transition hover:bg-slate-50">
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <SeverityBadge severity={finding.severity || "LOW"} />
                        {finding.category ? <Badge className="bg-slate-50 text-slate-600">{finding.category}</Badge> : null}
                      </div>
                    </td>
                    <td className="py-3">
                      <p className="font-medium">{finding.check_id}</p>
                      <p className="text-sm text-slate-600">{finding.check_name}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-5 w-5 text-teal-700" /> AI remediation chat</h2>
          <div className="flex gap-2">
            <Input value={question} placeholder="Ask about this scan" onChange={(event) => setQuestion(event.target.value)} />
            <Button onClick={sendQuestion}>Ask</Button>
          </div>
          {answer ? (
            <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-inner leading-relaxed animate-fadeIn">
              <Markdown content={answer} />
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Ask for impact, exploitability, or a Terraform fix for any finding.</div>
          )}
        </Card>
      </section>
      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Brain className="h-5 w-5 text-teal-300" /> Agent analysis</h2>
          <p className="mt-1 text-sm text-slate-300">Distinct outputs from the agents you paid for and executed.</p>
        </div>
        {executedAgents.length ? (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {executedAgents.map((execution: any) => (
              <AgentOutput key={execution.id} execution={execution} />
            ))}
          </div>
        ) : (
          <div className="m-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-600">No agent output has been executed for this scan yet.</div>
        )}
      </Card>
      <Card className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><ReceiptText className="h-5 w-5 text-teal-700" /> Payment receipts</h2>
        <Table>
          <thead className="text-left text-slate-500"><tr><th className="py-2">Agent</th><th>Status</th><th>Amount</th><th>Transaction</th></tr></thead>
          <tbody>
            {(scan.agent_executions || []).map((row: any) => {
              const receipt = row.output_data?.x402_receipt || {};
              const verifiedBy = receipt.verified_by || (row.tx_hash?.startsWith("mock-") ? "Mock Fallback" : "FastAPI Backend (Direct Indexer)");
              return (
                <tr key={row.id} className="border-t border-border">
                  <td className="py-3 font-medium">{agentLabel(row.agent_id)}</td>
                  <td><Badge className="bg-emerald-50 text-emerald-700">{row.status}</Badge></td>
                  <td>{row.amount_paid}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1">
                      <a className="text-teal-700 font-mono text-xs break-all" href={`https://testnet.explorer.perawallet.app/tx/${row.tx_hash}`} target="_blank">{row.tx_hash}</a>
                      <span className="text-[11px] text-slate-500 font-medium">Verified by: <span className="text-teal-700 font-semibold">{verifiedBy}</span></span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </Shell>
  );
}

function AgentOutput({ execution }: { execution: any }) {
  const data = execution.output_data || {};
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{data.agent || execution.agent_id}</h3>
          <p className="mt-1 text-sm text-slate-600">{data.summary || "Agent completed analysis."}</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700">{execution.status}</Badge>
      </div>
      {execution.agent_id === "misconfiguration" ? <MisconfigurationOutput data={data} /> : null}
      {execution.agent_id === "iam_risk" ? <IamOutput data={data} /> : null}
      {execution.agent_id === "compliance" ? <ComplianceOutput data={data} /> : null}
      {execution.agent_id === "attack_path" ? <AttackPathOutput data={data} /> : null}
      {execution.agent_id === "ai_remediation" ? <RemediationOutput data={data} /> : null}
    </div>
  );
}

function MisconfigurationOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {(data.exposures || []).map((item: any, index: number) => (
        <div key={index} className="rounded-md bg-red-50 p-3 text-sm">
          <div className="font-semibold text-red-800">{item.issue}</div>
          <div className="mt-1 text-red-700">{item.resource}</div>
        </div>
      ))}
      <ul className="space-y-2 text-sm text-slate-600">
        {(data.recommendations || []).map((item: string) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function IamOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3 text-sm">
      {(data.risks || []).map((risk: any, index: number) => (
        <div key={index} className="rounded-md bg-amber-50 p-3">
          <div className="font-semibold text-amber-800">{risk.type}</div>
          <div className="mt-1 text-amber-700">{risk.detail}</div>
        </div>
      ))}
      <div className="rounded-md bg-slate-50 p-3 text-slate-600">
        <span className="font-semibold text-slate-800">Privilege actions:</span> {(data.privilege_escalation_actions || []).join(", ") || "None detected"}
      </div>
    </div>
  );
}

function ComplianceOutput({ data }: { data: any }) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Object.entries(data.frameworks || {}).map(([name, score]) => (
          <div key={name} className="rounded-md bg-slate-50 p-3 text-center">
            <div className="text-lg font-semibold">{String(score)}%</div>
            <div className="text-xs text-slate-500">{name}</div>
          </div>
        ))}
      </div>
      <div className="max-h-44 overflow-auto space-y-2">
        {(data.failed_controls || []).map((control: any, index: number) => (
          <div key={index} className="rounded-md border border-slate-100 p-2 text-sm">
            <div className="font-semibold">{control.check_id}</div>
            <div className="text-slate-600">{(control.mapped_frameworks || []).join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttackPathOutput({ data }: { data: any }) {
  const paths = data.paths || [];
  return (
    <div className="space-y-3">
      {paths.slice(0, 4).map((path: any, index: number) => (
        <div key={index} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-red-100 text-xs">{index + 1}</span>
            <span>{(path.path || []).join(" -> ")}</span>
          </div>
          {(path.sequence || []).map((step: any) => <div key={step.step} className="text-red-800">{step.step}. {step.node}</div>)}
        </div>
      ))}
      {paths.length > 4 ? <div className="rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-600">+ {paths.length - 4} additional paths included in the report.</div> : null}
      {!paths.length ? <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">No public attack path found.</div> : null}
    </div>
  );
}

function RemediationOutput({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Markdown content={data.explanation} />
      <pre className="max-h-56 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100 font-mono">{data.corrected_hcl}</pre>
      <ol className="space-y-1.5 text-sm text-slate-600 list-decimal pl-5">
        {(data.steps || []).map((step: string) => <li key={step}>{step}</li>)}
      </ol>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const upper = severity.toUpperCase();
  const className =
    upper === "CRITICAL"
      ? "bg-red-50 text-red-700 border-red-200"
      : upper === "HIGH"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : upper === "MEDIUM"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return <Badge className={className}>{upper}</Badge>;
}

function agentLabel(agentId: string) {
  return agentId
    .replace("misconfiguration", "Misconfiguration Agent")
    .replace("iam_risk", "IAM Risk Agent")
    .replace("compliance", "Compliance Agent")
    .replace("attack_path", "Attack Path Agent")
    .replace("ai_remediation", "AI Remediation Agent");
}
