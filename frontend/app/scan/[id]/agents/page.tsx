"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, KeyRound, Route, ShieldAlert, Sparkles } from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { Shell } from "@/components/Shell";
import { Badge, Button, Card } from "@/components/ui";
import { Agent, executeAgents, getScan } from "@/lib/api";

const icons = { ShieldAlert, KeyRound, ClipboardCheck, Route, Sparkles };

export default function AgentPickerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getScan(params.id).then((scan) => setAgents(scan.agents || []));
  }, [params.id]);

  const selectedAgents = useMemo(() => agents.filter((agent) => selected.includes(agent.id)), [agents, selected]);

  async function run(ids = selected, txHash?: string) {
    if (running) return;
    setMessage(txHash ? "Verifying payment and running the selected agent..." : "Opening Pera Wallet for the x402 payment. Approve the wallet request to continue.");
    setRunning(true);
    try {
      await executeAgents(params.id, ids, txHash);
      router.push(`/scan/${params.id}/results`);
    } catch (err) {
      const payment = (err as Error & { payment?: any }).payment;
      if (payment?.unpaid_agents) setPaymentRequests(payment.unpaid_agents);
      else setMessage(err instanceof Error ? err.message : "Agent execution failed");
    } finally {
      setRunning(false);
    }
  }

  async function payOne(agentId: string, txHash: string) {
    setMessage("");
    try {
      await executeAgents(params.id, [agentId], txHash);
      const remaining = paymentRequests.filter((request) => request.agent !== agentId);
      setPaymentRequests(remaining);
      if (!remaining.length) {
        await executeAgents(params.id, selected);
        router.push(`/scan/${params.id}/results`);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Payment verification failed";
      setMessage(text);
      throw err;
    }
  }

  async function resetWallet() {
    const { resetX402PeraWallet } = await import("@/lib/x402Pera");
    await resetX402PeraWallet();
    setMessage("Wallet session reset. Click Run Selected Agents again and approve the new Pera request.");
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-col gap-5 rounded-xl border border-white/80 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Choose security agents</h1>
          <p className="mt-2 text-slate-600">Select one or more specialist agents. Each agent gets its own x402 payment challenge.</p>
        </div>
        <Button disabled={!selected.length || running} onClick={() => run()}>
          {running ? "Waiting for Wallet..." : "Run Selected Agents"}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const Icon = icons[agent.icon as keyof typeof icons] || ShieldAlert;
          const active = selected.includes(agent.id);
          return (
            <Card key={agent.id} className={`relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_26px_80px_rgba(15,23,42,0.12)] ${active ? "border-teal-300 ring-2 ring-teal-600" : ""}`}>
              {active ? <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-teal-700" /> : null}
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-50">
                  <Icon className="h-6 w-6 text-teal-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="pr-7 text-lg font-semibold">{agent.name}</h2>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{agent.description}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <Badge className="bg-slate-100 text-slate-700">{(agent.price_in_microalgos / 1_000_000).toFixed(2)} USDC</Badge>
                    <Button disabled={running} onClick={() => setSelected((old) => (old.includes(agent.id) ? old.filter((id) => id !== agent.id) : [...old, agent.id]))}>
                      {active ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {selectedAgents.length ? <p className="mt-4 text-sm text-slate-600">Selected: {selectedAgents.map((agent) => agent.name).join(", ")}</p> : null}
      {message ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
          <p>{message}</p>
          {message.toLowerCase().includes("pera") || message.toLowerCase().includes("wallet") ? (
            <Button className="bg-slate-800 hover:bg-slate-900" onClick={resetWallet}>Reset Wallet</Button>
          ) : null}
        </div>
      ) : null}
      <PaymentModal
        scanId={params.id}
        requests={paymentRequests}
        onClose={() => setPaymentRequests([])}
        onPaid={payOne}
      />
    </Shell>
  );
}
