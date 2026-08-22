import urllib.request
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

API_URL = "https://secagent-hub-api-production-39fc.up.railway.app"

def test_live_railway():
    print(f"📡 Testing Railway API at {API_URL}...")
    
    # 1. Health
    with urllib.request.urlopen(f"{API_URL}/health", context=ctx) as resp:

        health_data = json.loads(resp.read().decode())
        print("✅ Health:", health_data)

    # 2. CI/CD Security Gate with vulnerable test file
    vuln_tf = Path("tests/terraform/test_d_attack_path/main.tf").read_text(encoding="utf-8")
    payload = {
        "repository": "pranavk-7117/secagent-cicd-demo",
        "branch": "feature/insecure-change",
        "base_branch": "main",
        "pr_number": 1,
        "commit_sha": "7cc31ff",
        "terraform_content": vuln_tf,
        "filename": "main.tf",
    }
    
    req = urllib.request.Request(
        f"{API_URL}/api/v1/cicd/security-gate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    with urllib.request.urlopen(req, context=ctx) as resp:

        gate_data = json.loads(resp.read().decode())
        print("\n✅ Live Security Gate Result:")
        print("  Verdict:", gate_data.get("verdict"))
        print("  Status:", gate_data.get("status"))
        print("  Scan ID:", gate_data.get("scan_id"))
        print("  Risk Score:", gate_data.get("risk_score"))
        print("  Critical Findings:", gate_data.get("critical_findings"))
        print("  Critical Attack Paths:", gate_data.get("critical_attack_paths"))
        print("  Reasons:", gate_data.get("reasons"))

if __name__ == "__main__":
    test_live_railway()
