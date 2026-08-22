"""Remediation Orchestrator — runs the full closed-loop remediation cycle.

Flow:
  1. Assemble evidence from scan data
  2. Generate AI remediation candidate
  3. Run verification pipeline
  4. If PASS → generate Proof-of-Fix → return
  5. If FAIL → feed failure to AI → retry (up to max_retries)

The orchestrator enforces the separation:
  AI PROPOSES → Deterministic Engine VERIFIES
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from app.models import ScanRecord
from app.services.ai_remediation_engine import generate_remediation
from app.services.evidence_service import assemble_evidence
from app.services.remediation_models import (
    FixStatus,
    ProofOfFix,
    RemediationCandidate,
    ValidationResult,
    ValidationStep,
)
from app.services.verification_service import verify_remediation


def run_remediation_loop(
    scan: ScanRecord,
    max_retries: int = 3,
    target_check_ids: list[str] | None = None,
) -> ProofOfFix:
    """Execute the full remediation → verification loop.

    Args:
        scan: The ScanRecord containing parsed HCL, findings, and graph
        max_retries: Maximum remediation attempts (default 3)
        target_check_ids: Optional list of specific Checkov check IDs to target

    Returns:
        ProofOfFix attestation with VERIFIED or FAILED status.
    """
    # Build evidence from scan data (hallucination firewall)
    evidence = assemble_evidence(
        parsed=scan.parsed,
        findings=scan.raw_checkov_json,
        graph=scan.graph,
        raw_hcl=scan.raw_hcl,
    )

    previous_failure: str | None = None
    last_candidate: RemediationCandidate | None = None
    last_validation: ValidationResult | None = None
    all_steps: list[ValidationStep] = []
    all_failures: list[str] = []

    for attempt in range(1, max_retries + 1):
        # ----- Generate remediation -----
        candidate = generate_remediation(
            evidence=evidence,
            raw_hcl=scan.raw_hcl,
            previous_failure=previous_failure,
            attempt_number=attempt,
        )
        last_candidate = candidate

        all_steps.append(ValidationStep(
            name=f"Remediation Generation (Attempt {attempt})",
            status="passed",
            detail=f"Generated via {candidate.generation_method}: {candidate.proposed_change[:200]}",
        ))

        # ----- Verify remediation -----
        validation = verify_remediation(
            candidate=candidate,
            original_hcl=scan.raw_hcl,
            original_findings=scan.raw_checkov_json,
            original_graph=scan.graph,
        )
        last_validation = validation
        all_steps.extend(validation.steps)

        if validation.overall_status == "PASSED":
            # SUCCESS — generate proof-of-fix
            return _generate_proof_of_fix(
                candidate=candidate,
                validation=validation,
                scan=scan,
                attempts_used=attempt,
                max_attempts=max_retries,
                all_steps=all_steps,
            )

        # FAILED — prepare feedback for next attempt
        previous_failure = "; ".join(validation.failure_reasons) or "Verification did not pass"
        all_failures.extend(validation.failure_reasons)

        all_steps.append(ValidationStep(
            name=f"Attempt {attempt} Result",
            status="failed",
            detail=previous_failure,
        ))

    # All attempts exhausted
    return ProofOfFix(
        status=FixStatus.FAILED,
        target_issue=last_candidate.target_issue if last_candidate else "Unknown",
        target_check_ids=last_candidate.target_check_ids if last_candidate else [],
        original_attack_paths=evidence.total_attack_paths,
        new_attack_paths=last_validation.attack_path_comparison.attack_paths_after if last_validation else evidence.total_attack_paths,
        paths_eliminated=0,
        original_failed_checks=evidence.total_findings,
        new_failed_checks=last_validation.checkov_rescan.failed_count if last_validation else evidence.total_findings,
        checks_resolved=0,
        terraform_valid=last_validation.hcl_validation.valid if last_validation else False,
        checkov_passed=False,
        attack_paths_reduced=False,
        no_regression=False,
        original_hcl_hash=_hash_hcl(scan.raw_hcl),
        patched_hcl_hash=_hash_hcl(last_candidate.terraform_patch) if last_candidate else "",
        patched_hcl=last_candidate.terraform_patch if last_candidate else "",
        verification_timestamp=datetime.now(timezone.utc).isoformat(),
        attempts_used=max_retries,
        max_attempts=max_retries,
        generation_method=last_candidate.generation_method if last_candidate else "none",
        verification_steps=all_steps,
        failure_reasons=all_failures,
        remediation=last_candidate,
        validation=last_validation,
    )


def verify_user_patch(
    scan: ScanRecord,
    patched_hcl: str,
) -> ProofOfFix:
    """Verify a user-supplied Terraform patch against the original scan.

    This allows users to provide their own fix and run it through
    the same verification pipeline.

    Args:
        scan: The original ScanRecord
        patched_hcl: The user's patched Terraform HCL

    Returns:
        ProofOfFix attestation.
    """
    candidate = RemediationCandidate(
        target_issue="User-supplied Terraform patch",
        target_check_ids=[],
        explanation="Patch provided by user for verification",
        proposed_change="User-supplied modification",
        terraform_patch=patched_hcl,
        expected_effect="User-defined security improvement",
        confidence=1.0,
        generation_method="user",
    )

    validation = verify_remediation(
        candidate=candidate,
        original_hcl=scan.raw_hcl,
        original_findings=scan.raw_checkov_json,
        original_graph=scan.graph,
    )

    evidence = assemble_evidence(
        parsed=scan.parsed,
        findings=scan.raw_checkov_json,
        graph=scan.graph,
        raw_hcl=scan.raw_hcl,
    )

    if validation.overall_status == "PASSED":
        return _generate_proof_of_fix(
            candidate=candidate,
            validation=validation,
            scan=scan,
            attempts_used=1,
            max_attempts=1,
            all_steps=validation.steps,
        )

    return ProofOfFix(
        status=FixStatus.FAILED,
        target_issue="User-supplied Terraform patch",
        original_attack_paths=evidence.total_attack_paths,
        new_attack_paths=validation.attack_path_comparison.attack_paths_after,
        paths_eliminated=max(0, evidence.total_attack_paths - validation.attack_path_comparison.attack_paths_after),
        original_failed_checks=evidence.total_findings,
        new_failed_checks=validation.checkov_rescan.failed_count,
        checks_resolved=len(validation.checkov_rescan.findings_resolved),
        terraform_valid=validation.hcl_validation.valid,
        checkov_passed=validation.checkov_rescan.failed_count < validation.checkov_rescan.original_failed_count,
        attack_paths_reduced=validation.attack_path_comparison.attack_paths_after < validation.attack_path_comparison.attack_paths_before,
        no_regression=validation.regression_check_passed,
        original_hcl_hash=_hash_hcl(scan.raw_hcl),
        patched_hcl_hash=_hash_hcl(patched_hcl),
        patched_hcl=patched_hcl,
        verification_timestamp=datetime.now(timezone.utc).isoformat(),
        attempts_used=1,
        max_attempts=1,
        generation_method="user",
        verification_steps=validation.steps,
        failure_reasons=validation.failure_reasons,
        remediation=candidate,
        validation=validation,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _generate_proof_of_fix(
    candidate: RemediationCandidate,
    validation: ValidationResult,
    scan: ScanRecord,
    attempts_used: int,
    max_attempts: int,
    all_steps: list[ValidationStep],
) -> ProofOfFix:
    """Generate a VERIFIED proof-of-fix attestation.

    WORDING: "This specific remediation passed our defined verification pipeline."
    We do NOT claim the infrastructure is mathematically proven secure.
    """
    evidence = assemble_evidence(
        parsed=scan.parsed,
        findings=scan.raw_checkov_json,
        graph=scan.graph,
        raw_hcl=scan.raw_hcl,
    )

    comparison = validation.attack_path_comparison
    checkov = validation.checkov_rescan

    return ProofOfFix(
        status=FixStatus.VERIFIED,
        target_issue=candidate.target_issue,
        target_check_ids=candidate.target_check_ids,

        # Attack path comparison
        original_attack_paths=comparison.attack_paths_before,
        new_attack_paths=comparison.attack_paths_after,
        paths_eliminated=comparison.paths_broken,

        # Checkov comparison
        original_failed_checks=checkov.original_failed_count,
        new_failed_checks=checkov.failed_count,
        checks_resolved=len(checkov.findings_resolved),

        # Verification flags
        terraform_valid=validation.hcl_validation.valid,
        checkov_passed=checkov.failed_count <= checkov.original_failed_count,
        attack_paths_reduced=comparison.attack_paths_after <= comparison.attack_paths_before,
        no_regression=validation.regression_check_passed,

        # Artifacts
        original_hcl_hash=_hash_hcl(scan.raw_hcl),
        patched_hcl_hash=_hash_hcl(candidate.terraform_patch),
        patched_hcl=candidate.terraform_patch,

        # Metadata
        verification_timestamp=datetime.now(timezone.utc).isoformat(),
        attempts_used=attempts_used,
        max_attempts=max_attempts,
        generation_method=candidate.generation_method,

        # Details
        verification_steps=all_steps,
        failure_reasons=[],
        remediation=candidate,
        validation=validation,
    )


def _hash_hcl(hcl: str) -> str:
    """Generate a SHA-256 hash of Terraform HCL content."""
    return hashlib.sha256(hcl.encode("utf-8")).hexdigest()
