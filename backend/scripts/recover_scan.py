from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.models import ScanRecord
from app.repository import repository
from app.services.graph_service import build_attack_graph
from app.services.parser_service import parse_terraform
from app.services.scanner_service import run_checkov, summarize_findings


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: recover_scan.py <scan_id> <terraform_file>")

    scan_id = sys.argv[1]
    tf_path = Path(sys.argv[2])
    if not tf_path.exists():
        raise SystemExit(f"Terraform file not found: {tf_path}")

    raw_hcl = tf_path.read_text(encoding="utf-8")
    parsed = parse_terraform(raw_hcl)
    findings = run_checkov(raw_hcl, tf_path.name)
    graph = build_attack_graph(parsed, findings)
    scan = ScanRecord(
        id=scan_id,
        filename=tf_path.name,
        raw_hcl=raw_hcl,
        parsed=parsed,
        raw_checkov_json=findings,
        graph=graph,
    )
    repository.create_scan(scan)
    summary = summarize_findings(findings)
    print(
        f"Recovered {scan.id}: {summary['failed_count']} findings, "
        f"{len(graph.get('nodes', []))} graph nodes, {len(graph.get('edges', []))} graph edges"
    )


if __name__ == "__main__":
    main()
