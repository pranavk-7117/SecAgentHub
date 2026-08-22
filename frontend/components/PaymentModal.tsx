"use client";

import { useState } from "react";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card } from "@/components/ui";
import { inspectPayment } from "@/lib/api";

let peraWallet: PeraWalletConnect | null = null;

function getPeraWallet() {
  if (!peraWallet) {
    peraWallet = new PeraWalletConnect({
      chainId: 416002,
      shouldShowSignTxnToast: true,
      singleAccount: true,
      shouldPreferExtension: true
    });
  }
  return peraWallet;
}

type PaymentRequest = {
  agent: string;
  price_in_microalgos: number;
  pay_to_address: string;
  challenge: string;
};

export function PaymentModal({
  scanId,
  requests,
  onPaid,
  onClose
}: {
  scanId: string;
  requests: PaymentRequest[];
  onPaid: (agentId: string, txHash: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [busyAgent, setBusyAgent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [manualTx, setManualTx] = useState<Record<string, string>>({});

  async function payWithPera(request: PaymentRequest) {
    setBusyAgent(request.agent);
    setError("");
    try {
      const algodUrl = process.env.NEXT_PUBLIC_ALGOD_NODE_URL;
      const token = process.env.NEXT_PUBLIC_ALGOD_TOKEN || "";
      const assetId = Number(process.env.NEXT_PUBLIC_USDC_ASA_ID || 0);
      const receiver = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS || request.pay_to_address;
      if (!algodUrl || !assetId || !receiver) {
        onPaid(request.agent, `mock-${request.agent}-${Date.now()}`);
        return;
      }

      const wallet = getPeraWallet();
      let accounts = await wallet.reconnectSession().catch(() => [] as string[]);
      if (!accounts.length) {
        accounts = await wallet.connect();
      }
      const sender = accounts[0];
      setAccount(sender);
      const algod = new algosdk.Algodv2(token, algodUrl, "");
      const suggestedParams = await algod.getTransactionParams().do();
      let txn: algosdk.Transaction;
      if (assetId > 0) {
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender,
          receiver,
          amount: BigInt(request.price_in_microalgos),
          assetIndex: BigInt(assetId),
          note: new TextEncoder().encode(request.challenge),
          suggestedParams
        });
      } else {
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender,
          receiver,
          amount: BigInt(request.price_in_microalgos),
          note: new TextEncoder().encode(request.challenge),
          suggestedParams
        });
      }

      const signed = await wallet.signTransaction(
        [[{ txn, signers: [sender], message: `SecAgent Hub ${request.agent} payment` }]],
        sender
      );
      if (!signed[0]) {
        throw new Error("Wallet did not return a signed transaction.");
      }
      const sendResult = await algod.sendRawTransaction(signed[0]).do();
      const txId = sendResult.txid || txn.txID();
      setStatus(`Submitted ${txId}. Waiting for TestNet confirmation...`);
      await waitForConfirmation(algod, txId);
      setStatus("Confirmed on TestNet. Waiting for Indexer verification...");
      await verifyWithRetry(request.agent, txId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet payment failed";
      if (message.toLowerCase().includes("underflow") || message.toLowerCase().includes("subtracting") || message.toLowerCase().includes("balance")) {
        setError("Insufficient ALGO balance in wallet to pay 0.3 ALGO. Click 'Fast Demo (Bypass Payment)' below to test instantly, or dispense TestNet ALGOs to your wallet.");
      } else if (message.toLowerCase().includes("private key")) {
        setError("Pera cannot sign with the currently connected account. Click Reset Wallet, then connect a normal TestNet account that you own.");
      } else {
        setError(message);
      }
    } finally {
      setBusyAgent(null);
    }

  }

  async function verifyWithRetry(agentId: string, txHash: string) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        setStatus(`Verifying payment with backend (${attempt}/10)...`);
        await onPaid(agentId, txHash);
        setStatus("Payment verified. Agent is running.");
        return;
      } catch (err) {
        lastError = err;
        await sleep(2500);
      }
    }
    throw lastError instanceof Error
      ? new Error(`Payment was submitted but backend could not verify it yet. Paste this tx hash again in a moment: ${txHash}`)
      : new Error(`Payment was submitted but backend could not verify it yet. Tx hash: ${txHash}`);
  }

  async function verifyManual(request: PaymentRequest) {
    const txHash = (manualTx[request.agent] || "").trim();
    if (!txHash) {
      setError("Paste the transaction hash from Pera or the Algorand explorer first.");
      return;
    }
    setBusyAgent(request.agent);
    setError("");
    try {
      const inspection = await inspectPayment(scanId, request.agent, txHash);
      if (!inspection.ok) {
        setError(`Verifier says: ${inspection.reason}`);
        return;
      }
      await verifyWithRetry(request.agent, txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
    } finally {
      setBusyAgent(null);
    }
  }

  async function resetWallet() {
    setError("");
    setStatus("");
    setAccount("");
    await getPeraWallet().disconnect().catch(() => undefined);
  }

  if (!requests.length) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">HTTP 402 payment required</h2>
            <p className="text-sm text-slate-600">Pay each unpaid agent on Algorand Testnet, then submit the transaction hash.</p>
            {account ? <p className="mt-1 max-w-xl break-all text-xs text-slate-500">Connected signer: {account}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button className="bg-slate-700 hover:bg-slate-800" onClick={resetWallet}>Reset Wallet</Button>
            <Button className="bg-slate-700 hover:bg-slate-800" onClick={onClose}>Close</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => {
            const assetId = process.env.NEXT_PUBLIC_USDC_ASA_ID || "10458941";
            const paymentUri = `algorand://${request.pay_to_address}?amount=${request.price_in_microalgos}&asset=${assetId}&note=${encodeURIComponent(request.challenge)}`;
            return (
              <div key={request.agent} className="rounded-lg border border-border p-4">
                <div className="mb-3 font-medium">{request.agent}</div>
                <QRCodeSVG value={paymentUri} size={144} />
                <dl className="mt-3 space-y-1 text-xs text-slate-600">
                  <div>Amount: {request.price_in_microalgos} microUSDC</div>
                  <div className="break-all">To: {request.pay_to_address}</div>
                  <div className="break-all">Note: {request.challenge}</div>
                </dl>
                <Button className="mt-3 w-full bg-teal-600 hover:bg-teal-700 text-white font-medium" disabled={busyAgent === request.agent} onClick={() => payWithPera(request)}>
                  {busyAgent === request.agent ? "Processing..." : "Connect Wallet"}
                </Button>
                <button
                  type="button"
                  onClick={() => onPaid(request.agent, `mock-${request.agent}-${Date.now()}`)}
                  className="mt-2 w-full py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition"
                >
                  ⚡ Fast Demo (Bypass Payment)
                </button>
                <div className="mt-3 rounded-md bg-slate-900/60 border border-slate-800 p-3">
                  <label className="text-xs font-semibold text-slate-400">Already paid? Paste tx hash or enter 'mock-123'</label>
                  <input
                    className="mt-2 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-white outline-none focus:border-teal-500"
                    value={manualTx[request.agent] || ""}
                    onChange={(event) => setManualTx((old) => ({ ...old, [request.agent]: event.target.value }))}
                    placeholder="Transaction ID or mock-123"
                  />
                  <Button className="mt-2 h-9 w-full bg-slate-800 hover:bg-slate-700 text-white" disabled={busyAgent === request.agent} onClick={() => verifyManual(request)}>
                    Verify Tx Hash
                  </Button>
                </div>
              </div>

            );
          })}
        </div>
        {status ? <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700">{status}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </Card>
    </div>
  );
}

async function waitForConfirmation(algod: algosdk.Algodv2, txId: string) {
  const status = await algod.status().do();
  let round = Number(status.lastRound || 0);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const pending = await algod.pendingTransactionInformation(txId).do();
    const confirmedRound = Number(pending.confirmedRound || 0);
    if (confirmedRound > 0) return pending;
    round += 1;
    await algod.statusAfterBlock(round).do();
  }
  throw new Error(`Transaction ${txId} was submitted but not confirmed yet.`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
