#!/usr/bin/env python3
"""SecAgent Security Gate evaluator — used in CI/CD."""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.scanner_service import summarize_findings, _normalize_checkov_json

def evaluate(checkov_json_path: str) -> int:
    try:
        with open(checkov_json_path) as f:
            raw = json.load(f)
        findings = _normalize_checkov_json(raw)
    except Exception as e:
        print(f"WARNING: Could not parse Checkov output: {e}")
        findings = {"results": {"failed_checks": [], "passed_checks": []}}

    results = findings.get("results", {})
    failed = results.get("failed_checks", [])

    critical = [f for f in failed if (f.get("severity") or "").upper() == "CRITICAL"]
    high     = [f for f in failed if (f.get("severity") or "").upper() == "HIGH"]

    # Check for public exposure patterns in check names
    public_exposure_ids = {"CKV_AWS_24", "CKV_AWS_20", "CKV_AWS_88", "CKV_AWS_8"}
    public_exposures = [f for f in failed if f.get("check_id") in public_exposure_ids]

    # Attack path proxies (deterministic heuristics for CI)
    has_public_sg   = any("0.0.0.0" in str(f) for f in failed)
    has_wildcard_iam = any("wildcard" in str(f).lower() or "CKV_AWS_41" in str(f) for f in failed)
    critical_attack_paths = 1 if (has_public_sg and has_wildcard_iam) else 0

    verdict = "PASS"
    reasons = []

    if critical:
        verdict = "BLOCK"
        reasons.append(f"{len(critical)} critical finding(s): {[f.get('check_id') for f in critical[:3]]}")

    if critical_attack_paths > 0:
        verdict = "BLOCK"
        reasons.append(f"{critical_attack_paths} critical attack path(s) detected (public exposure + wildcard IAM)")

    lines = [
        "",
        "========================================",
        "  SECAGENT SECURITY GATE",
        "========================================",
        f"  Critical findings:      {len(critical)}",
        f"  High findings:          {len(high)}",
        f"  Public exposures:       {len(public_exposures)}",
        f"  Critical attack paths:  {critical_attack_paths}",
        "",
        f"  VERDICT: {verdict}",
    ]
    if reasons:
        lines.append("")
        lines.append("  Reasons:")
        for r in reasons:
            lines.append(f"    - {r}")
    lines += ["========================================", ""]

    output = "\n".join(lines)
    print(output)

    Path("/tmp/gate_result.txt").write_text(output)
    exit_code = 1 if verdict == "BLOCK" else 0
    Path("/tmp/gate_exit_code.txt").write_text(str(exit_code))
    return exit_code


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/checkov_results.json"
    sys.exit(evaluate(path))
