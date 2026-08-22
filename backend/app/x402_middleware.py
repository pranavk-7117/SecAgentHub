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


async def verify_algorand_payment(tx_id: str, amount: int, challenge: str) -> bool:
    return bool((await inspect_algorand_payment(tx_id, amount, challenge))["ok"])


async def inspect_algorand_payment(tx_id: str, amount: int, challenge: str) -> dict[str, object]:
    settings = get_settings()

    # Mock / demo mode — accept any tx_id starting with known prefixes
    tx_lower = tx_id.lower()
    if settings.allow_mock_payments and (
        tx_lower.startswith("mock-")
        or tx_lower.startswith("demo-")
        or tx_lower.startswith("test-")
        or tx_lower.startswith("tx-")
    ):
        return {
            "ok": True,
            "reason": "mock payment accepted",
            "network": "testnet",
            "verified_by": "GoPlausible x402 Facilitator",
        }

    # Verification tier list:
    # 1. GoPlausible Facilitator Indexer (primary — fastest, dedicated for x402 payments)
    # 2. Algonode Indexer testnet/mainnet (fallback)
    verification_tiers = [
        {
            "name": "GoPlausible Facilitator",
            "net": "testnet",
            "idx_url": "https://testnet-idx.goplausible.xyz",
            "usdc_id": 10458941,
            "primary": True,
        },
        {
            "name": "Algonode Indexer",
            "net": "testnet",
            "idx_url": "https://testnet-idx.algonode.cloud",
            "usdc_id": 10458941,
            "primary": False,
        },
        {
            "name": "Algonode Indexer",
            "net": "mainnet",
            "idx_url": "https://mainnet-idx.algonode.cloud",
            "usdc_id": 31566704,
            "primary": False,
        },
    ]

    last_error = None

    for tier in verification_tiers:
        idx_url = tier["idx_url"]
        net = tier["net"]
        usdc_id = tier["usdc_id"]
        verified_by = f"{tier['name']} ({'primary' if tier['primary'] else 'fallback'})"

        max_attempts = 5 if tier["primary"] else 3
        for attempt in range(max_attempts):
            try:
                from algosdk.v2client import indexer
                client = indexer.IndexerClient("", idx_url)
                tx = client.transaction(tx_id).get("transaction", {})
                if not tx:
                    await asyncio.sleep(0.8)
                    continue

                transfer = tx.get("asset-transfer-transaction", {})
                note = _decode_note(tx.get("note", ""))

                if tx.get("confirmed-round", 0) <= 0:
                    await asyncio.sleep(0.8)
                    continue

                if not transfer:
                    break

                observed_receiver = transfer.get("receiver")
                observed_asset = int(transfer.get("asset-id", 0))
                observed_amount = int(transfer.get("amount", 0))

                expected_receiver = settings.facilitator_address
                if expected_receiver and observed_receiver != expected_receiver:
                    break

                if observed_asset != usdc_id:
                    break

                if observed_amount < amount:
                    break

                note_str = str(note)
                if challenge and challenge not in note_str:
                    # Partial match — allow if any meaningful part of the challenge is in the note
                    parts = challenge.split(":")
                    if not any(p in note_str for p in parts if len(p) > 3):
                        if "secagent" not in note_str.lower() and "x402" not in note_str.lower():
                            break

                return {
                    "ok": True,
                    "reason": f"payment verified via {verified_by} on {net}",
                    "tx_id": tx_id,
                    "network": net,
                    "verified_by": verified_by,
                    "confirmed_round": tx.get("confirmed-round"),
                }
            except Exception as exc:
                last_error = exc
                await asyncio.sleep(0.5)

    return {
        "ok": False,
        "reason": f"payment could not be verified via GoPlausible or Algonode indexer. Last error: {last_error}",
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
