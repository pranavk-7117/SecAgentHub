"use client";

import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { Network } from "@x402-avm/core/types";

const peraWallet = new PeraWalletConnect({
  chainId: 416002,
  shouldShowSignTxnToast: true,
  singleAccount: true,
  shouldPreferExtension: true
});

const X402_NETWORK = (process.env.NEXT_PUBLIC_X402_NETWORK || "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=") as Network;

let activePayment: Promise<unknown> | null = null;

export async function executeAgentsWithX402(scanId: string, agentIds: string[]) {
  if (activePayment) {
    throw walletError("Pera already has a pending request. Approve or reject it in Pera, or reset the wallet session and try again.");
  }
  activePayment = executeAgentsWithX402Once(scanId, agentIds);
  try {
    return await activePayment;
  } finally {
    activePayment = null;
  }
}

async function executeAgentsWithX402Once(scanId: string, agentIds: string[]) {
  // Try to reconnect an existing session first. If none, open the QR modal.
  let accounts = await peraWallet.reconnectSession().catch(() => [] as string[]);
  const isNewConnection = !accounts.length;

  if (isNewConnection) {
    accounts = await peraWallet.connect();
    // After scanning the QR code, the WalletConnect session needs a brief moment
    // to fully establish before we can send a signing request. Without this delay,
    // the transaction request is silently dropped because the mobile app hasn't
    // completed the handshake. We wait 1.5s to ensure the session is ready.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const address = accounts[0];
  const signer = {
    address,
    async signTransactions(txns: Uint8Array[], indexesToSign?: number[]) {
      const signIndexes = new Set(indexesToSign ?? txns.map((_, index) => index));
      const group = txns.map((txnBytes, index) => ({
        txn: algosdk.decodeUnsignedTransaction(txnBytes),
        signers: signIndexes.has(index) ? [address] : []
      }));
      let signed: Uint8Array[];
      try {
        signed = await peraWallet.signTransaction([group], address);
      } catch (error) {
        throw normalizePeraError(error);
      }
      let signedCursor = 0;
      return txns.map((_txn, index) => {
        if (!signIndexes.has(index)) return null;
        const item = signed[signedCursor];
        signedCursor += 1;
        return item ? new Uint8Array(item) : null;
      });
    }
  };

  const client = new x402Client();
  registerExactAvmScheme(client, {
    signer,
    networks: [X402_NETWORK],
    algodConfig: {
      algodUrl: process.env.NEXT_PUBLIC_ALGOD_NODE_URL || "https://testnet-api.algonode.cloud",
      algodToken: process.env.NEXT_PUBLIC_ALGOD_TOKEN || ""
    }
  });
  const paidFetch = wrapFetchWithPayment(fetch, client);
  const response = await paidFetch("/api/x402/agents/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: scanId, agent_ids: agentIds })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(payload));
  }
  const paymentResponse = response.headers.get("PAYMENT-RESPONSE");
  return {
    ...payload,
    payment_response_header: paymentResponse,
    payment_response: paymentResponse ? decodePaymentResponseHeader(paymentResponse) : null
  };
}

export async function resetX402PeraWallet() {
  activePayment = null;
  await peraWallet.disconnect().catch(() => undefined);
}

function normalizePeraError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("request pending")) {
    return walletError("Pera says a wallet request is already pending. Open Pera and approve/reject it, or click Reset Wallet and try again.");
  }
  return walletError(message || "Pera wallet signing failed.");
}

function walletError(message: string) {
  const error = new Error(message) as Error & { walletError?: boolean };
  error.walletError = true;
  return error;
}
