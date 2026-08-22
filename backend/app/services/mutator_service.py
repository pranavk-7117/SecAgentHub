import re

def mutate_iam_wildcard_restriction(raw_hcl: str) -> str:
    # Replace `"Action": "*"` with `"Action": ["s3:GetObject"]`
    mutated = re.sub(r'"Action"\s*:\s*"\*"', '"Action": ["s3:GetObject"]', raw_hcl, flags=re.IGNORECASE)
    # Also handle HCL arrays if present
    mutated = re.sub(r'actions\s*=\s*\[\s*"\*"\s*\]', 'actions = ["s3:GetObject"]', mutated, flags=re.IGNORECASE)
    return mutated

def mutate_public_access_private(raw_hcl: str) -> str:
    # Replace public CIDR blocks
    mutated = raw_hcl.replace('["0.0.0.0/0"]', '["10.0.0.0/16"]')
    mutated = mutated.replace('0.0.0.0/0', '10.0.0.0/16')
    # Replace S3 public read
    mutated = re.sub(r'acl\s*=\s*"public-read"', 'acl = "private"', mutated, flags=re.IGNORECASE)
    return mutated

def mutate_port_22_closed(raw_hcl: str) -> str:
    # Change port 22 to 2222
    mutated = re.sub(r'from_port\s*=\s*22\b', 'from_port = 2222', raw_hcl, flags=re.IGNORECASE)
    mutated = re.sub(r'to_port\s*=\s*22\b', 'to_port = 2222', mutated, flags=re.IGNORECASE)
    return mutated

def mutate_encryption_enabled(raw_hcl: str) -> str:
    # Append server_side_encryption_configuration to aws_s3_bucket resources
    # Simple regex to inject into the block
    pattern = r'(resource\s+"aws_s3_bucket"\s+"[^"]+"\s*\{)'
    replacement = r'\1\n  server_side_encryption_configuration {\n    rule {\n      apply_server_side_encryption_by_default {\n        sse_algorithm = "AES256"\n      }\n    }\n  }\n'
    mutated = re.sub(pattern, replacement, raw_hcl, flags=re.IGNORECASE)
    return mutated

def apply_mutation(raw_hcl: str, mutation_type: str) -> str:
    if mutation_type == "iam_wildcard_restriction":
        return mutate_iam_wildcard_restriction(raw_hcl)
    elif mutation_type == "public_access_private":
        return mutate_public_access_private(raw_hcl)
    elif mutation_type == "port_22_closed":
        return mutate_port_22_closed(raw_hcl)
    elif mutation_type == "encryption_enabled":
        return mutate_encryption_enabled(raw_hcl)
    return raw_hcl

def get_available_mutations() -> list[str]:
    return [
        "iam_wildcard_restriction",
        "public_access_private",
        "port_22_closed",
        "encryption_enabled"
    ]
