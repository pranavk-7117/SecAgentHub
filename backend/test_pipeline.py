import json
from pathlib import Path
from app.services.parser_service import parse_terraform
from app.services.scanner_service import run_checkov
from app.services.graph_service import build_attack_graph
from app.models import ScanRecord
from app.services.remediation_orchestrator import run_remediation_loop

raw_hcl = Path("../examples/insecure-main.tf").read_text()
parsed = parse_terraform(raw_hcl)
findings = run_checkov(raw_hcl, "insecure-main.tf")
graph = build_attack_graph(parsed, findings)

scan = ScanRecord(
    filename="insecure-main.tf",
    raw_hcl=raw_hcl,
    parsed=parsed,
    raw_checkov_json=findings,
    graph=graph
)

print("Starting Remediation Loop...")
proof = run_remediation_loop(scan, max_retries=1)

print(f"Status: {proof.status.value}")
print(f"Target Issue: {proof.target_issue}")
print(f"Original Paths: {proof.original_attack_paths}, New Paths: {proof.new_attack_paths}")
print(f"Original Findings: {proof.original_failed_checks}, New Findings: {proof.new_failed_checks}")
print(f"Terraform Valid: {proof.terraform_valid}")
print("===========================")
if proof.remediation:
    print(proof.remediation.terraform_patch)
