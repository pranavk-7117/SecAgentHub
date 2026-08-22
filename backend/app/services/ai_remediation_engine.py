"""AI Remediation Engine — generates structured Terraform patches.

Architecture:
  SecurityEvidence → Structured Prompt → LLM → RemediationCandidate
                                          ↓ (fallback)
                                   Deterministic Patcher

The AI receives ONLY SecurityEvidence (hallucination firewall).
It produces machine-readable JSON, not free-form text.
"""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

from app.core.config import get_settings
from app.services.remediation_models import (
    RemediationCandidate,
    SecurityEvidence,
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_remediation(
    evidence: SecurityEvidence,
    raw_hcl: str,
    previous_failure: str | None = None,
    attempt_number: int = 1,
) -> RemediationCandidate:
    """Generate a remediation candidate from structured evidence.

    Args:
        evidence: Structured security evidence (hallucination firewall input)
        raw_hcl: The original Terraform HCL to patch
        previous_failure: If retrying, the reason the last attempt failed
        attempt_number: Which attempt this is (1-based)

    Returns:
        A RemediationCandidate with a concrete Terraform patch.
    """
    settings = get_settings()

    if settings.groq_api_key:
        try:
            candidate = _generate_via_llm(evidence, raw_hcl, previous_failure, attempt_number)
            if candidate and candidate.terraform_patch.strip():
                return candidate
        except Exception:
            pass  # Fall through to deterministic

    return _deterministic_patch(evidence, raw_hcl, attempt_number)


# ---------------------------------------------------------------------------
# LLM-based generation
# ---------------------------------------------------------------------------

def _generate_via_llm(
    evidence: SecurityEvidence,
    raw_hcl: str,
    previous_failure: str | None,
    attempt_number: int,
) -> RemediationCandidate | None:
    """Use Groq LLM to generate a structured remediation candidate."""
    system_prompt = _build_system_prompt()
    user_prompt = _build_user_prompt(evidence, raw_hcl, previous_failure, attempt_number)

    response_text = _call_groq(system_prompt, user_prompt)
    if not response_text:
        return None

    return _parse_llm_response(response_text, evidence, attempt_number)


def _build_system_prompt() -> str:
    """System prompt implementing the hallucination firewall."""
    return """You are the AI Remediation Agent for SecAgent Hub, a Terraform AWS security platform.

CRITICAL RULES:
1. You MUST ONLY reference facts from the provided security evidence. Do NOT invent attack paths, vulnerabilities, or resource relationships that are not explicitly listed.
2. You must output a VALID JSON object matching the exact schema below. No markdown, no extra text before or after the JSON.
3. Your terraform_patch must be COMPLETE, VALID Terraform HCL that can replace the original file.
4. Do not add resources or providers that don't exist in the original file.
5. Fix security issues while preserving all existing functionality.

OUTPUT JSON SCHEMA:
{
  "target_issue": "Brief description of the primary vulnerability being fixed",
  "target_check_ids": ["CKV_AWS_XX", ...],
  "explanation": "Why this issue matters and what an attacker could do",
  "proposed_change": "Human-readable description of changes made",
  "terraform_patch": "The complete patched Terraform HCL code",
  "expected_effect": "What security improvement this fix provides",
  "confidence": 0.85
}

REMEDIATION PRIORITIES:
1. Restrict 0.0.0.0/0 CIDR blocks to specific private ranges (e.g., 10.0.0.0/16)
2. Replace wildcard IAM actions with specific least-privilege actions
3. Remove public-read ACLs and add public access blocks
4. Add server-side encryption (AES256) for S3 buckets
5. Restrict IAM Resource from '*' to specific ARNs where possible

IMPORTANT: Produce the COMPLETE Terraform file content in terraform_patch, not just the changed blocks."""


def _build_user_prompt(
    evidence: SecurityEvidence,
    raw_hcl: str,
    previous_failure: str | None,
    attempt_number: int,
) -> str:
    """Build the user prompt from structured evidence."""
    sections: list[str] = []

    # Header
    sections.append(f"=== SECURITY REMEDIATION REQUEST (Attempt {attempt_number}) ===\n")

    # Previous failure feedback
    if previous_failure:
        sections.append(f"⚠️  PREVIOUS ATTEMPT FAILED: {previous_failure}")
        sections.append("Please address the failure reason in this attempt.\n")

    # Checkov findings
    if evidence.checkov_findings:
        sections.append(f"--- CHECKOV FINDINGS ({evidence.total_findings} total, "
                        f"{evidence.critical_findings} critical, {evidence.high_findings} high) ---")
        for finding in evidence.checkov_findings:
            sections.append(
                f"  [{finding.severity.value}] {finding.check_id}: {finding.check_name}"
                f" (resource: {finding.resource})"
            )
        sections.append("")

    # Attack paths
    if evidence.attack_paths:
        sections.append(f"--- ATTACK PATHS ({evidence.total_attack_paths} total, "
                        f"{evidence.critical_attack_paths} critical) ---")
        for idx, path in enumerate(evidence.attack_paths, 1):
            sections.append(f"  Path {idx} [{path.severity.value}]: {' → '.join(path.path)}")
        sections.append("")

    # IAM risks
    if evidence.iam_risks:
        sections.append(f"--- IAM RISKS ({len(evidence.iam_risks)}) ---")
        for risk in evidence.iam_risks:
            sections.append(f"  [{risk.severity.value}] {risk.risk_type}: {risk.detail}")
        sections.append("")

    # Crown jewels
    if evidence.crown_jewels:
        sections.append("--- SENSITIVE RESOURCES (Crown Jewels) ---")
        for jewel in evidence.crown_jewels:
            sections.append(f"  {jewel.resource_id} ({jewel.resource_type}): {jewel.reason}")
        sections.append("")

    # Blast radius
    sections.append(f"--- BLAST RADIUS SCORE: {evidence.blast_radius_score}/100 ---\n")

    # Original Terraform
    sections.append("--- ORIGINAL TERRAFORM HCL ---")
    sections.append(raw_hcl[:12000])  # Cap to avoid token limits
    sections.append("")

    sections.append("Generate a JSON remediation fixing the most critical issues. "
                    "Output ONLY valid JSON matching the schema from your instructions.")

    return "\n".join(sections)


def _parse_llm_response(
    text: str,
    evidence: SecurityEvidence,
    attempt_number: int,
) -> RemediationCandidate | None:
    """Parse the LLM response into a RemediationCandidate."""
    # Try to extract JSON from the response
    json_obj = _extract_json(text)
    if json_obj:
        try:
            return RemediationCandidate(
                target_issue=json_obj.get("target_issue", "Security remediation"),
                target_check_ids=json_obj.get("target_check_ids", []),
                explanation=json_obj.get("explanation", ""),
                proposed_change=json_obj.get("proposed_change", ""),
                terraform_patch=json_obj.get("terraform_patch", ""),
                expected_effect=json_obj.get("expected_effect", ""),
                confidence=float(json_obj.get("confidence", 0.7)),
                attempt_number=attempt_number,
                generation_method="llm",
            )
        except Exception:
            pass

    # Fallback: try to extract HCL from code fences
    hcl_block = _extract_hcl_block(text)
    if hcl_block:
        return RemediationCandidate(
            target_issue="Security remediation (extracted from LLM free-form response)",
            target_check_ids=[f.check_id for f in evidence.checkov_findings[:5]],
            explanation=text[:500],
            proposed_change="AI-generated Terraform patch",
            terraform_patch=hcl_block,
            expected_effect="Addresses identified security findings",
            confidence=0.5,
            attempt_number=attempt_number,
            generation_method="llm",
        )

    return None


def _extract_json(text: str) -> dict[str, Any] | None:
    """Extract a JSON object from LLM response text."""
    # Try the whole text first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try to find JSON in code fences
    patterns = [
        r"```json\s*\n(.*?)\n\s*```",
        r"```\s*\n(.*?)\n\s*```",
        r"\{[^{}]*\"target_issue\"[^{}]*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                candidate = match.group(1) if match.lastindex else match.group(0)
                return json.loads(candidate)
            except (json.JSONDecodeError, IndexError):
                continue

    # Try to find the outermost { ... } block
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace:last_brace + 1])
        except json.JSONDecodeError:
            pass

    return None


def _extract_hcl_block(text: str) -> str | None:
    """Extract an HCL code block from LLM response text."""
    patterns = [
        r"```(?:hcl|terraform)\s*\n(.*?)\n\s*```",
        r"```\s*\n(.*?)\n\s*```",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            block = match.group(1).strip()
            if "resource" in block or "provider" in block:
                return block
    return None


# ---------------------------------------------------------------------------
# Deterministic fallback
# ---------------------------------------------------------------------------

def _deterministic_patch(
    evidence: SecurityEvidence,
    raw_hcl: str,
    attempt_number: int,
) -> RemediationCandidate:
    """Generate a rule-based remediation patch without LLM.

    Applied transformations:
    1. Replace 0.0.0.0/0 → 10.0.0.0/16 (restrict public ingress)
    2. Replace wildcard IAM actions → specific least-privilege actions
    3. Replace public-read ACL → private
    4. Add S3 encryption configuration
    """
    patched = raw_hcl
    changes: list[str] = []
    target_check_ids: list[str] = []

    # 1. Restrict public CIDR
    if "0.0.0.0/0" in patched:
        patched = patched.replace("0.0.0.0/0", "10.0.0.0/16")
        changes.append("Restricted public CIDR 0.0.0.0/0 to private range 10.0.0.0/16")
        target_check_ids.append("CKV_AWS_24")

    # 2. Fix wildcard IAM actions
    if '"Action": "*"' in patched:
        patched = patched.replace('"Action": "*"', '"Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]')
        changes.append("Replaced wildcard IAM Action '*' with specific S3 least-privilege actions")
        target_check_ids.append("CKV_AWS_41")

    # 3. Fix wildcard IAM resources
    if '"Resource": "*"' in patched:
        patched = patched.replace('"Resource": "*"', '"Resource": "arn:aws:s3:::secagent-*"')
        changes.append("Restricted IAM Resource from '*' to specific S3 ARN pattern")

    # 4. Fix public-read ACL
    if 'acl    = "public-read"' in patched:
        patched = patched.replace('acl    = "public-read"', 'acl    = "private"')
        changes.append("Changed S3 bucket ACL from public-read to private")
        target_check_ids.append("CKV_AWS_20")
    elif 'acl = "public-read"' in patched:
        patched = patched.replace('acl = "public-read"', 'acl = "private"')
        changes.append("Changed S3 bucket ACL from public-read to private")
        target_check_ids.append("CKV_AWS_20")

    # 5. Add S3 encryption if missing and S3 buckets exist
    if "aws_s3_bucket" in patched and "server_side_encryption" not in patched:
        # Find S3 bucket names for encryption resource injection
        bucket_names = re.findall(r'resource\s+"aws_s3_bucket"\s+"(\w+)"', patched)
        for bucket_name in bucket_names:
            encryption_block = f"""
resource "aws_s3_bucket_server_side_encryption_configuration" "{bucket_name}_encryption" {{
  bucket = aws_s3_bucket.{bucket_name}.id

  rule {{
    apply_server_side_encryption_by_default {{
      sse_algorithm = "AES256"
    }}
  }}
}}
"""
            patched += encryption_block
            changes.append(f"Added AES256 server-side encryption for S3 bucket '{bucket_name}'")
            target_check_ids.append("CKV_AWS_19")

    if not changes:
        changes.append("No deterministic fixes applicable — original HCL returned unchanged")

    return RemediationCandidate(
        target_issue="Multiple security misconfigurations detected by Checkov and attack path analysis",
        target_check_ids=target_check_ids,
        explanation=(
            f"The infrastructure has {evidence.total_findings} security findings "
            f"({evidence.critical_findings} critical, {evidence.high_findings} high) "
            f"and {evidence.total_attack_paths} attack paths with a blast radius score "
            f"of {evidence.blast_radius_score}/100."
        ),
        proposed_change="; ".join(changes),
        terraform_patch=patched,
        expected_effect=(
            "Restricts public network exposure, enforces least-privilege IAM policies, "
            "secures S3 storage with private ACLs and encryption."
        ),
        confidence=0.9,
        attempt_number=attempt_number,
        generation_method="deterministic",
    )


# ---------------------------------------------------------------------------
# Groq API client
# ---------------------------------------------------------------------------

def _call_groq(system_prompt: str, user_prompt: str) -> str | None:
    """Call the Groq API and return the response text."""
    settings = get_settings()
    if not settings.groq_api_key:
        return None

    try:
        payload = json.dumps({
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.15,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"},
        }).encode("utf-8")

        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
                "User-Agent": "SecAgentHub/2.0-ai-proof-of-fix",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            completion = json.loads(response.read().decode("utf-8"))

        return completion["choices"][0]["message"]["content"] or None
    except (urllib.error.HTTPError, urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError):
        return None
