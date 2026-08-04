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
                    status="verified",
                )
            )
        )
    return verified


async def verify_algorand_payment(tx_id: str, amount: int, challenge: str) -> bool:
    return bool((await inspect_algorand_payment(tx_id, amount, challenge))["ok"])


async def inspect_algorand_payment(tx_id: str, amount: int, challenge: str) -> dict[str, object]:
    settings = get_settings()
    if settings.allow_mock_payments and tx_id.startswith("mock-"):
        return {"ok": True, "reason": "mock payment accepted"}
    last_error: Exception | None = None
    for attempt in range(5):
        result = await _inspect_algorand_payment_once(tx_id, amount, challenge)
        if result["ok"] or "indexer verification failed" not in str(result.get("reason", "")):
            return result
        last_error = result.get("error") if isinstance(result.get("error"), Exception) else None
        if attempt < 4:
            await asyncio.sleep(1.2)
    return {
        "ok": False,
        "reason": f"indexer verification failed after retries: {type(last_error).__name__ if last_error else 'unknown'}",
        "tx_id": tx_id,
    }


async def _inspect_algorand_payment_once(tx_id: str, amount: int, challenge: str) -> dict[str, object]:
    settings = get_settings()
    try:
        from algosdk.v2client import indexer

        client = indexer.IndexerClient("", settings.indexer_url)
        tx = client.transaction(tx_id).get("transaction", {})
        if not tx:
            return {"ok": False, "reason": "transaction not found in indexer yet", "tx_id": tx_id}
        transfer = tx.get("asset-transfer-transaction", {})
        note = _decode_note(tx.get("note", ""))
        if tx.get("confirmed-round", 0) <= 0:
            return {"ok": False, "reason": "transaction is not confirmed yet", "tx_id": tx_id}
        if not transfer:
            return {"ok": False, "reason": "transaction is not an Algorand ASA transfer", "tx_id": tx_id, "tx_type": tx.get("tx-type")}
        observed_receiver = transfer.get("receiver")
        observed_asset = int(transfer.get("asset-id", 0))
        observed_amount = int(transfer.get("amount", 0))
        if observed_receiver != settings.facilitator_address:
            return {"ok": False, "reason": "receiver address does not match facilitator", "expected": settings.facilitator_address, "observed": observed_receiver}
        if observed_asset != int(settings.usdc_asa_id):
            return {"ok": False, "reason": "asset id does not match configured TestNet USDC ASA", "expected": settings.usdc_asa_id, "observed": observed_asset}
        if observed_amount < amount:
            return {"ok": False, "reason": "payment amount is too low", "expected_minimum": amount, "observed": observed_amount}
        if challenge not in str(note):
            return {"ok": False, "reason": "transaction note does not contain this agent challenge", "expected_challenge": challenge, "observed_note": note}
        return {"ok": True, "reason": "payment verified", "tx_id": tx_id, "confirmed_round": tx.get("confirmed-round")}
    except Exception as exc:
        return {"ok": False, "reason": f"indexer verification failed: {type(exc).__name__}: {exc}", "tx_id": tx_id, "error": exc}


def _extract_tx_id(authorization: str | None, proof: str | None) -> str | None:
    if authorization and authorization.lower().startswith("x402 "):
        return authorization.split(" ", 1)[1].strip()
    return proof


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
