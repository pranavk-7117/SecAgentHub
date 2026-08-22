from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from app.core.config import get_settings
from app.models import AgentDefinition


AGENTS = [
    AgentDefinition(id="misconfiguration", name="Misconfiguration Agent", description="Finds open ports, public buckets, and weak storage controls.", price_in_microalgos=250000, icon="ShieldAlert"),
    AgentDefinition(id="iam_risk", name="IAM Risk Agent", description="Detects wildcard privileges and escalation risks.", price_in_microalgos=300000, icon="KeyRound"),
    AgentDefinition(id="compliance", name="Compliance Agent", description="Maps findings to CIS, NIST, and PCI DSS posture.", price_in_microalgos=200000, icon="ClipboardCheck"),
    AgentDefinition(id="attack_path", name="Attack Path Agent", description="Explains reachable paths through the attack graph.", price_in_microalgos=350000, icon="Route"),
    AgentDefinition(id="ai_remediation", name="AI Remediation Agent", description="Generates explanations, fixed HCL, and mitigation steps.", price_in_microalgos=500000, icon="Sparkles"),
]


def get_agent(agent_id: str) -> AgentDefinition | None:
    return next((agent for agent in AGENTS if agent.id == agent_id), None)


def execute_agent(agent_id: str, parsed: dict[str, Any], findings: dict[str, Any], graph: dict[str, Any], raw_hcl: str) -> dict[str, Any]:
    if agent_id == "misconfiguration":
        return _misconfiguration(findings, parsed, raw_hcl)
    if agent_id == "iam_risk":
        return _iam_risk(parsed, raw_hcl)
    if agent_id == "compliance":
        return _compliance(findings)
    if agent_id == "attack_path":
        return _attack_path(graph)
    if agent_id == "ai_remediation":
        return _ai_remediation(raw_hcl, findings)
    raise ValueError(f"Unknown agent: {agent_id}")


def answer_question(question: str, raw_hcl: str, findings: dict[str, Any]) -> str:
    prompt = f"Question: {question}\nTerraform:\n{raw_hcl[:6000]}\nFindings:\n{json.dumps(findings)[:6000]}"
    return _groq_or_fallback(prompt, "Answer as a concise infrastructure security expert.")


def _failed(findings: dict[str, Any]) -> list[dict[str, Any]]:
    return (findings.get("results") or {}).get("failed_checks", [])


def _misconfiguration(findings: dict[str, Any], parsed: dict[str, Any], raw_hcl: str) -> dict[str, Any]:
    keywords = ("public", "0.0.0.0/0", "open", "unencrypted", "encryption", "s3")
    selected = [item for item in _failed(findings) if any(keyword in str(item).lower() for keyword in keywords)]
    exposures = []
    for resource in parsed.get("resources", []):
        body = json.dumps(resource.get("attributes", {})).lower()
        if "0.0.0.0/0" in body:
            exposures.append({"resource": resource["id"], "issue": "Public ingress from 0.0.0.0/0", "severity": "HIGH"})
        if "public-read" in body or "public" in body and "bucket" in resource["type"]:
            exposures.append({"resource": resource["id"], "issue": "Public object storage exposure", "severity": "HIGH"})
        if "aws_s3_bucket" in resource["type"] and "server_side_encryption" not in body:
            exposures.append({"resource": resource["id"], "issue": "S3 bucket lacks explicit server-side encryption", "severity": "MEDIUM"})
    recommendations = [
        "Restrict ingress CIDRs to trusted private ranges or VPN egress IPs.",
        "Block public bucket ACLs and enable S3 public access block.",
        "Add explicit KMS or AES256 server-side encryption for storage resources.",
    ]
    return {
        "agent": "Misconfiguration Agent",
        "summary": f"Found {len(exposures) or len(selected)} concrete network/storage misconfiguration signals.",
        "exposures": exposures,
        "checkov_findings": selected,
        "recommendations": recommendations,
    }


def _iam_risk(parsed: dict[str, Any], raw_hcl: str) -> dict[str, Any]:
    risks = []
    wildcard_action = re_search(r'Action\s*[:=]\s*"?\*"?', raw_hcl) or '"Action": "*"' in raw_hcl or "actions = [\"*\"]" in raw_hcl
    wildcard_resource = re_search(r'Resource\s*[:=]\s*"?\*"?', raw_hcl) or '"Resource": "*"' in raw_hcl
    if wildcard_action:
        risks.append({"type": "wildcard_action", "severity": "CRITICAL", "detail": "IAM policy grants wildcard action access."})
    if wildcard_resource:
        risks.append({"type": "wildcard_resource", "severity": "HIGH", "detail": "IAM policy applies to every resource."})
    if "AdministratorAccess" in raw_hcl:
        risks.append({"type": "administrator_access", "severity": "HIGH", "detail": "Managed administrator policy is attached."})
    for policy in parsed.get("iam_policies", []):
        if "*" in json.dumps(policy):
            risks.append({"type": "policy_wildcard", "severity": "HIGH", "detail": "Inline policy contains wildcard permissions."})
    privilege_escalation = []
    escalation_actions = ("iam:PassRole", "sts:AssumeRole", "iam:AttachRolePolicy", "lambda:UpdateFunctionCode")
    for action in escalation_actions:
        if action.lower() in raw_hcl.lower() or '"Action": "*"' in raw_hcl:
            privilege_escalation.append(action)
    return {
        "agent": "IAM Risk Agent",
        "summary": f"Detected {len(risks)} IAM policy risk groups and {len(privilege_escalation)} privilege-escalation-capable actions.",
        "risks": risks,
        "privilege_escalation_actions": privilege_escalation,
        "least_privilege_plan": [
            "Replace wildcard actions with service-specific read/write actions.",
            "Scope resources to exact ARNs instead of '*' where possible.",
            "Separate deploy-time admin permissions from runtime roles.",
        ],
        "risk_count": len(risks),
    }


def re_search(pattern: str, text: str) -> bool:
    import re

    return re.search(pattern, text, re.IGNORECASE) is not None


def _compliance(findings: dict[str, Any]) -> dict[str, Any]:
    failed = _failed(findings)
    passed = (findings.get("results") or {}).get("passed_checks", [])
    total = max(1, len(failed) + len(passed))
    score = round((len(passed) / total) * 100)
    return {
        "agent": "Compliance Agent",
        "summary": f"Estimated compliance posture is {score}% from {total} evaluated checks.",
        "score": score,
        "frameworks": {
            "CIS Benchmarks": max(0, score - 5),
            "NIST": score,
            "PCI DSS": max(0, score - 10),
        },
        "failed_controls": [
            {
                "check_id": item.get("check_id"),
                "name": item.get("check_name"),
                "mapped_frameworks": _frameworks_for(item),
            }
            for item in failed
        ],
    }


def _attack_path(graph: dict[str, Any]) -> dict[str, Any]:
    paths = graph.get("critical_attack_paths", [])
    steps = []
    for path in paths:
        steps.append(
            {
                "path": path,
                "sequence": [
                    {"step": index + 1, "node": node, "action": "Enter or pivot through exposed dependency" if index else "Start from public internet"}
                    for index, node in enumerate(path)
                ],
                "impact": "Potential lateral movement from public exposure into dependent cloud resources.",
            }
        )
    return {
        "agent": "Attack Path Agent",
        "summary": f"Identified {len(paths)} public-to-resource attack path(s).",
        "paths": steps,
        "highest_risk_nodes": graph.get("highest_risk_nodes", []),
        "blast_radius_score": graph.get("blast_radius_score", 0),
    }


def _ai_remediation(raw_hcl: str, findings: dict[str, Any]) -> dict[str, Any]:
    prompt = (
        "Generate a security remediation response with threat explanation, corrected Terraform HCL, "
        f"and mitigation steps.\nTerraform:\n{raw_hcl[:8000]}\nFindings:\n{json.dumps(findings)[:8000]}"
    )
    text = _groq_or_fallback(prompt, "You are the AI Remediation Agent for Terraform AWS security.")
    return {
        "agent": "AI Remediation Agent",
        "summary": "Generated threat explanation, corrected Terraform, and mitigation steps.",
        "explanation": text,
        "corrected_hcl": _fallback_hcl(raw_hcl),
        "steps": ["Review exposed resources.", "Apply least privilege.", "Run terraform plan and Checkov again."],
    }


def _frameworks_for(finding: dict[str, Any]) -> list[str]:
    text = f"{finding.get('check_id', '')} {finding.get('check_name', '')}".lower()
    frameworks = ["NIST"]
    if "s3" in text or "security group" in text or "iam" in text:
        frameworks.append("CIS Benchmarks")
    if "public" in text or "encryption" in text:
        frameworks.append("PCI DSS")
    return frameworks


def _groq_or_fallback(prompt: str, system: str) -> str:
    settings = get_settings()
    if settings.groq_api_key:
        try:
            payload = json.dumps(
                {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                    "temperature": 0.2,
                }
            ).encode("utf-8")
            request = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=payload,
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "SecAgentHub/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=45) as response:
                completion = json.loads(response.read().decode("utf-8"))
            return completion["choices"][0]["message"]["content"] or ""
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:500]
            return f"Groq request failed, using local guidance. HTTP {exc.code}: {body}"
        except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError) as exc:
            return f"Groq request failed, using local guidance. Error: {exc}"
    return "Local guidance: restrict public ingress, remove wildcard IAM permissions, enable encryption, and rerun static analysis before deployment."


def _fallback_hcl(raw_hcl: str) -> str:
    return raw_hcl.replace("0.0.0.0/0", "10.0.0.0/16").replace('"Action": "*"', '"Action": ["s3:GetObject"]')
