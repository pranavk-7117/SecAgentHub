import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def load_tf(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")

def test_cicd_endpoint_safe_pass():
    safe_hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_a_safe" / "main.tf")
    payload = {
        "repository": "acme/cloud-infra",
        "branch": "feature/hardened-vpc",
        "base_branch": "main",
        "pr_number": 12,
        "commit_sha": "abc1234",
        "terraform_content": safe_hcl,
        "filename": "main.tf",
    }
    response = client.post("/api/v1/cicd/security-gate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "PASS"
    assert data["status"] == "PASSED"
    assert data["critical_attack_paths"] == 0
    assert "scan_id" in data


def test_cicd_endpoint_vulnerable_block():
    vuln_hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_d_attack_path" / "main.tf")
    payload = {
        "repository": "acme/cloud-infra",
        "branch": "feature/insecure-change",
        "base_branch": "main",
        "pr_number": 42,
        "commit_sha": "deadbeef",
        "terraform_content": vuln_hcl,
        "filename": "main.tf",
    }
    response = client.post("/api/v1/cicd/security-gate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "BLOCK"
    assert data["status"] == "BLOCKED"
    assert data["critical_attack_paths"] > 0
    assert len(data["reasons"]) > 0
    assert len(data["attack_paths"]) > 0


def test_cicd_endpoint_base_vs_pr_comparison():
    safe_hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_a_safe" / "main.tf")
    vuln_hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_d_attack_path" / "main.tf")
    
    payload = {
        "repository": "acme/cloud-infra",
        "branch": "feature/insecure-change",
        "base_branch": "main",
        "pr_number": 99,
        "commit_sha": "feedcafe",
        "terraform_content": vuln_hcl,
        "base_terraform_content": safe_hcl,
        "filename": "main.tf",
    }
    response = client.post("/api/v1/cicd/security-gate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "BLOCK"
    assert data["base_comparison"] is not None
    assert data["base_comparison"]["after_risk"] >= data["base_comparison"]["before_risk"]
    assert data["base_comparison"]["new_attack_paths"] > 0
