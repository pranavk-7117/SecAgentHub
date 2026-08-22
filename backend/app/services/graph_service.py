from __future__ import annotations

from typing import Any

import networkx as nx


def build_attack_graph(parsed: dict[str, Any], findings: dict[str, Any]) -> dict[str, Any]:
    graph = nx.DiGraph()
    graph.add_node("internet", label="Public Internet", risk=95, kind="external", issue_count=0)
    failed = (findings.get("results") or {}).get("failed_checks", [])

    for resource in parsed.get("resources", []):
        matched = _findings_for_resource(resource, failed)
        risk = _risk_for_resource(resource, matched)
        graph.add_node(
            resource["id"],
            label=resource["id"],
            risk=risk,
            kind=resource["type"],
            issue_count=len(matched),
            findings=[item.get("check_id") for item in matched],
        )
        internet_exposed = _is_internet_exposed(resource, matched)
        if internet_exposed:
            graph.add_edge("internet", resource["id"], label="public exposure", risk="critical")

    for dependency in parsed.get("dependencies", []):
        if dependency["source"] in graph and dependency["target"] in graph:
            graph.add_edge(dependency["source"], dependency["target"], label=dependency.get("kind", "depends_on"), risk="dependency")

    _add_inferred_edges(graph)

    highest_risk = sorted(graph.nodes, key=lambda node: graph.nodes[node].get("risk", 0), reverse=True)[:5]
    critical_paths = []
    for node in graph.nodes:
        if node != "internet" and nx.has_path(graph, "internet", node):
            path = nx.shortest_path(graph, "internet", node)
            if len(path) > 1 and len(path) <= 5 and _is_attack_destination(graph.nodes[node].get("kind", "")):
                critical_paths.append(path)
    critical_paths = sorted(critical_paths, key=lambda path: (-len(path), path[-1]))[:6]

    # Extend with new engine
    try:
        from app.services.attack_engine import SecurityDigitalTwin
        twin = SecurityDigitalTwin(parsed, findings)
        graph_dict = {
            "nodes": [
                {
                    "id": node,
                    "type": "default",
                    "position": {"x": (idx % 4) * 240.0, "y": (idx // 4) * 140.0},
                    "data": graph.nodes[node],
                }
                for idx, node in enumerate(graph.nodes)
            ],
            "edges": [
                {"id": f"{source}->{target}", "source": source, "target": target, "label": data.get("label"), "risk": data.get("risk")}
                for source, target, data in graph.edges(data=True)
            ],
            "blast_radius_score": _blast_radius_score(graph),
            "critical_attack_paths": critical_paths,
            "highest_risk_nodes": highest_risk,
        }
        graph_dict["security_twin"] = twin.build_twin()
        graph_dict["attack_paths"] = twin.compute_attack_paths()
        graph_dict["security_gate"] = twin.evaluate_gate(findings)
    except Exception as e:
        graph_dict = {
            "nodes": [
                {
                    "id": node,
                    "type": "default",
                    "position": {"x": (idx % 4) * 240.0, "y": (idx // 4) * 140.0},
                    "data": graph.nodes[node],
                }
                for idx, node in enumerate(graph.nodes)
            ],
            "edges": [
                {"id": f"{source}->{target}", "source": source, "target": target, "label": data.get("label"), "risk": data.get("risk")}
                for source, target, data in graph.edges(data=True)
            ],
            "blast_radius_score": _blast_radius_score(graph),
            "critical_attack_paths": critical_paths,
            "highest_risk_nodes": highest_risk,
        }
        graph_dict["security_twin"] = {"error": str(e)}
        graph_dict["attack_paths"] = []
        graph_dict["security_gate"] = {"verdict": "ERROR", "error": str(e)}

    return graph_dict


def _findings_for_resource(resource: dict[str, Any], failed: list[dict[str, Any]]) -> list[dict[str, Any]]:
    resource_id = resource["id"]
    resource_type = resource["type"]
    keyword = _type_keyword(resource_type)
    return [
        finding
        for finding in failed
        if resource_id == str(finding.get("resource", ""))
        or resource_id in str(finding.get("resource", ""))
        or keyword in f"{finding.get('check_name', '')} {finding.get('check_id', '')}".lower()
    ]


def _risk_for_resource(resource: dict[str, Any], failed: list[dict[str, Any]]) -> int:
    risk = 20
    body = str(resource.get("attributes", "")).lower()
    if "0.0.0.0/0" in body or "public-read" in body:
        risk += 35
    if "aws_iam" in resource["type"] and "*" in body:
        risk += 35
    for finding in failed:
        risk += _finding_weight(finding)
    return min(100, risk)


def _is_internet_exposed(resource: dict[str, Any], findings: list[dict[str, Any]]) -> bool:
    body = str(resource.get("attributes", "")).lower()
    if "security_group" in resource["type"]:
        return "0.0.0.0/0" in body or "::/0" in body
    if resource["type"] in {"aws_s3_bucket", "aws_s3_bucket_acl"}:
        return "public-read" in body or "public-read-write" in body or any("public access" in str(item).lower() for item in findings)
    if resource["type"] == "aws_instance":
        return "associate_public_ip_address': true" in body or "associate_public_ip_address\": true" in body or any("public ip" in str(item).lower() for item in findings)
    if resource["type"] == "aws_db_instance":
        return "publicly_accessible': true" in body or "publicly_accessible\": true" in body or "publicly_accessible" in body and "true" in body
    return False


def _type_keyword(resource_type: str) -> str:
    if "security_group" in resource_type:
        return "security group"
    if "s3_bucket" in resource_type:
        return "s3"
    if "iam" in resource_type:
        return "iam"
    return resource_type.replace("aws_", "").replace("_", " ")


def _add_inferred_edges(graph: nx.DiGraph) -> None:
    security_groups = [node for node, data in graph.nodes(data=True) if "security_group" in data.get("kind", "")]
    instances = [node for node, data in graph.nodes(data=True) if data.get("kind") in {"aws_instance", "aws_db_instance"}]
    compute_instances = [node for node, data in graph.nodes(data=True) if data.get("kind") == "aws_instance"]
    iam_roles = [node for node, data in graph.nodes(data=True) if data.get("kind") == "aws_iam_role"]
    iam_policies = [node for node, data in graph.nodes(data=True) if data.get("kind") == "aws_iam_role_policy"]
    instance_profiles = [node for node, data in graph.nodes(data=True) if data.get("kind") == "aws_iam_instance_profile"]
    storage_nodes = [node for node, data in graph.nodes(data=True) if data.get("kind") == "aws_s3_bucket"]

    for sg in security_groups:
        if graph.has_edge("internet", sg):
            for instance in instances:
                graph.add_edge(sg, instance, label="network access", risk="high")

    for instance in compute_instances:
        for profile in instance_profiles:
            graph.add_edge(instance, profile, label="attached identity", risk="high")
    for profile in instance_profiles:
        for role in iam_roles:
            graph.add_edge(profile, role, label="assumes role", risk="high")
    for role in iam_roles:
        for policy in iam_policies:
            graph.add_edge(role, policy, label="attached policy", risk="high")
    for role in [*iam_roles, *iam_policies]:
        for storage in storage_nodes:
            graph.add_edge(role, storage, label="data access", risk="high")


def _is_attack_destination(kind: str) -> bool:
    return kind not in {"aws_s3_bucket_public_access_block", "aws_s3_bucket_acl"}


def _finding_weight(finding: dict[str, Any]) -> int:
    explicit = (finding.get("severity") or "").upper()
    if explicit in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}:
        return {"CRITICAL": 45, "HIGH": 35, "MEDIUM": 20, "LOW": 10}[explicit]
    text = f"{finding.get('check_id', '')} {finding.get('check_name', '')}".lower()
    if "0.0.0.0" in text or "public read" in text or "public access" in text or "wildcard" in text:
        return 35
    if "encrypt" in text or "versioning" in text or "logging" in text:
        return 18
    return 8


def _blast_radius_score(graph: nx.DiGraph) -> int:
    resources = [node for node in graph.nodes if node != "internet"]
    if not resources:
        return 0
    exposed = [node for node in resources if nx.has_path(graph, "internet", node)]
    avg_risk = sum(graph.nodes[node].get("risk", 0) for node in resources) / len(resources)
    exposure_bonus = min(35, len(exposed) * 6)
    return min(100, round(avg_risk * 0.65 + exposure_bonus))
