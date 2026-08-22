from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.auth import get_current_user_id
from app.models import ScanRecord
from app.repository import repository
from app.services.attack_engine import SecurityDigitalTwin
from app.services.graph_service import build_attack_graph
from app.services.parser_service import parse_terraform
from app.services.scanner_service import run_checkov, summarize_findings

router = APIRouter(tags=["cicd"])


class CICDSecurityGateRequest(BaseModel):
    repository: str = Field(default="demo/infrastructure", description="GitHub repo name e.g. org/repo")
    branch: str = Field(default="feature/insecure-change", description="PR head branch")
    base_branch: str = Field(default="main", description="Target base branch")
    pr_number: Optional[int] = Field(default=None, description="GitHub Pull Request number")
    commit_sha: Optional[str] = Field(default=None, description="Git commit SHA")
    terraform_content: str = Field(..., description="Terraform HCL content for the PR")
    base_terraform_content: Optional[str] = Field(default=None, description="Baseline Terraform HCL content from base branch")
    filename: str = Field(default="main.tf", description="Primary IaC filename")


class CICDSecurityGateResponse(BaseModel):
    status: str  # "PASSED" | "BLOCKED"
    verdict: str  # "PASS" | "BLOCK"
    scan_id: str
    risk_score: int
    critical_findings: int
    high_findings: int
    critical_attack_paths: int
    attack_paths: list[dict[str, Any]]
    reasons: list[str]
    findings_summary: dict[str, Any]
    base_comparison: Optional[dict[str, Any]] = None
    pr_metadata: dict[str, Any]


@router.post("/security-gate", response_model=CICDSecurityGateResponse)
async def evaluate_cicd_security_gate(
    request: CICDSecurityGateRequest,
    user_id: str = Depends(get_current_user_id),
) -> CICDSecurityGateResponse:
    if not request.terraform_content.strip():
        raise HTTPException(status_code=400, detail="terraform_content cannot be empty.")

    # 1. Analyze PR Terraform
    pr_parsed = parse_terraform(request.terraform_content)
    pr_findings = run_checkov(request.terraform_content, request.filename)
    pr_graph = build_attack_graph(pr_parsed, pr_findings)

    pr_metadata = {
        "repository": request.repository,
        "branch": request.branch,
        "base_branch": request.base_branch,
        "pr_number": request.pr_number,
        "commit_sha": request.commit_sha,
        "filename": request.filename,
    }

    # Embed PR metadata in parsed & graph for persistence
    pr_parsed["pr_metadata"] = pr_metadata
    pr_graph["pr_metadata"] = pr_metadata

    # 2. Evaluate base comparison if baseline provided
    base_comparison = None
    if request.base_terraform_content and request.base_terraform_content.strip():
        try:
            base_parsed = parse_terraform(request.base_terraform_content)
            base_findings = run_checkov(request.base_terraform_content, request.filename)
            base_graph = build_attack_graph(base_parsed, base_findings)

            base_risk = base_graph.get("blast_radius_score", 0)
            pr_risk = pr_graph.get("blast_radius_score", 0)

            base_attack_paths = len(base_graph.get("critical_attack_paths", []))
            pr_attack_paths = len(pr_graph.get("critical_attack_paths", []))

            base_failed_checks = base_findings.get("results", {}).get("failed_checks", [])
            pr_failed_checks = pr_findings.get("results", {}).get("failed_checks", [])

            base_check_ids = {f.get("check_id") for f in base_failed_checks if f.get("check_id")}
            pr_check_ids = {f.get("check_id") for f in pr_failed_checks if f.get("check_id")}

            new_check_ids = list(pr_check_ids - base_check_ids)
            resolved_check_ids = list(base_check_ids - pr_check_ids)

            base_comparison = {
                "before_risk": base_risk,
                "after_risk": pr_risk,
                "risk_delta": pr_risk - base_risk,
                "before_attack_paths": base_attack_paths,
                "after_attack_paths": pr_attack_paths,
                "new_attack_paths": max(0, pr_attack_paths - base_attack_paths),
                "before_findings_count": len(base_failed_checks),
                "after_findings_count": len(pr_failed_checks),
                "new_findings": new_check_ids,
                "resolved_findings": resolved_check_ids,
            }
            pr_graph["base_comparison"] = base_comparison
        except Exception as exc:
            base_comparison = {"error": f"Failed to compute baseline comparison: {exc}"}

    # 3. Security Gate verdict
    sec_gate = pr_graph.get("security_gate", {})
    verdict = sec_gate.get("verdict", "PASS")
    reasons = list(sec_gate.get("reasons", []))

    # If base comparison indicates newly introduced attack paths or critical increase
    if base_comparison and not base_comparison.get("error"):
        if base_comparison.get("new_attack_paths", 0) > 0 and verdict == "PASS":
            verdict = "BLOCK"
            reasons.append(f"{base_comparison['new_attack_paths']} new critical attack path(s) introduced by this PR")

    status = "BLOCKED" if verdict == "BLOCK" else "PASSED"

    # 4. Save scan record to repository
    scan = repository.create_scan(
        ScanRecord(
            user_id=user_id,
            filename=f"PR-{request.pr_number or 'CI'}-{request.filename}",
            raw_hcl=request.terraform_content,
            parsed=pr_parsed,
            raw_checkov_json=pr_findings,
            graph=pr_graph,
        )
    )

    failed_checks = pr_findings.get("results", {}).get("failed_checks", [])
    critical_findings = sum(1 for f in failed_checks if str(f.get("severity", "")).upper() == "CRITICAL")
    high_findings = sum(1 for f in failed_checks if str(f.get("severity", "")).upper() == "HIGH")

    return CICDSecurityGateResponse(
        status=status,
        verdict=verdict,
        scan_id=scan.id,
        risk_score=pr_graph.get("blast_radius_score", 0),
        critical_findings=critical_findings,
        high_findings=high_findings,
        critical_attack_paths=len(pr_graph.get("critical_attack_paths", [])),
        attack_paths=pr_graph.get("attack_paths", []),
        reasons=reasons,
        findings_summary=summarize_findings(pr_findings),
        base_comparison=base_comparison,
        pr_metadata=pr_metadata,
    )
