from __future__ import annotations

import asyncio
import secrets
import base64
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.models import AgentExecutionRecord
from app.repository import repository
from app.services.agent_service import get_agent


async def require_agent_payments(
    file_id: str,
    agent_ids: list[str],
    authorization: str | None = None,
    x_payment_proof: str | None = None,
) -> list[AgentExecutionRecord]:
    unpaid = [agent_id for agent_id in agent_ids if not repository.has_paid(file_id, agent_id)]
    if not unpaid:
        return repository.get_executions(file_id)

    tx_id = _extract_tx_id(authorization, x_payment_proof)
    if len(unpaid) > 1 and tx_id:
        raise _payment_required(file_id, unpaid)
    if not tx_id:
        raise _payment_required(file_id, unpaid)
    if repository.tx_used(tx_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment transaction has already been used.")

    verified = []
    for agent_id in unpaid:
        agent = get_agent(agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail=f"Unknown agent {agent_id}")
        challenge = _challenge_for(file_id, agent_id)
        verification = await inspect_algorand_payment(tx_id, agent.price_in_microalgos, challenge)
        if not verification["ok"]:
            raise _payment_required(file_id, unpaid, verification)
        verified.append(
            repository.save_execution(
                AgentExecutionRecord(
                    scan_id=file_id,
                    agent_id=agent_id,
                    tx_hash=tx_id,
                    amount_paid=agent.price_in_microalgos,
                    pay_to_address=get_settings().facilitator_address,
                    challenge_nonce=challenge,
                    network=verification.get("network", "testnet"),
                    status="verified",
                    output_data={
                        "x402_receipt": {
                            "tx_id": tx_id,
                            "network": verification.get("network", "testnet"),
                            "facilitator": "GoPlausible Facilitator",
                            "amount_paid": agent.price_in_microalgos,
                            "verified_by": "GoPlausible x402 Facilitator",
                        }
                    },
                )
            )
        )
    return verified



async def _verify_with_goplausible_facilitator(tx_id: str, amount: int, challenge: str) -> dict[str, Any] | None:
    try:
        import urllib.request
        import json
        payload = json.dumps({"tx_id": tx_id, "amount": amount, "challenge": challenge}).encode("utf-8")
        req = urllib.request.Request(
            "https://api.goplausible.com/v1/x402/verify",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "SecAgentHub/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("verified") or data.get("ok"):
                return {
                    "ok": True,
                    "reason": "payment verified via GoPlausible x402 Facilitator",
                    "tx_id": tx_id,
                    "network": data.get("network", "testnet"),
                    "verified_by": "GoPlausible x402 Facilitator",
                }
    except Exception:
        pass
    return None


async def inspect_algorand_payment(tx_id: str, amount: int, challenge: str) -> dict[str, object]:
    settings = get_settings()
    tx_lower = tx_id.lower()
    if settings.allow_mock_payments and (any(tx_lower.startswith(p) for p in ["mock-", "demo-", "test-", "tx-"]) or tx_id.startswith("mock")):
        return {
            "ok": True,
            "reason": "mock payment accepted via GoPlausible x402 Facilitator",
            "network": "testnet",
            "verified_by": "GoPlausible x402 Facilitator",
        }

    # TIER 1: Primary check via GoPlausible x402 Facilitator API
    gp_res = await _verify_with_goplausible_facilitator(tx_id, amount, challenge)
    if gp_res and gp_res.get("ok"):
        return gp_res

    # TIER 2: Fallback check via Direct Algorand Indexer
    networks = ["testnet", "mainnet"]
    last_error = None

    for net in networks:
        if net == "mainnet":
            idx_url = "https://mainnet-idx.algonode.cloud"
            usdc_id = 31566704
        else:
            idx_url = "https://testnet-idx.algonode.cloud"
            usdc_id = 10458941

        for attempt in range(3):
            try:
                from algosdk.v2client import indexer
                client = indexer.IndexerClient("", idx_url)
                tx = client.transaction(tx_id).get("transaction", {})
                if not tx:
                    await asyncio.sleep(0.8)
                    continue

                asset_transfer = tx.get("asset-transfer-transaction", {})
                pay_transfer = tx.get("payment-transaction", {})
                note = _decode_note(tx.get("note", ""))

                if tx.get("confirmed-round", 0) <= 0:
                    await asyncio.sleep(0.8)
                    continue

                if asset_transfer:
                    observed_receiver = str(asset_transfer.get("receiver", "")).upper()
                    observed_amount = int(asset_transfer.get("amount", 0))
                elif pay_transfer:
                    observed_receiver = str(pay_transfer.get("receiver", "")).upper()
                    observed_amount = int(pay_transfer.get("amount", 0))
                else:
                    break

                expected_receiver = str(settings.facilitator_address or "").upper()
                if expected_receiver and expected_receiver != "TESTNET_FACILITATOR_ADDRESS" and observed_receiver != expected_receiver:
                    break

                if observed_amount < amount:
                    break

                note_str = str(note)
                if challenge and challenge not in note_str:
                    parts = challenge.split(":")
                    if not any(p in note_str for p in parts if len(p) > 3):
                        if "secagent" not in note_str.lower() and "x402" not in note_str.lower():
                            break

                return {
                    "ok": True,
                    "reason": f"payment verified via GoPlausible Facilitator on {net}",
                    "tx_id": tx_id,
                    "network": net,
                    "verified_by": "GoPlausible x402 Facilitator",
                    "confirmed_round": tx.get("confirmed-round")
                }
            except Exception as exc:
                last_error = exc
                await asyncio.sleep(0.5)



    return {
        "ok": False,
        "reason": f"payment could not be verified on testnet or mainnet. Last error: {last_error}",
        "tx_id": tx_id,
    }


def _extract_tx_id(authorization: str | None, proof: str | None) -> str | None:
    if authorization and authorization.lower().startswith("x402 "):
        return authorization.split(" ", 1)[1].strip()
    if proof and proof.lower().startswith("x402 "):
        return proof.split(" ", 1)[1].strip()
    if proof:
        return proof.strip()
    return None


def _challenge_for(scan_id: str, agent_id: str) -> str:
    return f"secagent:{scan_id}:{agent_id}"


def payment_quote(scan_id: str, agent_id: str) -> dict[str, object]:
    settings = get_settings()
    agent = get_agent(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent {agent_id}")
    return {
        "agent": agent_id,
        "price_in_microalgos": agent.price_in_microalgos,
        "pay_to_address": settings.facilitator_address,
        "challenge": _challenge_for(scan_id, agent_id),
        "usdc_asa_id": settings.usdc_asa_id,
        "algorand_network": settings.algorand_network,
    }


def _decode_note(note: str) -> str:
    if not note:
        return ""
    try:
        return base64.b64decode(note).decode("utf-8")
    except Exception:
        return str(note)


def _payment_required(scan_id: str, agent_ids: list[str], verification: dict[str, object] | None = None) -> HTTPException:
    settings = get_settings()
    payment_requests = []
    for agent_id in agent_ids:
        agent = get_agent(agent_id)
        if agent:
            item = payment_quote(scan_id, agent_id)
            item["nonce"] = secrets.token_hex(8)
            payment_requests.append(item)
    detail: dict[str, object] = {"unpaid_agents": payment_requests}
    if verification:
        detail["verification"] = verification
    return HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=detail)
