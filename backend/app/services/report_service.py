from __future__ import annotations

import json
from io import BytesIO
from typing import Any


def build_pdf(scan: Any, executions: list[Any]) -> bytes:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        y = 750

        def write_line(text: str, size: int = 9, bold: bool = False) -> None:
            nonlocal y
            if y < 60:
                pdf.showPage()
                y = 750
            pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            pdf.drawString(72, y, str(text)[:120])
            y -= size + 5

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(72, y, "SecAgent Hub Security Report")
        y -= 30
        for line in [
            f"Scan ID: {scan.id}",
            f"Filename: {scan.filename}",
            f"Findings: {len((scan.raw_checkov_json.get('results') or {}).get('failed_checks', []))}",
            f"Blast radius score: {scan.graph.get('blast_radius_score', 0)}",
        ]:
            write_line(line, 10)
        y -= 10
        write_line("Agent Receipts", 12, True)
        for execution in executions:
            write_line(f"{execution.agent_id}: {execution.status} tx={execution.tx_hash}", 9)
        y -= 10
        write_line("Findings", 12, True)
        for finding in (scan.raw_checkov_json.get("results") or {}).get("failed_checks", [])[:18]:
            text = f"{finding.get('check_id')} {finding.get('severity')} {finding.get('check_name')}"
            write_line(text, 8)
        y -= 8
        write_line("Agent Analysis", 12, True)
        for execution in executions:
            output = execution.output_data or {}
            write_line(output.get("agent", execution.agent_id), 11, True)
            write_line(output.get("summary", "No summary returned."), 9)
            for line in _flatten_agent_output(output)[:16]:
                write_line(f"- {line}", 8)
            y -= 6
        pdf.save()
        return buffer.getvalue()
    except Exception:
        payload = {"scan": scan.model_dump(mode="json"), "executions": [row.model_dump(mode="json") for row in executions]}
        return json.dumps(payload, indent=2).encode("utf-8")


def _flatten_agent_output(output: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for key in ("exposures", "risks", "failed_controls", "paths", "recommendations", "least_privilege_plan", "steps"):
        value = output.get(key)
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    lines.append("; ".join(f"{k}: {v}" for k, v in item.items() if k != "sequence"))
                else:
                    lines.append(str(item))
    if output.get("corrected_hcl"):
        lines.append("Corrected HCL included in AI remediation output.")
    return lines
