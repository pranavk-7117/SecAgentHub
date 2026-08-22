import { supabase } from "./supabase";

export const API_BASE = "";

export type Agent = {
  id: string;
  name: string;
  description: string;
  price_in_microalgos: number;
  icon: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function uploadTerraform(file: File) {
  const form = new FormData();
  form.append("file", file);
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/scan/upload`, {
    method: "POST",
    headers: authHeaders,
    body: form
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getScan(scanId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/scan/${scanId}`, {
    headers: authHeaders,
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function listScans() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/scans`, {
    headers: authHeaders,
    cache: "no-store"
  });
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

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/agents/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(txHash ? { "X-PAYMENT-PROOF": `x402 ${txHash}` } : {})
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
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({ scan_id: scanId, question })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getPaymentQuote(scanId: string, agentId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/payments/quote?scan_id=${scanId}&agent_id=${agentId}`, {
    headers: authHeaders,
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function inspectPayment(scanId: string, agentId: string, txHash: string) {
  const authHeaders = await getAuthHeaders();
  const url = `${API_BASE}/api/v1/payments/inspect?scan_id=${scanId}&agent_id=${agentId}&tx_id=${encodeURIComponent(txHash)}`;
  const response = await fetch(url, {
    headers: authHeaders,
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function deleteScan(scanId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/scan/${scanId}`, {
    method: "DELETE",
    headers: authHeaders
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function generateRemediationProof(scanId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/remediation/${scanId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ max_retries: 3 }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

/** localStorage key for proof-of-fix state bridging twin → CI/CD page. */
export const proofOfFixKey = (scanId: string) => `secagent_proof_${scanId}`;

export interface ProofOfFixState {
  verified: boolean;
  newRisk: number;
  newAttackPaths: number;
  newFindings: number;
  fixLabel: string;
  verifiedAt: string;
}

export async function applyPRFix(scanId: string, remediatedHcl?: string, githubToken?: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/v1/cicd/apply-pr-fix`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({
      scan_id: scanId,
      remediated_hcl: remediatedHcl,
      github_token: githubToken,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

