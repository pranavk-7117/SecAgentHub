from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


def run_checkov(raw_hcl: str, filename: str = "main.tf") -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as temp_dir:
        tf_path = Path(temp_dir) / filename
        tf_path.write_text(raw_hcl, encoding="utf-8")
        try:
            completed = subprocess.run(
                [sys.executable, "-m", "checkov.main", "-f", str(tf_path), "-o", "json", "--quiet"],
                check=False,
                capture_output=True,
                text=True,
                timeout=45,
            )
            payload = completed.stdout.strip() or completed.stderr.strip()
            return _normalize_checkov_json(json.loads(payload))
        except Exception as exc:
            return _fallback_findings(raw_hcl, str(exc))


def summarize_findings(checkov_json: dict[str, Any]) -> dict[str, Any]:
    failed = _failed_checks(checkov_json)
    by_severity: dict[str, int] = {}
    for finding in failed:
        severity = (finding.get("severity") or _infer_severity(finding)).upper()
        by_severity[severity] = by_severity.get(severity, 0) + 1
    return {"failed_count": len(failed), "by_severity": by_severity, "passed_count": len(_passed_checks(checkov_json))}


def _normalize_checkov_json(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        results = payload.get("results")
        if isinstance(results, dict):
            results["failed_checks"] = _enrich_findings(results.get("failed_checks") or [])
        return payload
    if isinstance(payload, list):
        failed: list[dict[str, Any]] = []
        passed: list[dict[str, Any]] = []
        summaries: list[dict[str, Any]] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            results = item.get("results") or {}
            if isinstance(results, dict):
                failed.extend(results.get("failed_checks") or [])
                passed.extend(results.get("passed_checks") or [])
            if item.get("summary"):
                summaries.append(item["summary"])
        return {"scanner": "checkov", "summary": summaries, "results": {"failed_checks": _enrich_findings(failed), "passed_checks": passed}}
    return {"scanner": "checkov", "results": {"failed_checks": [], "passed_checks": []}, "raw": str(payload)}


def _enrich_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for finding in findings:
        if not finding.get("severity"):
            finding["severity"] = _infer_severity(finding)
        finding["category"] = _infer_category(finding)
    return findings


def _infer_severity(finding: dict[str, Any]) -> str:
    check_id = str(finding.get("check_id", ""))
    text = f"{check_id} {finding.get('check_name', '')}".lower()
    critical = ("0.0.0.0:0 to port 22", "public read access", "public access", "admin", "wildcard")
    high = ("0.0.0.0:0 to port 80", "public ip", "unencrypted", "kms", "password", "secret", "acl")
    medium = ("monitoring", "logging", "versioning", "backup", "description", "replication")
    if any(term in text for term in critical):
        return "CRITICAL"
    if any(term in text for term in high) or check_id in {"CKV_AWS_24", "CKV_AWS_20", "CKV_AWS_88"}:
        return "HIGH"
    if any(term in text for term in medium):
        return "MEDIUM"
    return "LOW"


def _infer_category(finding: dict[str, Any]) -> str:
    text = f"{finding.get('check_id', '')} {finding.get('check_name', '')} {finding.get('resource', '')}".lower()
    if "iam" in text or "policy" in text or "role" in text:
        return "IAM"
    if "security group" in text or "ingress" in text or "public ip" in text:
        return "Network"
    if "s3" in text or "bucket" in text:
        return "Storage"
    if "monitoring" in text or "logging" in text:
        return "Observability"
    return "General"


def _failed_checks(checkov_json: dict[str, Any]) -> list[dict[str, Any]]:
    results = checkov_json.get("results", checkov_json)
    if isinstance(results, dict):
        return results.get("failed_checks", []) or []
    return []


def _passed_checks(checkov_json: dict[str, Any]) -> list[dict[str, Any]]:
    results = checkov_json.get("results", checkov_json)
    if isinstance(results, dict):
        return results.get("passed_checks", []) or []
    return []


def _fallback_findings(raw_hcl: str, reason: str) -> dict[str, Any]:
    failed: list[dict[str, Any]] = []
    checks = [
        ("CKV_AWS_24", "Ensure no security groups allow ingress from 0.0.0.0/0 to port 22", "cidr_blocks", "HIGH"),
        ("CKV_AWS_20", "Ensure S3 bucket is not public", "acl    = \"public-read\"", "HIGH"),
        ("CKV_AWS_41", "Ensure no hard-coded wildcard IAM action", '"Action": "*"', "CRITICAL"),
        ("CKV_AWS_19", "Ensure S3 buckets have server-side encryption", "aws_s3_bucket", "MEDIUM"),
    ]
    for check_id, name, needle, severity in checks:
        if needle in raw_hcl:
            failed.append(
                {
                    "check_id": check_id,
                    "check_name": name,
                    "severity": severity,
                    "resource": "terraform.local",
                    "file_path": "uploaded.tf",
                    "guideline": "Generated by local fallback scanner because Checkov is unavailable.",
                }
            )
    return {"scanner": "fallback", "scanner_error": reason, "results": {"failed_checks": failed, "passed_checks": []}}
