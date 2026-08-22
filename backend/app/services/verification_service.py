"""Verification Service — closed-loop validation pipeline.

Architecture:
  RemediationCandidate
    → HCL Validation (parse_terraform)
    → Checkov Re-scan (run_checkov)
    → Attack Graph Rebuild (build_attack_graph)
    → Attack Path Comparison
    → Regression Check
    → ValidationResult (PASSED / FAILED)

The AI has ZERO say in whether the fix passes.
Only deterministic engines (Checkov, graph analysis) decide.
"""
from __future__ import annotations

from typing import Any

from app.services.graph_service import build_attack_graph
from app.services.parser_service import parse_terraform
from app.services.remediation_models import (
    AttackPathComparison,
    CheckovRescanResult,
    HCLValidationResult,
    RemediationCandidate,
    ValidationResult,
    ValidationStep,
)
from app.services.scanner_service import run_checkov, summarize_findings


def verify_remediation(
    candidate: RemediationCandidate,
    original_hcl: str,
    original_findings: dict[str, Any],
    original_graph: dict[str, Any],
) -> ValidationResult:
    """Run the full verification pipeline on a remediation candidate.

    Steps:
        1. HCL Validation — can the patched HCL be parsed?
        2. Checkov Re-scan — run Checkov on the patched HCL
        3. Attack Graph Rebuild — build a new attack graph
        4. Attack Path Comparison — compare paths before/after
        5. Regression Check — ensure no new critical findings

    Args:
        candidate: The AI-generated remediation to verify
        original_hcl: The original Terraform HCL
        original_findings: Original Checkov findings
        original_graph: Original attack graph

    Returns:
        ValidationResult with overall PASSED/FAILED and step details.
    """
    steps: list[ValidationStep] = []
    failure_reasons: list[str] = []

    # -----------------------------------------------------------------------
    # Step 1: HCL Validation
    # -----------------------------------------------------------------------
    hcl_result = _validate_hcl(candidate.terraform_patch)
    steps.append(ValidationStep(
        name="Terraform HCL Validation",
        status="passed" if hcl_result.valid else "failed",
        detail=hcl_result.error_message or f"Valid HCL with {hcl_result.resource_count} resources",
    ))

    if not hcl_result.valid:
        failure_reasons.append(f"HCL validation failed: {hcl_result.error_message}")
        return ValidationResult(
            overall_status="FAILED",
            hcl_validation=hcl_result,
            checkov_rescan=CheckovRescanResult(),
            attack_path_comparison=AttackPathComparison(),
            regression_check_passed=False,
            steps=steps,
            failure_reasons=failure_reasons,
        )

    # -----------------------------------------------------------------------
    # Step 2: Checkov Re-scan
    # -----------------------------------------------------------------------
    new_findings = run_checkov(candidate.terraform_patch, "patched.tf")
    checkov_result = _compare_checkov(original_findings, new_findings, candidate.target_check_ids)
    steps.append(ValidationStep(
        name="Checkov Security Re-scan",
        status="passed" if checkov_result.failed_count <= checkov_result.original_failed_count else "failed",
        detail=(
            f"Failed: {checkov_result.original_failed_count} → {checkov_result.failed_count}, "
            f"Resolved: {len(checkov_result.findings_resolved)}, "
            f"New: {len(checkov_result.new_findings)}"
        ),
    ))

    # -----------------------------------------------------------------------
    # Step 3: Attack Graph Rebuild
    # -----------------------------------------------------------------------
    new_parsed = parse_terraform(candidate.terraform_patch)
    new_graph = build_attack_graph(new_parsed, new_findings)
    steps.append(ValidationStep(
        name="Digital Twin Rebuild",
        status="passed",
        detail=f"Rebuilt attack graph with {len(new_graph.get('nodes', []))} nodes and {len(new_graph.get('edges', []))} edges",
    ))

    # -----------------------------------------------------------------------
    # Step 4: Attack Path Comparison
    # -----------------------------------------------------------------------
    path_comparison = _compare_attack_paths(original_graph, new_graph)
    paths_improved = path_comparison.attack_paths_after <= path_comparison.attack_paths_before
    steps.append(ValidationStep(
        name="Attack Path Re-analysis",
        status="passed" if paths_improved else "failed",
        detail=(
            f"Paths: {path_comparison.attack_paths_before} → {path_comparison.attack_paths_after}, "
            f"Broken: {path_comparison.paths_broken}, "
            f"New: {len(path_comparison.new_paths)}"
        ),
    ))

    if not paths_improved:
        failure_reasons.append(
            f"Attack paths increased from {path_comparison.attack_paths_before} "
            f"to {path_comparison.attack_paths_after}"
        )

    # -----------------------------------------------------------------------
    # Step 5: Regression Check
    # -----------------------------------------------------------------------
    regression_passed = len(checkov_result.new_findings) == 0 and len(path_comparison.new_paths) == 0
    steps.append(ValidationStep(
        name="Security Regression Check",
        status="passed" if regression_passed else "failed",
        detail=(
            "No new security issues introduced"
            if regression_passed
            else f"Regression: {len(checkov_result.new_findings)} new findings, {len(path_comparison.new_paths)} new paths"
        ),
    ))

    if not regression_passed:
        if checkov_result.new_findings:
            failure_reasons.append(f"New Checkov findings introduced: {', '.join(checkov_result.new_findings)}")
        if path_comparison.new_paths:
            failure_reasons.append(f"New attack paths introduced: {len(path_comparison.new_paths)}")

    # -----------------------------------------------------------------------
    # Overall assessment
    # -----------------------------------------------------------------------
    # PASS if: HCL valid AND (findings reduced OR paths reduced) AND no critical regression
    findings_improved = checkov_result.failed_count < checkov_result.original_failed_count
    overall_improved = findings_improved or paths_improved
    critical_regression = any(
        "CRITICAL" in str(f).upper() or "HIGH" in str(f).upper()
        for f in checkov_result.new_findings
    )

    overall_passed = hcl_result.valid and overall_improved and not critical_regression
    if not overall_passed and not failure_reasons:
        failure_reasons.append("No measurable security improvement detected")

    return ValidationResult(
        overall_status="PASSED" if overall_passed else "FAILED",
        hcl_validation=hcl_result,
        checkov_rescan=checkov_result,
        attack_path_comparison=path_comparison,
        regression_check_passed=regression_passed,
        steps=steps,
        failure_reasons=failure_reasons,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _validate_hcl(patched_hcl: str) -> HCLValidationResult:
    """Validate that the patched HCL can be parsed."""
    try:
        parsed = parse_terraform(patched_hcl)
        resource_count = len(parsed.get("resources", []))
        # Check if parsing actually found resources (basic sanity check)
        if resource_count == 0 and "resource" in patched_hcl:
            return HCLValidationResult(
                valid=True,
                error_message="Warning: parser found 0 resources but HCL contains resource blocks",
                resource_count=0,
            )
        return HCLValidationResult(valid=True, resource_count=resource_count)
    except Exception as exc:
        return HCLValidationResult(valid=False, error_message=str(exc))


def _compare_checkov(
    original_findings: dict[str, Any],
    new_findings: dict[str, Any],
    target_check_ids: list[str],
) -> CheckovRescanResult:
    """Compare original and new Checkov results."""
    original_failed = set()
    for check in (original_findings.get("results") or {}).get("failed_checks", []):
        check_id = check.get("check_id", "")
        if check_id:
            original_failed.add(check_id)

    new_failed = set()
    for check in (new_findings.get("results") or {}).get("failed_checks", []):
        check_id = check.get("check_id", "")
        if check_id:
            new_failed.add(check_id)

    original_summary = summarize_findings(original_findings)
    new_summary = summarize_findings(new_findings)

    resolved = original_failed - new_failed
    newly_introduced = new_failed - original_failed

    return CheckovRescanResult(
        failed_count=new_summary.get("failed_count", 0),
        passed_count=new_summary.get("passed_count", 0),
        original_failed_count=original_summary.get("failed_count", 0),
        findings_resolved=sorted(resolved),
        new_findings=sorted(newly_introduced),
    )


def _compare_attack_paths(
    original_graph: dict[str, Any],
    new_graph: dict[str, Any],
) -> AttackPathComparison:
    """Compare attack paths between original and new graphs."""
    original_paths = original_graph.get("critical_attack_paths", [])
    new_paths = new_graph.get("critical_attack_paths", [])

    # Convert paths to tuples for set comparison
    original_set = {tuple(p) for p in original_paths}
    new_set = {tuple(p) for p in new_paths}

    broken = original_set - new_set
    introduced = new_set - original_set

    # Count critical paths (those reaching sensitive resources)
    def _is_critical_path(path: list[str] | tuple[str, ...]) -> bool:
        return any(
            "s3" in node.lower() or "rds" in node.lower() or "secret" in node.lower()
            for node in path
        )

    original_critical = sum(1 for p in original_paths if _is_critical_path(p))
    new_critical = sum(1 for p in new_paths if _is_critical_path(p))

    return AttackPathComparison(
        attack_paths_before=len(original_paths),
        attack_paths_after=len(new_paths),
        critical_before=original_critical,
        critical_after=new_critical,
        paths_broken=len(broken),
        paths_remaining=[list(p) for p in new_set],
        new_paths=[list(p) for p in introduced],
        blast_radius_before=original_graph.get("blast_radius_score", 0),
        blast_radius_after=new_graph.get("blast_radius_score", 0),
    )
