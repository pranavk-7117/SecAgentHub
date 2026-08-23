from __future__ import annotations

from typing import Any


# Checkov check ID -> compliance controls
COMPLIANCE_MAPPINGS: dict[str, list[dict[str, str]]] = {
    "CKV_AWS_24": [
        {
            "framework": "CIS AWS",
            "control": "4.1",
            "title": "Restrict unrestricted SSH access",
        },
        {
            "framework": "NIST",
            "control": "SC-7",
            "title": "Boundary protection",
        },
    ],

    "CKV_AWS_20": [
        {
            "framework": "CIS AWS",
            "control": "2.1",
            "title": "Ensure S3 buckets are not publicly accessible",
        },
        {
            "framework": "NIST",
            "control": "AC-3",
            "title": "Access enforcement",
        },
    ],

    "CKV_AWS_19": [
        {
            "framework": "CIS AWS",
            "control": "2.1",
            "title": "Ensure data at rest is protected",
        },
        {
            "framework": "NIST",
            "control": "SC-28",
            "title": "Protection of information at rest",
        },
    ],

    "CKV_AWS_41": [
        {
            "framework": "CIS AWS",
            "control": "1.16",
            "title": "Least privilege IAM permissions",
        },
        {
            "framework": "NIST",
            "control": "AC-6",
            "title": "Least privilege",
        },
    ],
}


def get_compliance_controls(check_id: str) -> list[dict[str, str]]:
    """
    Return compliance controls associated with a Checkov check.
    """
    return COMPLIANCE_MAPPINGS.get(check_id, [])


def enrich_with_compliance(
    finding: dict[str, Any],
) -> dict[str, Any]:
    """
    Add compliance information to a security finding.
    """

    check_id = str(finding.get("check_id", ""))

    finding["compliance"] = get_compliance_controls(check_id)

    return finding
