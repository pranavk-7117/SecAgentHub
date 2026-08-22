import pytest
from pathlib import Path
from app.services.attack_engine import SecurityDigitalTwin
from app.services.parser_service import parse_terraform

def load_tf(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")

def test_a_safe():
    hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_a_safe" / "main.tf")
    parsed = parse_terraform(hcl)
    findings = {"results": {"failed_checks": [], "passed_checks": []}}
    twin = SecurityDigitalTwin(parsed, findings)
    twin.build_twin()
    paths = twin.compute_attack_paths()
    gate = twin.evaluate_gate(findings)
    assert gate["verdict"] == "PASS"
    assert len(paths) == 0

def test_b_public_resource():
    hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_b_public_resource" / "main.tf")
    parsed = parse_terraform(hcl)
    findings = {"results": {"failed_checks": [{"check_id": "CKV_AWS_20", "severity": "HIGH", "check_name": "Ensure S3 bucket is not public"}]}}
    twin = SecurityDigitalTwin(parsed, findings)
    twin.build_twin()
    paths = twin.compute_attack_paths()
    gate = twin.evaluate_gate(findings)
    assert gate["verdict"] == "BLOCK"

def test_c_wildcard_iam():
    hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_c_wildcard_iam" / "main.tf")
    parsed = parse_terraform(hcl)
    findings = {"results": {"failed_checks": [{"check_id": "CKV_AWS_41", "severity": "CRITICAL", "check_name": "Ensure no hardcoded wildcard IAM action"}]}}
    twin = SecurityDigitalTwin(parsed, findings)
    twin.build_twin()
    paths = twin.compute_attack_paths()
    gate = twin.evaluate_gate(findings)
    assert gate["verdict"] == "BLOCK"

def test_d_attack_path():
    hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_d_attack_path" / "main.tf")
    parsed = parse_terraform(hcl)
    findings = {"results": {"failed_checks": [{"check_id": "CKV_AWS_24", "severity": "HIGH", "check_name": "Open SG 22"}, {"check_id": "CKV_AWS_41", "severity": "CRITICAL", "check_name": "Wildcard IAM"}]}}
    twin = SecurityDigitalTwin(parsed, findings)
    twin.build_twin()
    paths = twin.compute_attack_paths()
    gate = twin.evaluate_gate(findings)
    
    assert gate["verdict"] == "BLOCK"
    assert "aws_db_instance.prod_db" in twin.build_twin()["crown_jewels"]
    
    critical_paths = [p for p in paths if p["severity"] == "CRITICAL"]
    assert len(critical_paths) > 0
    
    steps = critical_paths[0]["steps"]
    assert steps[0] == "internet"
    assert "aws_instance.app_server" in steps
    assert "aws_db_instance.prod_db" in steps

    edges = critical_paths[0]["edges"]
    for edge in edges:
        assert len(edge["evidence"]) > 0

def test_e_secure_modification():
    hcl = load_tf(Path(__file__).parent.parent.parent / "tests" / "terraform" / "test_e_secure_modification" / "main.tf")
    parsed = parse_terraform(hcl)
    findings = {"results": {"failed_checks": [], "passed_checks": []}}
    twin = SecurityDigitalTwin(parsed, findings)
    twin.build_twin()
    paths = twin.compute_attack_paths()
    gate = twin.evaluate_gate(findings)
    
    critical_paths = [p for p in paths if p["severity"] == "CRITICAL"]
    assert len(critical_paths) == 0
    assert gate["verdict"] == "PASS"
