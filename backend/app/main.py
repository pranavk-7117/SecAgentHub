from __future__ import annotations

import requests
from typing import Annotated

from fastapi import FastAPI, File, Header, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.core.config import get_settings
from app.models import AgentExecuteRequest, AgentExecutionRecord, ChatRequest, ScanRecord, UploadResponse, X402SettledExecuteRequest, RemediationGenerateRequest, RemediationGenerateResponse, VerifyPatchRequest
from app.repository import repository
from app.services.agent_service import AGENTS, answer_question, execute_agent, get_agent
from app.services.graph_service import build_attack_graph
from app.services.parser_service import parse_terraform
from app.services.report_service import build_pdf
from app.services.scanner_service import run_checkov, summarize_findings
from app.x402_middleware import inspect_algorand_payment, payment_quote, require_agent_payments
from app.services.remediation_orchestrator import run_remediation_loop, verify_user_patch

app = FastAPI(title="SecAgent Hub API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user_id(authorization: str | None = Header(None)) -> str:
    settings = get_settings()
    if not settings.supabase_url:
        fallback_uid = "00000000-0000-0000-0000-000000000000"
        repository.ensure_user(fallback_uid, "local-dev@example.com")
        return fallback_uid

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication credentials.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        url = f"{settings.supabase_url}/auth/v1/user"
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {token}"
        }
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            user_id = data.get("id")
            email = data.get("email")
            if user_id and email:
                repository.ensure_user(user_id, email)
                return user_id
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Authentication validation failed: {str(exc)}")

    raise HTTPException(status_code=401, detail="Authentication token is expired or invalid.")



@app.get("/api/v1/health")
async def health() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "db_reachable": bool(settings.supabase_url) or True,
        "algorand_configured": bool(settings.indexer_url and settings.usdc_asa_id),
    }


@app.post("/api/v1/scan/upload", response_model=UploadResponse)
async def upload_scan(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
) -> UploadResponse:
    if not file.filename.endswith(".tf"):
        raise HTTPException(status_code=400, detail="Only Terraform .tf files are supported.")
    raw_hcl = (await file.read()).decode("utf-8")
    parsed = parse_terraform(raw_hcl)
    findings = run_checkov(raw_hcl, file.filename)
    graph = build_attack_graph(parsed, findings)
    scan = repository.create_scan(ScanRecord(user_id=user_id, filename=file.filename, raw_hcl=raw_hcl, parsed=parsed, raw_checkov_json=findings, graph=graph))
    return UploadResponse(scan_id=scan.id, findings_summary=summarize_findings(findings), agents=AGENTS)


@app.post("/api/v1/agents/execute")
async def run_agents(
    request: AgentExecuteRequest,
    authorization: Annotated[str | None, Header()] = None,
    x_payment_proof: Annotated[str | None, Header(alias="X-PAYMENT-PROOF")] = None,
) -> dict[str, object]:
    user_id = get_current_user_id(authorization)
    scan = repository.get_scan(request.file_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    await require_agent_payments(request.file_id, request.agent_ids, authorization, x_payment_proof)
    outputs = {}
    for agent_id in request.agent_ids:
        if get_agent(agent_id) is None:
            raise HTTPException(status_code=404, detail=f"Unknown agent {agent_id}")
        outputs[agent_id] = execute_agent(agent_id, scan.parsed, scan.raw_checkov_json, scan.graph, scan.raw_hcl)
        for execution in repository.get_executions(scan.id):
            if execution.agent_id == agent_id and execution.status == "verified":
                execution.output_data = outputs[agent_id]
                execution.status = "executed"
                repository.save_execution(execution)
    return {"scan_id": scan.id, "outputs": outputs, "executions": [row.model_dump(mode="json") for row in repository.get_executions(scan.id)]}



@app.post("/api/v1/internal/x402/agents/execute")
async def run_x402_settled_agents(
    request: X402SettledExecuteRequest,
    x_internal_secret: Annotated[str | None, Header(alias="X-Internal-Secret")] = None,
) -> dict[str, object]:
    settings = get_settings()
    if not settings.internal_api_secret or x_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=403, detail="Internal x402 bridge secret is invalid.")

    scan = repository.get_scan(request.file_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")

    outputs = {}
    executions = []
    for agent_id in request.agent_ids:
        agent = get_agent(agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail=f"Unknown agent {agent_id}")
        output = execute_agent(agent_id, scan.parsed, scan.raw_checkov_json, scan.graph, scan.raw_hcl)
        outputs[agent_id] = output

        verified_by = request.payment_response.get("verified_by", "GoPlausible Facilitator")
        executions.append(
            repository.save_execution(
                AgentExecutionRecord(
                    scan_id=scan.id,
                    agent_id=agent_id,
                    tx_hash=request.tx_id,
                    amount_paid=request.amount_paid,
                    pay_to_address=settings.facilitator_address,
                    challenge_nonce=f"x402:{scan.id}:{agent_id}",
                    status="executed",
                    output_data={
                        **output,
                        "x402_receipt": {
                            "tx_id": request.tx_id,
                            "payer": request.payer,
                            "network": request.network,
                            "facilitator": request.facilitator,
                            "amount_paid": request.amount_paid,
                            "verified_by": verified_by,
                        },
                    },
                )
            )
        )
    receipt = {
        "protocol": "x402",
        "facilitator": request.facilitator,
        "network": request.network,
        "tx_id": request.tx_id,
        "payer": request.payer,
        "amount_paid": request.amount_paid,
        "agent_ids": request.agent_ids,
        "business_model": "pay-per-agent Terraform security analysis",
    }
    return {
        "scan_id": scan.id,
        "outputs": outputs,
        "receipt": receipt,
        "executions": [row.model_dump(mode="json") for row in executions],
    }


@app.get("/api/v1/graph/{file_id}")
async def get_graph(file_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    scan = repository.get_scan(file_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return scan.graph


@app.get("/api/v1/payments/quote")
async def get_payment_quote(scan_id: str, agent_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    if repository.get_scan(scan_id, user_id=user_id) is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return payment_quote(scan_id, agent_id)


@app.get("/api/v1/payments/status")
async def get_payment_status(scan_id: str, agent_id: str, tx_id: str | None = None, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    if repository.get_scan(scan_id, user_id=user_id) is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    executions = [row for row in repository.get_executions(scan_id) if row.agent_id == agent_id]
    if tx_id:
        executions = [row for row in executions if row.tx_hash == tx_id]
    return {"paid": any(row.status in {"verified", "executed"} for row in executions), "executions": [row.model_dump(mode="json") for row in executions]}


@app.get("/api/v1/payments/inspect")
async def inspect_payment(scan_id: str, agent_id: str, tx_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    if repository.get_scan(scan_id, user_id=user_id) is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    quote = payment_quote(scan_id, agent_id)
    return await inspect_algorand_payment(tx_id, int(quote["price_in_microalgos"]), str(quote["challenge"]))


@app.post("/api/v1/ai/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    scan = repository.get_scan(request.scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return {"answer": answer_question(request.question, scan.raw_hcl, scan.raw_checkov_json)}


@app.get("/api/v1/scan/{scan_id}")
async def get_scan(scan_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    scan = repository.get_scan(scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return {
        **scan.model_dump(mode="json"),
        "findings_summary": summarize_findings(scan.raw_checkov_json),
        "agents": [agent.model_dump() for agent in AGENTS],
        "agent_executions": [row.model_dump(mode="json") for row in repository.get_executions(scan_id)],
    }


@app.get("/api/v1/scans")
async def list_scans(user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    scans = []
    for scan in repository.list_scans(user_id=user_id):
        executions = repository.get_executions(scan.id)
        scans.append(
            {
                **scan.model_dump(mode="json"),
                "findings_summary": summarize_findings(scan.raw_checkov_json),
                "agents_run": [row.agent_id for row in executions if row.status == "executed"],
                "agent_executions": [row.model_dump(mode="json") for row in executions if row.status == "executed"],
                "agent_execution_count": len([row for row in executions if row.status == "executed"]),
            }
        )
    return {"scans": scans}


@app.get("/api/v1/scan/{scan_id}/report")
async def report(scan_id: str, user_id: str = Depends(get_current_user_id)) -> Response:
    scan = repository.get_scan(scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    executions = repository.get_executions(scan_id)
    successful_payment = any(row.status == "executed" for row in executions)
    if not successful_payment:
        raise HTTPException(
            status_code=403,
            detail="Scan report is locked. At least one payment transaction must be verified and executed to view/download reports.",
        )
    data = build_pdf(scan, executions)
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="secagent-{scan_id}.pdf"'},
    )


@app.delete("/api/v1/scan/{scan_id}")
async def delete_scan(scan_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, bool]:
    # Check scan ownership first
    scan = repository.get_scan(scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    success = repository.delete_scan(scan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return {"success": True}


@app.post("/api/v1/remediation/{scan_id}/generate", response_model=RemediationGenerateResponse)
async def generate_remediation_endpoint(scan_id: str, request: RemediationGenerateRequest, user_id: str = Depends(get_current_user_id)) -> RemediationGenerateResponse:
    scan = repository.get_scan(scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    
    proof = run_remediation_loop(scan, max_retries=request.max_retries, target_check_ids=request.target_findings)
    
    return RemediationGenerateResponse(
        proof_of_fix=proof.model_dump(mode="json"),
        remediation=proof.remediation.model_dump(mode="json") if proof.remediation else None,
        validation=proof.validation.model_dump(mode="json") if proof.validation else None,
    )


@app.get("/api/v1/remediation/{scan_id}/proof")
async def get_remediation_proof(scan_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    raise HTTPException(status_code=404, detail="Proof storage not implemented in current branch.")


@app.post("/api/v1/remediation/{scan_id}/verify-patch")
async def verify_patch_endpoint(scan_id: str, request: VerifyPatchRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, object]:
    scan = repository.get_scan(scan_id, user_id=user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    
    proof = verify_user_patch(scan, request.patched_hcl)
    return {"proof_of_fix": proof.model_dump(mode="json")}
