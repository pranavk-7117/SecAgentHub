from __future__ import annotations

import io
import json
import re
from typing import Any


def parse_terraform(raw_hcl: str) -> dict[str, Any]:
    raw_hcl = raw_hcl.lstrip("\ufeff").strip()
    try:
        import hcl2

        parsed = hcl2.load(io.StringIO(raw_hcl))
    except Exception:
        parsed = _fallback_parse(raw_hcl)

    resources = _extract_resources(parsed)
    dependencies = _extract_dependencies(raw_hcl, resources)
    iam_policies = _extract_iam_policies(raw_hcl)
    return {"ast": parsed, "resources": resources, "dependencies": dependencies, "iam_policies": iam_policies}


def _extract_resources(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    resources: list[dict[str, Any]] = []
    for block in parsed.get("resource", []):
        if isinstance(block, dict):
            for resource_type, named in block.items():
                for name, body in named.items():
                    resources.append(
                        {
                            "id": f"{resource_type}.{name}",
                            "type": resource_type,
                            "name": name,
                            "attributes": body if isinstance(body, dict) else {},
                        }
                    )
    return resources


def _extract_dependencies(raw_hcl: str, resources: list[dict[str, Any]]) -> list[dict[str, str]]:
    resource_ids = {resource["id"] for resource in resources}
    dependencies: list[dict[str, str]] = []
    for resource in resources:
        block = _resource_block(raw_hcl, resource["type"], resource["name"])
        for referenced in resource_ids:
            if referenced != resource["id"] and re.search(rf"\b{re.escape(referenced)}\b", block):
                dependencies.append({"source": referenced, "target": resource["id"], "kind": "reference"})
    return dependencies


def _resource_block(raw_hcl: str, resource_type: str, name: str) -> str:
    match = re.search(rf'resource\s+"{re.escape(resource_type)}"\s+"{re.escape(name)}"\s*{{', raw_hcl)
    if not match:
        return ""
    start = match.start()
    index = match.end()
    depth = 1
    while index < len(raw_hcl) and depth:
        if raw_hcl[index] == "{":
            depth += 1
        elif raw_hcl[index] == "}":
            depth -= 1
        index += 1
    return raw_hcl[start:index]


def _extract_iam_policies(raw_hcl: str) -> list[dict[str, Any]]:
    policies: list[dict[str, Any]] = []
    for match in re.finditer(r"policy\s*=\s*<<(?:EOF|POLICY)\s*(.*?)\s*(?:EOF|POLICY)", raw_hcl, re.S):
        text = match.group(1)
        try:
            body = json.loads(text)
        except json.JSONDecodeError:
            body = {"raw": text}
        policies.append(body)
    return policies


def _fallback_parse(raw_hcl: str) -> dict[str, Any]:
    resources = []
    for resource_type, name in re.findall(r'resource\s+"([^"]+)"\s+"([^"]+)"', raw_hcl):
        resources.append({resource_type: {name: {}}})
    return {"resource": resources}
