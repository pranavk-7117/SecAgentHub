export const API_BASE = "";

export type Agent = {
  id: string;
  name: string;
  description: string;
  price_in_microalgos: number;
  icon: string;
};

export async function uploadTerraform(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/api/v1/scan/upload`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getScan(scanId: string) {
  const response = await fetch(`${API_BASE}/api/v1/scan/${scanId}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function listScans() {
  const response = await fetch(`${API_BASE}/api/v1/scans`, { cache: "no-store" });
  if (!response.ok) return { scans: [] };
  return response.json();
}

export async function executeAgents(scanId: string, agentIds: string[], txHash?: string) {
  if (!txHash && typeof window !== "undefined") {
    try {
      const { executeAgentsWithX402 } = await import("./x402Pera");
      return await executeAgentsWithX402(scanId, agentIds);
    } catch (error) {
      if ((error as Error & { walletError?: boolean }).walletError) {
        throw error;
      }
      console.warn("Official x402 facilitator flow failed; falling back to legacy verifier flow.", error);
    }
  }

  const response = await fetch(`${API_BASE}/api/v1/agents/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(txHash ? { Authorization: `x402 ${txHash}` } : {})
    },
    body: JSON.stringify({ file_id: scanId, agent_ids: agentIds })
  });
  const data = await response.json();
  if (response.status === 402) {
    const reason = data.detail?.verification?.reason;
    const error = new Error(reason ? `payment_required: ${reason}` : "payment_required") as Error & { payment?: unknown };
    error.payment = data.detail;
    throw error;
  }
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function askScan(scanId: string, question: string) {
  const response = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scan_id: scanId, question })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getPaymentQuote(scanId: string, agentId: string) {
  const response = await fetch(`${API_BASE}/api/v1/payments/quote?scan_id=${scanId}&agent_id=${agentId}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function inspectPayment(scanId: string, agentId: string, txHash: string) {
  const url = `${API_BASE}/api/v1/payments/inspect?scan_id=${scanId}&agent_id=${agentId}&tx_id=${encodeURIComponent(txHash)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
