from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from app.repository import repository
from app.services.parser_service import parse_terraform
from app.services.scanner_service import run_checkov
from app.services.graph_service import build_attack_graph
from app.services.mutator_service import apply_mutation, get_available_mutations


# Local cache for simulated twins (in-memory) to avoid polluting the DB
# Keys are twin_id, Values are the twin semantic dictionary
_TWIN_CACHE: dict[str, dict[str, Any]] = {}


def _extract_iam_relationships(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    # Simple extraction of IAM policies attached to roles
    # Not full fidelity, just a semantic representation
    relationships = []
    for dep in parsed.get("dependencies", []):
        if "aws_iam" in dep.get("source", "") and "aws_iam" in dep.get("target", ""):
            relationships.append(dep)
    return relationships


def _extract_network_relationships(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    relationships = []
    for dep in parsed.get("dependencies", []):
        if "security_group" in dep.get("source", "") or "security_group" in dep.get("target", ""):
            relationships.append(dep)
    return relationships


def _extract_public_exposures(parsed: dict[str, Any], findings: dict[str, Any]) -> list[str]:
    exposures = []
    failed = (findings.get("results") or {}).get("failed_checks", [])
    for resource in parsed.get("resources", []):
        body = str(resource.get("attributes", "")).lower()
        if "0.0.0.0/0" in body or "public-read" in body:
            exposures.append(resource["id"])
        # Cross-reference with checkov
        for finding in failed:
            if finding.get("resource") == resource["id"]:
                if "public" in finding.get("check_name", "").lower() or "0.0.0.0/0" in finding.get("check_name", "").lower():
                    if resource["id"] not in exposures:
                        exposures.append(resource["id"])
    return exposures


def _identify_crown_jewels(parsed: dict[str, Any]) -> list[str]:
    jewels = []
    for resource in parsed.get("resources", []):
        if "aws_db_instance" in resource["type"] or "aws_s3_bucket" in resource["type"]:
            jewels.append(resource["id"])
    return jewels


def build_twin_from_hcl(raw_hcl: str) -> dict[str, Any]:
    parsed = parse_terraform(raw_hcl)
    findings = run_checkov(raw_hcl)
    graph = build_attack_graph(parsed, findings)

    return {
        "resources": parsed.get("resources", []),
        "dependencies": parsed.get("dependencies", []),
        "iam_relationships": _extract_iam_relationships(parsed),
        "network_relationships": _extract_network_relationships(parsed),
        "public_exposures": _extract_public_exposures(parsed, findings),
        "sensitive_resources": _identify_crown_jewels(parsed),
        "graph": graph,
        "raw_hcl": raw_hcl,
        "findings": findings
    }


def build_twin(scan_id: str, user_id: str | None = None) -> dict[str, Any] | None:
    # First check local cache
    if scan_id in _TWIN_CACHE:
        return _TWIN_CACHE[scan_id]
        
    scan = repository.get_scan(scan_id, user_id=user_id)
    if not scan:
        return None

    # We could rebuild everything, or just use what is already saved in the scan.
    # To ensure consistency with simulate, let's just use the stored ones.
    twin = {
        "id": scan.id,
        "resources": scan.parsed.get("resources", []),
        "dependencies": scan.parsed.get("dependencies", []),
        "iam_relationships": _extract_iam_relationships(scan.parsed),
        "network_relationships": _extract_network_relationships(scan.parsed),
        "public_exposures": _extract_public_exposures(scan.parsed, scan.raw_checkov_json),
        "sensitive_resources": _identify_crown_jewels(scan.parsed),
        "graph": scan.graph,
        "raw_hcl": scan.raw_hcl,
        "findings": scan.raw_checkov_json
    }
    _TWIN_CACHE[scan.id] = twin
    return twin


def simulate_mutation(twin_id: str, mutation_type: str, user_id: str | None = None) -> dict[str, Any]:
    twin = build_twin(twin_id, user_id=user_id)
    if not twin:
        raise ValueError("Twin not found")

    new_hcl = apply_mutation(twin["raw_hcl"], mutation_type)
    
    simulated_twin = build_twin_from_hcl(new_hcl)
    simulated_id = f"sim-{uuid4()}"
    simulated_twin["id"] = simulated_id
    simulated_twin["parent_id"] = twin_id
    simulated_twin["mutation_applied"] = mutation_type
    
    _TWIN_CACHE[simulated_id] = simulated_twin
    return simulated_twin


def compare_twins(twin_before: dict[str, Any], twin_after: dict[str, Any]) -> dict[str, Any]:
    paths_before = twin_before["graph"].get("critical_attack_paths", [])
    paths_after = twin_after["graph"].get("critical_attack_paths", [])
    
    critical_before = sum(1 for node in twin_before["graph"].get("nodes", []) if node.get("data", {}).get("risk", 0) >= 35)
    critical_after = sum(1 for node in twin_after["graph"].get("nodes", []) if node.get("data", {}).get("risk", 0) >= 35)
    
    paths_broken = max(0, len(paths_before) - len(paths_after))
    new_risks = max(0, len(paths_after) - len(paths_before))

    nodes_before_ids = set(n.get("id") for n in twin_before["graph"].get("nodes", []))
    nodes_after_ids = set(n.get("id") for n in twin_after["graph"].get("nodes", []))
    edges_before_ids = set(e.get("id") for e in twin_before["graph"].get("edges", []))
    edges_after_ids = set(e.get("id") for e in twin_after["graph"].get("edges", []))

    nodes_added = list(nodes_after_ids - nodes_before_ids)
    nodes_removed = list(nodes_before_ids - nodes_after_ids)
    edges_added = list(edges_after_ids - edges_before_ids)
    edges_removed = list(edges_before_ids - edges_after_ids)

    return {
        "attack_paths_before": len(paths_before),
        "attack_paths_after": len(paths_after),
        "critical_before": critical_before,
        "critical_after": critical_after,
        "paths_broken": paths_broken,
        "new_risks": new_risks,
        "nodes_changed": {
            "added": nodes_added,
            "removed": nodes_removed
        },
        "edges_changed": {
            "added": edges_added,
            "removed": edges_removed
        }
    }


def optimize_remediation(twin_id: str, user_id: str | None = None) -> dict[str, Any]:
    twin = build_twin(twin_id, user_id=user_id)
    if not twin:
        raise ValueError("Twin not found")

    results = []
    mutations = get_available_mutations()
    
    for mut in mutations:
        try:
            sim_twin = simulate_mutation(twin_id, mut, user_id=user_id)
            comparison = compare_twins(twin, sim_twin)
            results.append({
                "mutation": mut,
                "paths_broken": comparison["paths_broken"],
                "critical_remaining": comparison["critical_after"],
                "details": comparison
            })
        except Exception:
            pass

    if not results:
        return {"error": "Optimization failed"}

    # Sort by paths_broken (descending), then critical_remaining (ascending)
    results.sort(key=lambda x: (x["paths_broken"], -x["critical_remaining"]), reverse=True)
    
    return {
        "recommended_mutation": results[0]["mutation"],
        "max_paths_broken": results[0]["paths_broken"],
        "all_evaluations": results
    }
