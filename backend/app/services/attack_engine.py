from typing import Any, Dict, List, Optional
import networkx as nx

def _flatten(val: Any) -> list:
    """Recursively flatten nested lists/tuples produced by python-hcl2 or AST parsing."""
    if isinstance(val, (list, tuple)):
        res = []
        for item in val:
            res.extend(_flatten(item))
        return res
    return [val] if val is not None else []

def _str_val(val: Any) -> str:
    """Extract string value from potentially list-wrapped attribute."""
    flat = _flatten(val)
    return str(flat[0]) if flat else ""

def _list_vals(val: Any) -> list[str]:
    """Extract list of strings from nested lists/tuples."""
    return [str(x) for x in _flatten(val)]

class ResourceNode:
    def __init__(self, id: str, type: str, name: str, attributes: dict):
        self.id = id
        self.type = type
        self.name = name
        self.attributes = attributes
        self.risk_score = 0
        self.is_crown_jewel = False
        self.exposure = "private"
        self.mitre_techniques: List[str] = []
        self.evidence: List[str] = []

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "exposure": self.exposure,
            "is_crown_jewel": self.is_crown_jewel,
            "risk_score": self.risk_score,
            "evidence": self.evidence
        }

class SecurityDigitalTwin:
    def __init__(self, parsed: dict, findings: dict):
        self.parsed = parsed
        self.findings = findings
        self.resources: Dict[str, ResourceNode] = {}
        self.graph = nx.DiGraph()
        self.graph.add_node("internet", type="external")
        self._build_nodes()
        self._build_edges()
        self.paths = []

    def _build_nodes(self):
        # Build resource nodes
        for res in self.parsed.get("resources", []):
            node = ResourceNode(
                id=res["id"],
                type=res["type"],
                name=res["name"],
                attributes=res.get("attributes", {})
            )
            self.resources[node.id] = node
            self.graph.add_node(node.id, obj=node)
            
            # Crown Jewel Detection (Phase 2c)
            is_cj = False
            if node.type in ["aws_db_instance", "aws_rds_cluster"]:
                is_cj = True
            elif node.type == "aws_s3_bucket" and any(k in node.name.lower() for k in ['data', 'prod', 'backup', 'log', 'sensitive', 'secret', 'archive']):
                is_cj = True
            elif node.type in ["aws_secretsmanager_secret", "aws_ssm_parameter", "aws_kms_key"]:
                is_cj = True
            
            tags = node.attributes.get("tags", {})
            if isinstance(tags, list) and tags and isinstance(tags[0], dict):
                tags = tags[0]
            if isinstance(tags, dict):
                if str(tags.get("Environment", "")).lower() == "production": is_cj = True
                if str(tags.get("Sensitivity", "")).lower() == "high": is_cj = True
                if str(tags.get("DataClassification", "")).lower() == "confidential": is_cj = True
            
            node.is_crown_jewel = is_cj

    def _build_edges(self):
        # Phase 2b Evidence-Backed Edge Rules
        
        # RULE 1: internet -> compute / security_group
        for node in self.resources.values():
            ingress = node.attributes.get("ingress", [])
            if not isinstance(ingress, list):
                ingress = [ingress]
            for rule in ingress:
                if isinstance(rule, dict):
                    cidr = _list_vals(rule.get("cidr_blocks", []))
                    if "0.0.0.0/0" in cidr:
                        from_port_list = _flatten(rule.get("from_port", [0]))
                        to_port_list = _flatten(rule.get("to_port", [0]))
                        fp = int(from_port_list[0]) if from_port_list and isinstance(from_port_list[0], (int, str)) and str(from_port_list[0]).isdigit() else 0
                        tp = int(to_port_list[0]) if to_port_list and isinstance(to_port_list[0], (int, str)) and str(to_port_list[0]).isdigit() else 0
                        
                        if fp in [22, 80, 443, 3306, 5432, 6379, 0] or tp in [22, 80, 443, 3306, 5432, 6379, 0] or fp == 0:
                            self.graph.add_edge("internet", node.id, label="public_ingress", evidence=f"sg allows 0.0.0.0/0 on port {fp}", mitre="T1190")
                            node.exposure = "internet"
                            if f"sg allows 0.0.0.0/0:{fp}" not in node.evidence:
                                node.evidence.append(f"sg allows 0.0.0.0/0:{fp}")

        # Link SG to Instance
        for node in self.resources.values():
            if node.type == "aws_instance":
                sg_list = _list_vals(node.attributes.get("vpc_security_group_ids", []))
                for sg_item in sg_list:
                    sg_ref = sg_item.replace("${", "").replace("}", "").strip()
                    for other_id, other_node in self.resources.items():
                        if (other_id == sg_ref or other_node.name in sg_ref or sg_ref.endswith(other_node.name)) and other_node.type == "aws_security_group":
                            if self.graph.has_edge("internet", other_id):
                                self.graph.add_edge("internet", node.id, label="public_ingress", evidence="attached to public sg", mitre="T1190")
                                node.exposure = "internet"
                                self.graph.add_edge(other_id, node.id, label="network_access", evidence="security group attached to compute")

        # RULE 2: compute -> iam_role
        for node in self.resources.values():
            if node.type == "aws_instance":
                profile = _str_val(node.attributes.get("iam_instance_profile", ""))
                if profile:
                    profile_ref = profile.replace("${", "").replace("}", "").split(".name")[0].split(".id")[0]
                    for other in self.resources.values():
                        if other.type == "aws_iam_role" and (other.id in profile_ref or other.name in profile_ref):
                            self.graph.add_edge(node.id, other.id, label="instance_profile", evidence=f"iam_instance_profile = {profile}", mitre="T1078.004")
                        elif other.type == "aws_iam_instance_profile" and (other.id in profile_ref or other.name in profile_ref):
                            role_ref = _str_val(other.attributes.get("role", ""))
                            for r in self.resources.values():
                                if r.type == "aws_iam_role" and (r.name in role_ref or r.id in role_ref):
                                    self.graph.add_edge(node.id, r.id, label="instance_profile", evidence="iam_instance_profile attached", mitre="T1078.004")

        # RULE 3: iam_role -> iam_policy
        for node in self.resources.values():
            if node.type in ["aws_iam_role_policy", "aws_iam_role_policy_attachment"]:
                role_attr = _str_val(node.attributes.get("role", ""))
                for r in self.resources.values():
                    if r.type == "aws_iam_role" and (r.name in role_attr or r.id in role_attr or role_attr.endswith(r.name)):
                        self.graph.add_edge(r.id, node.id, label="attached_policy", evidence="policy attached to role")

        # RULE 4, 5: iam_role/policy -> s3_bucket/rds
        for node in self.resources.values():
            if node.type in ["aws_iam_role_policy", "aws_iam_policy"]:
                policy_doc = _str_val(node.attributes.get("policy", "")).lower()
                has_s3 = "s3:getobject" in policy_doc or "s3:putobject" in policy_doc or "s3:*" in policy_doc or '"action": "*"' in policy_doc or '"action":"*"' in policy_doc
                has_rds = "rds:*" in policy_doc or "secretsmanager:getsecretvalue" in policy_doc or '"action": "*"' in policy_doc or '"action":"*"' in policy_doc
                is_wildcard = '"resource": "*"' in policy_doc or '"resource":"*"' in policy_doc or '"resource": "*"' in policy_doc
                
                roles = [u for u, v, d in self.graph.in_edges(node.id, data=True) if d.get('label') == 'attached_policy']
                if not roles:
                    role_attr = _str_val(node.attributes.get("role", ""))
                    roles = [r.id for r in self.resources.values() if r.type == "aws_iam_role" and (r.name in role_attr or r.id in role_attr)]

                for target in self.resources.values():
                    if target.type == "aws_s3_bucket" and has_s3:
                        if is_wildcard or target.name.lower() in policy_doc or target.id in policy_doc:
                            for r in roles:
                                self.graph.add_edge(r, target.id, label="data_access", evidence="policy allows s3 access", mitre="T1530")
                    elif target.type in ["aws_db_instance", "aws_rds_cluster"] and has_rds:
                        if is_wildcard or target.name.lower() in policy_doc or target.id in policy_doc:
                            for r in roles:
                                self.graph.add_edge(r, target.id, label="db_access", evidence="policy allows rds access")

        # RULE 7: s3_bucket -> internet
        for node in self.resources.values():
            if node.type == "aws_s3_bucket":
                acl = _str_val(node.attributes.get("acl", ""))
                if acl in ["public-read", "public-read-write"]:
                    self.graph.add_edge(node.id, "internet", label="data_exfiltration", evidence="bucket acl = public-read", mitre="T1537")
                policy = _str_val(node.attributes.get("policy", "")).lower()
                if '"principal": "*"' in policy or '"principal":"*"' in policy or '"principal": "*"' in policy:
                    self.graph.add_edge(node.id, "internet", label="data_exfiltration", evidence="bucket policy allows Principal: *", mitre="T1537")

        # Evaluate risk score for resources
        for node in self.resources.values():
            score = 0
            if node.is_crown_jewel:
                score += 25
            if node.exposure == "internet":
                score += 30
            if node.type == "aws_iam_role":
                score += 25
            node.risk_score = min(100, score)

    def build_twin(self):
        return {
            "resources": [r.to_dict() for r in self.resources.values()],
            "crown_jewels": [r.id for r in self.resources.values() if r.is_crown_jewel],
            "internet_facing": [r.id for r in self.resources.values() if r.exposure == "internet" or self.graph.has_edge("internet", r.id)]
        }

    def compute_attack_paths(self):
        paths = []
        crown_jewels = [r.id for r in self.resources.values() if r.is_crown_jewel]
        
        for cj in crown_jewels:
            if nx.has_path(self.graph, "internet", cj):
                for p in nx.all_simple_paths(self.graph, "internet", cj, cutoff=6):
                    edges = []
                    mitre_techniques = set()
                    for i in range(len(p)-1):
                        edge_data = self.graph.get_edge_data(p[i], p[i+1]) or {}
                        edges.append({
                            "from": p[i],
                            "to": p[i+1],
                            "label": edge_data.get("label", ""),
                            "evidence": edge_data.get("evidence", ""),
                            "mitre": edge_data.get("mitre", "")
                        })
                        if edge_data.get("mitre"):
                            mitre_techniques.add(edge_data.get("mitre"))
                    
                    hops = len(p) - 1
                    internet_score = 30
                    privilege_score = 25 if any(self.resources.get(n) and self.resources[n].type == "aws_iam_role" for n in p if n != "internet") else 0
                    cj_score = 25
                    hop_penalty = max(0, 20 - (hops * 4))
                    score = internet_score + privilege_score + cj_score + hop_penalty
                    
                    choke_point = p[1] if len(p) > 1 else p[0]
                    
                    paths.append({
                        "id": f"path_{len(paths)+1:03d}",
                        "steps": p,
                        "score": score,
                        "severity": "CRITICAL" if score >= 80 else "HIGH",
                        "choke_point": choke_point,
                        "edges": edges,
                        "mitre_techniques": list(mitre_techniques)
                    })
        
        self.paths = sorted(paths, key=lambda x: x["score"], reverse=True)
        return self.paths

    def evaluate_gate(self, findings):
        results = findings.get("results", {})
        failed = results.get("failed_checks", [])
        
        critical_findings = sum(1 for f in failed if str(f.get("severity")).upper() == "CRITICAL")
        
        public_exposure_check_ids = {"CKV_AWS_24", "CKV_AWS_20", "CKV_AWS_88", "CKV_AWS_53", "CKV_AWS_54", "CKV_AWS_55", "CKV_AWS_56"}
        checkov_public_exposures = sum(1 for f in failed if f.get("check_id") in public_exposure_check_ids)
        
        twin_internet_facing = [
            r.id for r in self.resources.values()
            if r.exposure == "internet" or self.graph.has_edge("internet", r.id) or self.graph.has_edge(r.id, "internet")
        ]
        new_public_exposures = max(checkov_public_exposures, len(twin_internet_facing))
        
        critical_attack_paths = len([p for p in self.paths if p["severity"] == "CRITICAL"])
        
        reasons = []
        if critical_findings > 0:
            reasons.append(f"{critical_findings} critical finding(s)")
        if critical_attack_paths > 0:
            reasons.append(f"Critical attack path(s) detected: {critical_attack_paths}")
        if new_public_exposures > 0 and not self.paths and checkov_public_exposures > 0:
            reasons.append(f"{new_public_exposures} public resource exposure(s) detected")
            
        verdict = "BLOCK" if reasons else "PASS"
        
        return {
            "critical_findings": critical_findings,
            "critical_attack_paths": critical_attack_paths,
            "new_public_exposures": new_public_exposures,
            "internet_facing_resources": twin_internet_facing,
            "verdict": verdict,
            "reasons": reasons
        }
