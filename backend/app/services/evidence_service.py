"""Evidence Assembler — extracts structured SecurityEvidence from scan data.

This module is the HALLUCINATION FIREWALL BOUNDARY.
The AI only sees SecurityEvidence assembled here — it cannot access raw
scan data or invent facts beyond what this module provides.
"""
from __future__ import annotations

import json
from typing import Any

from app.services.remediation_models import (
    AttackPath,
    AttackPathStep,
    CheckovFinding,
    CrownJewel,
    IAMRisk,
    ResourceRelationship,
    SecurityEvidence,
    Severity,
)


def assemble_evidence(
    parsed: dict[str, Any],
    findings: dict[str, Any],
    graph: dict[str, Any],
    raw_hcl: str,
) -> SecurityEvidence:
    """Build structured SecurityEvidence from raw scan outputs.

    Args:
        parsed: Output from parse_terraform()
        findings: Output from run_checkov()
        graph: Output from build_attack_graph()
        raw_hcl: The original Terraform HCL string

    Returns:
        SecurityEvidence with all facts the AI is allowed to see.
    """
    checkov_findings = _extract_checkov_findings(findings)
    attack_paths = _extract_attack_paths(graph)
    iam_risks = _extract_iam_risks(parsed, raw_hcl)
    crown_jewels = _extract_crown_jewels(parsed)
    relationships = _extract_relationships(graph)

    critical_findings = sum(1 for f in checkov_findings if f.severity == Severity.CRITICAL)
    high_findings = sum(1 for f in checkov_findings if f.severity == Severity.HIGH)
    critical_paths = sum(1 for p in attack_paths if p.severity == Severity.CRITICAL)

    return SecurityEvidence(
        checkov_findings=checkov_findings,
        attack_paths=attack_paths,
        iam_risks=iam_risks,
        crown_jewels=crown_jewels,
        resource_relationships=relationships,
        resource_count=len(parsed.get("resources", [])),
        blast_radius_score=graph.get("blast_radius_score", 0),
        highest_risk_nodes=graph.get("highest_risk_nodes", []),
        total_findings=len(checkov_findings),
        critical_findings=critical_findings,
        high_findings=high_findings,
        total_attack_paths=len(attack_paths),
        critical_attack_paths=critical_paths,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _extract_checkov_findings(findings: dict[str, Any]) -> list[CheckovFinding]:
    """Extract failed Checkov checks into structured findings."""
    failed = (findings.get("results") or {}).get("failed_checks", [])
    result: list[CheckovFinding] = []
    for item in failed:
        severity = _map_severity(item.get("severity") or _infer_severity_from_text(item))
        result.append(
            CheckovFinding(
                check_id=item.get("check_id") or "UNKNOWN",
                check_name=item.get("check_name") or "Unknown check",
                severity=severity,
                resource=str(item.get("resource") or ""),
                category=item.get("category") or "General",
                guideline=item.get("guideline") or "",
            )
        )
    return result


def _extract_attack_paths(graph: dict[str, Any]) -> list[AttackPath]:
    """Extract attack paths from the attack graph."""
    critical_paths = graph.get("critical_attack_paths", [])
    result: list[AttackPath] = []
    for path in critical_paths:
        steps = []
        for idx, node in enumerate(path):
            action = "Start from public internet" if idx == 0 else "Pivot through exposed dependency"
            steps.append(AttackPathStep(node=node, action=action))

        # Paths reaching S3/RDS/secrets are critical, others are high
        severity = Severity.HIGH
        if any("s3" in node.lower() or "rds" in node.lower() or "secret" in node.lower() for node in path):
            severity = Severity.CRITICAL

        result.append(
            AttackPath(
                path=path,
                steps=steps,
                impact="Potential lateral movement from public exposure into dependent cloud resources.",
                severity=severity,
            )
        )
    return result


def _extract_iam_risks(parsed: dict[str, Any], raw_hcl: str) -> list[IAMRisk]:
    """Extract IAM risks from parsed Terraform and raw HCL."""
    risks: list[IAMRisk] = []
    hcl_lower = raw_hcl.lower()

    # Check for wildcard actions
    if '"action": "*"' in hcl_lower or "actions = [\"*\"]" in hcl_lower:
        risks.append(IAMRisk(
            risk_type="wildcard_action",
            severity=Severity.CRITICAL,
            detail="IAM policy grants wildcard action access — allows any AWS API call.",
            resource="aws_iam_policy",
        ))

    # Check for wildcard resources
    if '"resource": "*"' in hcl_lower:
        risks.append(IAMRisk(
            risk_type="wildcard_resource",
            severity=Severity.HIGH,
            detail="IAM policy applies to every AWS resource (Resource: '*').",
            resource="aws_iam_policy",
        ))

    # Check for AdministratorAccess
    if "administratoraccess" in hcl_lower:
        risks.append(IAMRisk(
            risk_type="administrator_access",
            severity=Severity.CRITICAL,
            detail="Managed AdministratorAccess policy is attached — full AWS account control.",
            resource="aws_iam_policy_attachment",
        ))

    # Check IAM policies from parser
    for policy in parsed.get("iam_policies", []):
        policy_str = json.dumps(policy).lower()
        if '"action": "*"' in policy_str or '"action":"*"' in policy_str:
            risks.append(IAMRisk(
                risk_type="inline_policy_wildcard",
                severity=Severity.CRITICAL,
                detail="Inline IAM policy contains wildcard action permissions.",
                resource="inline_policy",
            ))

    # Check for privilege escalation actions
    escalation_actions = ["iam:passrole", "sts:assumerole", "iam:attachrolepolicy", "lambda:updatefunctioncode"]
    found_escalation = [action for action in escalation_actions if action in hcl_lower]
    if found_escalation or '"action": "*"' in hcl_lower:
        risks.append(IAMRisk(
            risk_type="privilege_escalation_risk",
            severity=Severity.HIGH,
            detail=f"Privilege escalation capable actions detected: {', '.join(found_escalation) or 'wildcard includes all'}.",
            resource="aws_iam_policy",
        ))

    return risks


def _extract_crown_jewels(parsed: dict[str, Any]) -> list[CrownJewel]:
    """Identify sensitive target resources (crown jewels)."""
    crown_jewels: list[CrownJewel] = []
    sensitive_types = {
        "aws_s3_bucket": "S3 bucket — potential sensitive data storage",
        "aws_rds_instance": "RDS database — likely contains application data",
        "aws_db_instance": "Database instance — likely contains application data",
        "aws_secretsmanager_secret": "Secrets Manager — stores credentials and API keys",
        "aws_ssm_parameter": "SSM Parameter — may store sensitive configuration",
        "aws_dynamodb_table": "DynamoDB table — application data store",
        "aws_kms_key": "KMS key — encryption key material",
    }
    for resource in parsed.get("resources", []):
        resource_type = resource.get("type", "")
        if resource_type in sensitive_types:
            crown_jewels.append(CrownJewel(
                resource_id=resource["id"],
                resource_type=resource_type,
                reason=sensitive_types[resource_type],
            ))
    return crown_jewels


def _extract_relationships(graph: dict[str, Any]) -> list[ResourceRelationship]:
    """Extract resource relationships from the attack graph edges."""
    relationships: list[ResourceRelationship] = []
    for edge in graph.get("edges", []):
        relationships.append(ResourceRelationship(
            source=edge.get("source", ""),
            target=edge.get("target", ""),
            relationship=edge.get("label", "depends_on"),
            risk_level=edge.get("risk", "medium"),
        ))
    return relationships


def _map_severity(raw: str) -> Severity:
    """Map a severity string to the Severity enum."""
    mapping = {
        "CRITICAL": Severity.CRITICAL,
        "HIGH": Severity.HIGH,
        "MEDIUM": Severity.MEDIUM,
        "LOW": Severity.LOW,
        "INFO": Severity.INFO,
    }
    return mapping.get(raw.upper(), Severity.MEDIUM) if raw else Severity.MEDIUM


def _infer_severity_from_text(finding: dict[str, Any]) -> str:
    """Infer severity from check name when not explicitly provided."""
    text = f"{finding.get('check_id', '')} {finding.get('check_name', '')}".lower()
    if any(term in text for term in ("wildcard", "public access", "0.0.0.0", "admin")):
        return "CRITICAL"
    if any(term in text for term in ("public ip", "unencrypted", "kms", "password", "acl")):
        return "HIGH"
    if any(term in text for term in ("monitoring", "logging", "versioning")):
        return "MEDIUM"
    return "LOW"
