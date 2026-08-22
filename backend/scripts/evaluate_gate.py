#!/usr/bin/env python3
"""
SecAgent Security Gate Evaluator for CI/CD.

Can be run:
1. Locally against Checkov JSON output or direct Terraform files
2. Remotely against a SecAgent Hub backend API (via SECAGENT_API_URL)
3. In baseline vs PR comparison mode
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

# Ensure backend root is on sys.path for local imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Ensure stdout and stderr handle utf-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")



def evaluate_via_api(
    api_url: str,
    terraform_content: str,
    base_terraform_content: str | None = None,
    repo: str = "demo/infrastructure",
    branch: str = "main",
    base_branch: str = "main",
    pr_number: int | None = None,
    commit_sha: str | None = None,
    api_key: str | None = None,
) -> int:
    """Send PR Terraform content to SecAgent Hub backend API."""
    import urllib.request
    import urllib.error

    endpoint = f"{api_url.rstrip('/')}/api/v1/cicd/security-gate"
    payload = {
        "repository": repo,
        "branch": branch,
        "base_branch": base_branch,
        "pr_number": pr_number,
        "commit_sha": commit_sha,
        "terraform_content": terraform_content,
        "base_terraform_content": base_terraform_content,
        "filename": "main.tf",
    }

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return _format_and_output_gate_result(data, api_url)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"❌ SecAgent API error (HTTP {e.code}): {err_msg}", file=sys.stderr)
        _write_github_summary("❌ **SECAGENT SECURITY GATE FAILED**", f"Backend error: HTTP {e.code} - {err_msg}")
        return 1
    except Exception as exc:
        print(f"❌ FAIL SAFE: Could not reach SecAgent backend at {endpoint}: {exc}", file=sys.stderr)
        _write_github_summary("❌ **SECAGENT SECURITY GATE UNAVAILABLE**", f"Could not reach security gate backend at {endpoint}. Failing safely to prevent uninspected merge.")
        return 1


def evaluate_locally(
    hcl_content: str,
    base_hcl_content: str | None = None,
    filename: str = "main.tf",
) -> int:
    """Evaluate security gate locally using the embedded attack engine."""
    from app.services.parser_service import parse_terraform
    from app.services.scanner_service import run_checkov, summarize_findings
    from app.services.graph_service import build_attack_graph

    parsed = parse_terraform(hcl_content)
    findings = run_checkov(hcl_content, filename)
    graph = build_attack_graph(parsed, findings)

    sec_gate = graph.get("security_gate", {})
    verdict = sec_gate.get("verdict", "PASS")
    reasons = sec_gate.get("reasons", [])

    base_comparison = None
    if base_hcl_content and base_hcl_content.strip():
        try:
            base_parsed = parse_terraform(base_hcl_content)
            base_findings = run_checkov(base_hcl_content, filename)
            base_graph = build_attack_graph(base_parsed, base_findings)

            base_risk = base_graph.get("blast_radius_score", 0)
            pr_risk = graph.get("blast_radius_score", 0)

            base_paths = len(base_graph.get("critical_attack_paths", []))
            pr_paths = len(graph.get("critical_attack_paths", []))

            base_comparison = {
                "before_risk": base_risk,
                "after_risk": pr_risk,
                "risk_delta": pr_risk - base_risk,
                "before_attack_paths": base_paths,
                "after_attack_paths": pr_paths,
                "new_attack_paths": max(0, pr_paths - base_paths),
            }
            if base_comparison["new_attack_paths"] > 0 and verdict == "PASS":
                verdict = "BLOCK"
                reasons.append(f"{base_comparison['new_attack_paths']} new critical attack path(s) introduced")
        except Exception as e:
            pass

    status = "BLOCKED" if verdict == "BLOCK" else "PASSED"
    failed_checks = findings.get("results", {}).get("failed_checks", [])
    critical_findings = sum(1 for f in failed_checks if str(f.get("severity", "")).upper() == "CRITICAL")
    high_findings = sum(1 for f in failed_checks if str(f.get("severity", "")).upper() == "HIGH")

    result = {
        "status": status,
        "verdict": verdict,
        "risk_score": graph.get("blast_radius_score", 0),
        "critical_findings": critical_findings,
        "high_findings": high_findings,
        "critical_attack_paths": len(graph.get("critical_attack_paths", [])),
        "attack_paths": graph.get("attack_paths", []),
        "reasons": reasons,
        "base_comparison": base_comparison,
    }

    return _format_and_output_gate_result(result)


def _format_and_output_gate_result(data: dict[str, Any], api_url: str | None = None) -> int:
    verdict = data.get("verdict", "PASS")
    status = data.get("status", "PASSED" if verdict == "PASS" else "BLOCKED")
    risk_score = data.get("risk_score", 0)
    critical_findings = data.get("critical_findings", 0)
    critical_attack_paths = data.get("critical_attack_paths", 0)
    reasons = data.get("reasons", [])
    scan_id = data.get("scan_id")
    base_comp = data.get("base_comparison")

    is_blocked = verdict == "BLOCK" or status == "BLOCKED"
    emoji = "❌" if is_blocked else "✅"

    lines = [
        "",
        "========================================",
        f"  SECAGENT SECURITY GATE: {emoji} {status}",
        "========================================",
        f"  Blast Radius Risk:      {risk_score}/100",
        f"  Critical findings:      {critical_findings}",
        f"  Critical attack paths:  {critical_attack_paths}",
    ]

    if base_comp:
        lines += [
            "----------------------------------------",
            "  BASELINE VS PR COMPARISON:",
            f"  Before Risk:            {base_comp.get('before_risk', 0)}/100 -> After: {base_comp.get('after_risk', 0)}/100",
            f"  New Attack Paths:       +{base_comp.get('new_attack_paths', 0)}",
        ]

    lines += [
        "----------------------------------------",
        f"  FINAL VERDICT:          {verdict}",
    ]

    if reasons:
        lines.append("")
        lines.append("  Blocking Reasons:")
        for r in reasons:
            lines.append(f"    • {r}")

    if scan_id and api_url:
        dashboard_url = f"{api_url.rstrip('/')}/scan/{scan_id}/ci"
        lines += [
            "",
            f"  View in SecAgent Hub:   {dashboard_url}",
        ]

    lines += ["========================================", ""]
    output = "\n".join(lines)
    print(output)

    # Output to GitHub Action Step Summary if running in CI
    summary_md = _generate_github_summary_markdown(data, api_url)
    _write_github_summary(f"{emoji} SecAgent Security Gate: {status}", summary_md)

    exit_code = 1 if is_blocked else 0
    for out_dir in [Path("/tmp"), Path(os.environ.get("RUNNER_TEMP", "")), Path(os.environ.get("TEMP", ""))]:
        try:
            if out_dir and (out_dir.exists() or out_dir == Path("/tmp")):
                out_dir.mkdir(parents=True, exist_ok=True)
                (out_dir / "gate_exit_code.txt").write_text(str(exit_code), encoding="utf-8")
                (out_dir / "gate_result.txt").write_text(output, encoding="utf-8")
        except Exception:
            pass
    return exit_code



def _generate_github_summary_markdown(data: dict[str, Any], api_url: str | None = None) -> str:
    verdict = data.get("verdict", "PASS")
    status = data.get("status", "PASSED" if verdict == "PASS" else "BLOCKED")
    risk_score = data.get("risk_score", 0)
    critical_findings = data.get("critical_findings", 0)
    critical_attack_paths = data.get("critical_attack_paths", 0)
    reasons = data.get("reasons", [])
    scan_id = data.get("scan_id")
    base_comp = data.get("base_comparison")
    attack_paths = data.get("attack_paths", [])

    is_blocked = verdict == "BLOCK" or status == "BLOCKED"
    emoji = "❌" if is_blocked else "✅"

    md = [
        f"## {emoji} SecAgent Security Gate: **{status}**\n",
        "| Metric | Value | Status |",
        "| :--- | :--- | :--- |",
        f"| **Blast Radius Risk** | `{risk_score}/100` | {'🔴 Critical' if risk_score >= 70 else '🟢 Low'} |",
        f"| **Critical Findings** | `{critical_findings}` | {'🔴 Failing' if critical_findings > 0 else '🟢 Passing'} |",
        f"| **Critical Attack Paths** | `{critical_attack_paths}` | {'🔴 Reachable Chains' if critical_attack_paths > 0 else '🟢 None'} |",
        "",
    ]

    if base_comp:
        md += [
            "### 📊 Baseline (main) vs PR Changes Comparison\n",
            f"- **Risk Delta:** `{base_comp.get('before_risk', 0)}` → `{base_comp.get('after_risk', 0)}` ({'+' if base_comp.get('risk_delta', 0) > 0 else ''}{base_comp.get('risk_delta', 0)})",
            f"- **Attack Paths Delta:** `{base_comp.get('before_attack_paths', 0)}` → `{base_comp.get('after_attack_paths', 0)}` (+`{base_comp.get('new_attack_paths', 0)}` new)",
            "",
        ]

    if reasons:
        md += [
            "### 🛑 Blocking Reasons\n",
        ]
        for r in reasons:
            md.append(f"- ⚠️ **{r}**")
        md.append("")

    if attack_paths:
        md += [
            "### 🕵️ Adversarial Attack Paths Identified\n",
        ]
        for idx, p in enumerate(attack_paths[:3]):
            steps_str = " ➔ ".join([f"`{s}`" for s in p.get("steps", [])])
            md.append(f"**Path #{idx + 1}** (Severity: `{p.get('severity', 'CRITICAL')}`, Score: `{p.get('score', 0)}`):")
            md.append(f"> {steps_str}\n")

    if scan_id and api_url:
        dashboard_url = f"{api_url.rstrip('/')}/scan/{scan_id}/ci"
        twin_url = f"{api_url.rstrip('/')}/scan/{scan_id}/twin"
        md += [
            "### 🔗 SecAgent Hub Actions\n",
            f"- 🛡️ [View Full PR Security Gate]({dashboard_url})",
            f"- 🧬 [Inspect in Security Digital Twin & AI Proof-of-Fix]({twin_url})",
        ]

    return "\n".join(md)


def _write_github_summary(title: str, body: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        try:
            with open(summary_path, "a", encoding="utf-8") as f:
                f.write(f"\n{body}\n")
        except Exception:
            pass


if __name__ == "__main__":
    # Check if SECAGENT_API_URL is configured
    api_url = os.environ.get("SECAGENT_API_URL")
    api_key = os.environ.get("SECAGENT_API_KEY")

    # Command line argument for file / folder
    target_path = sys.argv[1] if len(sys.argv) > 1 else "main.tf"
    base_path = sys.argv[2] if len(sys.argv) > 2 else None

    # Load target terraform content
    p = Path(target_path)
    if p.is_dir():
        tf_files = list(p.glob("**/*.tf"))
        content = "\n\n".join([f.read_text(encoding="utf-8") for f in tf_files])
    elif p.is_file():
        content = p.read_text(encoding="utf-8")
    else:
        # Fallback to stdin or search for any .tf files in current working dir
        tf_files = list(Path(".").glob("**/*.tf"))
        if tf_files:
            content = "\n\n".join([f.read_text(encoding="utf-8") for f in tf_files if ".terraform" not in str(f)])
        else:
            content = ""

    # Load base terraform content if provided
    base_content = None
    if base_path:
        bp = Path(base_path)
        if bp.is_dir():
            base_tf_files = list(bp.glob("**/*.tf"))
            base_content = "\n\n".join([f.read_text(encoding="utf-8") for f in base_tf_files])
        elif bp.is_file():
            base_content = bp.read_text(encoding="utf-8")

    # PR metadata from environment if running inside GitHub Actions
    repo = os.environ.get("GITHUB_REPOSITORY", "demo/infrastructure")
    branch = os.environ.get("GITHUB_HEAD_REF", os.environ.get("GITHUB_REF_NAME", "feature/insecure-change"))
    base_branch = os.environ.get("GITHUB_BASE_REF", "main")
    commit_sha = os.environ.get("GITHUB_SHA")
    pr_num_str = os.environ.get("GITHUB_EVENT_PULL_REQUEST_NUMBER") or os.environ.get("PR_NUMBER")
    pr_number = int(pr_num_str) if pr_num_str and pr_num_str.isdigit() else None

    if api_url:
        print(f"📡 Evaluating via SecAgent Hub API: {api_url}")
        exit_code = evaluate_via_api(
            api_url=api_url,
            terraform_content=content,
            base_terraform_content=base_content,
            repo=repo,
            branch=branch,
            base_branch=base_branch,
            pr_number=pr_number,
            commit_sha=commit_sha,
            api_key=api_key,
        )
    else:
        print("💻 Evaluating via local SecAgent Engine")
        exit_code = evaluate_locally(
            hcl_content=content,
            base_hcl_content=base_content,
            filename=str(p.name if p.is_file() else "main.tf"),
        )

    sys.exit(exit_code)
