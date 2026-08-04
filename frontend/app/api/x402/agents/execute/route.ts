import { NextRequest, NextResponse } from "next/server";
import algosdk from "algosdk";
import { HTTPFacilitatorClient, x402HTTPResourceServer } from "@x402-avm/core/http";
import { x402ResourceServer } from "@x402-avm/core/server";
import type { Network, PaymentPayload, PaymentRequirements, SettleResponse, SupportedResponse, VerifyResponse } from "@x402-avm/core/types";
import { ExactAvmScheme } from "@x402-avm/avm/exact/server";
import { decodeSignedTransaction } from "@algorandfoundation/algokit-utils/transact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_PRICES_MICRO_USDC: Record<string, number> = {
  misconfiguration: 250000,
  iam_risk: 300000,
  compliance: 200000,
  attack_path: 350000,
  ai_remediation: 500000
};

const X402_NETWORK = (process.env.X402_NETWORK || "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=") as Network;
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://facilitator.goplausible.xyz";
const PAY_TO = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS || "";
const API_BASE = process.env.BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";
const ALGOD_URL = process.env.NEXT_PUBLIC_ALGOD_NODE_URL || "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN || "";

let serverPromise: Promise<x402HTTPResourceServer> | undefined;

function getX402Server() {
  if (!serverPromise) {
    const facilitatorClient = new ResilientGoPlausibleFacilitator({ url: FACILITATOR_URL }, X402_NETWORK);
    const resourceServer = new x402ResourceServer(facilitatorClient).register(X402_NETWORK, new ExactAvmScheme());
    const httpServer = new x402HTTPResourceServer(resourceServer, {
      "POST /api/x402/agents/execute": {
        accepts: {
          scheme: "exact",
          network: X402_NETWORK,
          payTo: PAY_TO,
          price: ({ adapter }) => formatUsdPrice(totalMicroUsdc(adapter.getBody?.())),
          maxTimeoutSeconds: 180,
          extra: { settlementAsset: "USDC ASA", businessModel: "pay-per-agent-call" }
        },
        description: "Pay-per-use Terraform security agent execution",
        mimeType: "application/json",
        unpaidResponseBody: ({ adapter }) => ({
          contentType: "application/json",
          body: {
            error: "x402_payment_required",
            message: "Pay once for this selected agent run. Retry with PAYMENT-SIGNATURE after signing.",
            pricing_model: "pay-per-use",
            paying_user_use_case: "Security teams pay per Terraform agent analysis instead of buying a subscription.",
            facilitator: FACILITATOR_URL,
            network: X402_NETWORK,
            amount_micro_usdc: totalMicroUsdc(adapter.getBody?.())
          }
        }),
        settlementFailedResponseBody: (_context, failure) => ({
          contentType: "application/json",
          body: {
            error: "x402_settlement_failed",
            reason: failure.errorReason,
            transaction: failure.transaction || null,
            facilitator: FACILITATOR_URL
          }
        })
      }
    });
    serverPromise = httpServer.initialize().then(() => httpServer);
  }
  return serverPromise;
}

class ResilientGoPlausibleFacilitator {
  private client: HTTPFacilitatorClient;

  constructor(config: { url: string }, private network: Network) {
    this.client = new HTTPFacilitatorClient(config);
  }

  verify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse> {
    return this.client.verify(paymentPayload, paymentRequirements).catch(() => this.localVerify(paymentPayload, paymentRequirements));
  }

  async settle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<SettleResponse> {
    try {
      const res = await this.client.settle(paymentPayload, paymentRequirements);
      return {
        ...res,
        // @ts-ignore
        verified_by: "GoPlausible Facilitator"
      };
    } catch (error) {
      const cause = error && (error as any).cause ? ((error as any).cause.stack || (error as any).cause.message || JSON.stringify((error as any).cause)) : "none";
      logToFile("Facilitator settle failed: " + (error instanceof Error ? error.stack : String(error)) + " | Cause: " + cause);
      try {
        const res = await this.localSettle(paymentPayload, paymentRequirements);
        if (!res.success) {
          logToFile("localSettle success was false: " + JSON.stringify(res));
        }
        return {
          ...res,
          // @ts-ignore
          verified_by: "Local Backup Verifier"
        };
      } catch (localError) {
        const localCause = localError && (localError as any).cause ? ((localError as any).cause.stack || (localError as any).cause.message || JSON.stringify((localError as any).cause)) : "none";
        logToFile("localSettle exception: " + (localError instanceof Error ? localError.stack : String(localError)) + " | Cause: " + localCause);
        throw localError;
      }
    }
  }

  async getSupported(): Promise<SupportedResponse> {
    try {
      return await this.client.getSupported();
    } catch {
      return {
        kinds: [{ x402Version: 2, scheme: "exact", network: this.network }],
        extensions: [],
        signers: {}
      };
    }
  }

  private async localVerify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse> {
    const decoded = decodeAvmPayment(paymentPayload);
    if (!decoded.ok) {
      return { isValid: false, invalidReason: decoded.reason };
    }
    const paymentTxn = decoded.paymentTxn;
    const transfer = paymentTxn.assetTransfer;
    if (!transfer) {
      return { isValid: false, invalidReason: "x402 AVM payload is not an ASA transfer" };
    }
    const receiver = transfer.receiver.toString();
    const amount = transfer.amount.toString();
    const asset = transfer.assetId.toString();
    if (receiver !== paymentRequirements.payTo) {
      return { isValid: false, invalidReason: `receiver mismatch: expected ${paymentRequirements.payTo}, observed ${receiver}` };
    }
    if (BigInt(amount) < BigInt(paymentRequirements.amount)) {
      return { isValid: false, invalidReason: `amount too low: expected ${paymentRequirements.amount}, observed ${amount}` };
    }
    if (asset !== paymentRequirements.asset) {
      return { isValid: false, invalidReason: `asset mismatch: expected ${paymentRequirements.asset}, observed ${asset}` };
    }
    return {
      isValid: true,
      payer: paymentTxn.sender.toString()
    };
  }

  private async localSettle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<SettleResponse> {
    const verification = await this.localVerify(paymentPayload, paymentRequirements);
    if (!verification.isValid) {
      return {
        success: false,
        errorReason: verification.invalidReason || "local AVM verification failed",
        transaction: "",
        network: paymentRequirements.network,
        payer: verification.payer
      };
    }
    const decoded = decodeAvmPayment(paymentPayload);
    if (!decoded.ok) {
      return { success: false, errorReason: decoded.reason, transaction: "", network: paymentRequirements.network };
    }
    try {
      const algod = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_URL, "");
      await algod.sendRawTransaction(decoded.signedGroup).do();
      await waitForConfirmation(algod, decoded.txId);
      return {
        success: true,
        transaction: decoded.txId,
        network: paymentRequirements.network,
        payer: verification.payer
      };
    } catch (error) {
      return {
        success: false,
        errorReason: error instanceof Error ? error.message : String(error),
        transaction: decoded.txId,
        network: paymentRequirements.network,
        payer: verification.payer
      };
    }
  }
}

import fs from "fs";
import path from "path";

function logToFile(msg: string) {
  try {
    fs.appendFileSync(path.join(process.cwd(), "x402-error.log"), `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const adapter = createAdapter(request, body);
    const httpServer = await getX402Server();
    const context = {
      adapter,
      path: "/api/x402/agents/execute",
      method: "POST",
      paymentHeader: request.headers.get("PAYMENT-SIGNATURE") || undefined
    };

    const paymentResult = await httpServer.processHTTPRequest(context);
    if (paymentResult.type === "payment-error") {
      logToFile("Payment result is payment-error: " + JSON.stringify(paymentResult.response));
      return responseFromInstructions(paymentResult.response);
    }
    if (paymentResult.type !== "payment-verified") {
      logToFile("Payment result is not payment-verified: " + paymentResult.type);
      return NextResponse.json({ error: "x402_route_not_protected" }, { status: 500 });
    }

    logToFile("Payment verified. Payload: " + JSON.stringify(paymentResult.paymentPayload));

    const settlement = await httpServer.processSettlement(
      paymentResult.paymentPayload,
      paymentResult.paymentRequirements,
      paymentResult.declaredExtensions,
      { request: context }
    );
    if (!settlement.success) {
      logToFile("Settlement failed: " + JSON.stringify(settlement));
      return responseFromInstructions(settlement.response);
    }

    logToFile("Settlement succeeded. Transaction: " + settlement.transaction);

    const txId = settlement.transaction;
    const internalResponse = await fetch(`${API_BASE}/api/v1/internal/x402/agents/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET
      },
      body: JSON.stringify({
        file_id: body.file_id,
        agent_ids: body.agent_ids,
        tx_id: txId,
        payer: settlement.payer,
        network: settlement.network || X402_NETWORK,
        facilitator: FACILITATOR_URL,
        amount_paid: totalMicroUsdc(body),
        payment_response: settlement
      })
    });
    const payload = await internalResponse.json();
    if (!internalResponse.ok) {
      logToFile("Internal response not ok: " + internalResponse.status + " " + JSON.stringify(payload));
      return NextResponse.json(
        { error: "agent_execution_failed_after_x402_settlement", receipt: receiptFromSettlement(settlement), detail: payload },
        { status: internalResponse.status, headers: settlement.headers }
      );
    }

    logToFile("API route successful. Returning results.");

    return NextResponse.json(
      {
        ...payload,
        receipt: {
          ...payload.receipt,
          ...receiptFromSettlement(settlement)
        }
      },
      { headers: { ...settlement.headers, "Access-Control-Expose-Headers": "PAYMENT-RESPONSE" } }
    );
  } catch (err) {
    logToFile("POST exception: " + (err instanceof Error ? err.stack : String(err)));
    throw err;
  }
}

function createAdapter(request: NextRequest, body: unknown) {
  return {
    getHeader(name: string) {
      return request.headers.get(name) || request.headers.get(name.toLowerCase()) || undefined;
    },
    getMethod() {
      return request.method;
    },
    getPath() {
      return "/api/x402/agents/execute";
    },
    getUrl() {
      return request.url;
    },
    getAcceptHeader() {
      return request.headers.get("accept") || "application/json";
    },
    getUserAgent() {
      return request.headers.get("user-agent") || "";
    },
    getQueryParams() {
      return Object.fromEntries(request.nextUrl.searchParams.entries());
    },
    getQueryParam(name: string) {
      return request.nextUrl.searchParams.get(name) || undefined;
    },
    getBody() {
      return body;
    }
  };
}

function responseFromInstructions(instructions: { status: number; headers: Record<string, string>; body?: unknown; isHtml?: boolean }) {
  const body = typeof instructions.body === "string" ? instructions.body : JSON.stringify(instructions.body ?? {});
  return new NextResponse(body, { status: instructions.status, headers: instructions.headers });
}

function totalMicroUsdc(body: unknown) {
  const agentIds = Array.isArray((body as { agent_ids?: unknown })?.agent_ids)
    ? ((body as { agent_ids: unknown[] }).agent_ids.filter((id): id is string => typeof id === "string"))
    : [];
  return agentIds.reduce((total, id) => total + (AGENT_PRICES_MICRO_USDC[id] || 0), 0);
}

function formatUsdPrice(microUsdc: number) {
  const dollars = Math.max(microUsdc, 1) / 1_000_000;
  return `$${dollars.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
}

function receiptFromSettlement(settlement: { transaction?: string; payer?: string; network?: string; success: boolean; verified_by?: string }) {
  return {
    protocol: "x402",
    facilitator: FACILITATOR_URL,
    network: settlement.network || X402_NETWORK,
    tx_id: settlement.transaction,
    payer: settlement.payer,
    settlement_status: settlement.success ? "settled" : "failed",
    pricing_model: "pay-per-use",
    verified_by: settlement.verified_by || "GoPlausible Facilitator"
  };
}

function decodeAvmPayment(paymentPayload: PaymentPayload):
  | { ok: true; paymentTxn: ReturnType<typeof decodeSignedTransaction>["txn"]; signedGroup: Uint8Array[]; txId: string }
  | { ok: false; reason: string } {
  const payload = paymentPayload.payload as { paymentGroup?: string[]; paymentIndex?: number };
  if (!Array.isArray(payload.paymentGroup) || typeof payload.paymentIndex !== "number") {
    return { ok: false, reason: "missing AVM paymentGroup/paymentIndex" };
  }
  const signedGroup = payload.paymentGroup.map((item) => new Uint8Array(Buffer.from(item, "base64")));
  const paymentBytes = signedGroup[payload.paymentIndex];
  if (!paymentBytes) {
    return { ok: false, reason: "paymentIndex is outside paymentGroup" };
  }
  try {
    const decoded = decodeSignedTransaction(paymentBytes);
    return { ok: true, paymentTxn: decoded.txn, signedGroup, txId: decoded.txn.txId() };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function waitForConfirmation(algod: algosdk.Algodv2, txId: string) {
  const status = await algod.status().do();
  let round = Number(status.lastRound || 0);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const pending = await algod.pendingTransactionInformation(txId).do();
    if (Number(pending.confirmedRound || 0) > 0) return pending;
    round += 1;
    await algod.statusAfterBlock(round).do();
  }
  throw new Error(`Transaction ${txId} was submitted but not confirmed yet.`);
}
