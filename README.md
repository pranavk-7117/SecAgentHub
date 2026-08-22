# SecAgent Hub

Pre-deployment cloud infrastructure security platform powered by semantic digital twin modeling, deterministic attack path analysis, and automated CI/CD security gate enforcement.

---

## Executive Summary

SecAgent Hub shifts cloud security left—analyzing Infrastructure-as-Code (IaC) before resources are provisioned in production. Rather than treating Terraform files as disconnected static lines of code, SecAgent Hub builds an interactive **Security Digital Twin** of the proposed infrastructure.

It executes deterministic graph traversals to identify reachable attack paths from the public Internet to critical cloud assets, identifies single high-impact choke points that dismantle multiple attack chains, generates validated Terraform remediation patches, mathematically verifies that the fixes eliminate the risk through a closed-loop proof-of-fix pipeline, and enforces merge decisions in CI/CD pull requests.

---

## Core Problem and Approach

### The Problem
Traditional Infrastructure-as-Code scanners produce long lists of isolated findings without context. Security teams are left asking:
1. Which vulnerabilities are actually reachable by an attacker?
2. Which single fix provides the highest security return on investment?
3. Can we mathematically prove that a proposed code fix eliminated the vulnerability without introducing syntax errors or new issues?
4. How can we prevent dangerous pull requests from being merged without slowing down deployment velocity?

### The SecAgent Hub Approach
- **Graph engine proves; AI explains:** Reachability and attack paths are calculated using deterministic graph theory (NetworkX) based strictly on parsed HCL relationships and policy rules. AI models are used to explain risks in plain language and generate remediation code, never to hallucinate reachability.
- **Counterfactual What-If analysis:** Developers can test simulated configuration changes on the virtual digital twin before editing source code.
- **Choke-Point Optimization:** The engine ranks resources by network centrality to identify the minimal set of changes that break the largest number of attack paths.
- **Closed-Loop Proof-of-Fix:** AI patches are automatically run through HCL validation, policy rescanning, digital twin rebuilding, and attack path replay before receiving a verified attestation.
- **CI/CD Security Gate:** Pull requests are automatically analyzed against the baseline branch. Safe changes are approved, while dangerous changes with critical attack paths are blocked with clear remediation guidance in GitHub step summaries.

---

## The End-to-End Security Pipeline

`	ext
                DEVELOPER
                    |
                    v
           Terraform / IaC File
                    |
          +---------+---------+
          |                   |
          v                   v
     Web Upload          GitHub Pull Request
          |                   |
          |             GitHub Actions
          |                   |
          +---------+---------+
                    |
                    v
            SecAgent Hub API
                    |
                    v
             HCL / AST Parser
                    |
                    v
           Policy Security Scan
                    |
                    v
     +------------------------------+
     |   INFRASTRUCTURE DIGITAL TWIN|
     |                              |
     | Compute, IAM, Networks,      |
     | Storage, Trust Boundaries    |
     +--------------+---------------+
                    |
                    v
         Deterministic Attack Engine
                    |
                    v
            Attack Path Chains
         (Evidence & MITRE Mapped)
                    |
                    v
          What-If Simulation Engine
                    |
                    v
        Choke-Point Graph Optimizer
                    |
                    v
          AI Remediation Generator
                    |
                    v
        Closed-Loop Verification
        - HCL Syntax Check
        - Checkov Rescan
        - Digital Twin Rebuild
        - Attack Path Replay
                    |
                    v
           Proof-of-Fix Attested
                    |
                    v
          CI/CD Security Gate
             /             \
            /               \
           v                 v
      BLOCKED              PASSED
     (Exit Code 1)      (Exit Code 0)
`

---

## Key Capabilities

### 1. Semantic Infrastructure Digital Twin
From parsed Terraform HCL, the platform constructs an in-memory graph model representing:
- Compute instances (EC2, Lambda, Container clusters)
- Security Groups, ingress/egress CIDRs, and open ports
- IAM Roles, Instance Profiles, and attached policy documents
- Storage buckets, RDS databases, Secrets Manager, and KMS keys
- Automated classification of Internet-facing entry points versus Crown Jewel assets

### 2. Evidence-Backed Attack Path Analysis
The attack engine executes directional graph path-finding algorithms (all_simple_paths) from untrusted origins (internet) to protected destinations. Every step in an attack chain is backed by concrete evidence:
- Edge rule: Security group allows 0.0.0.0/0 on ingress port 22 (Mapped to MITRE ATT&CK T1190)
- Edge rule: EC2 attached to IAM Role via instance profile (Mapped to MITRE ATT&CK T1078.004)
- Edge rule: IAM Role contains wildcard policy Action: * allowing full RDS or S3 access (Mapped to MITRE ATT&CK T1530)

### 3. Choke-Point Optimization
Rather than requiring engineers to address dozens of distinct alerts, the optimizer calculates betweenness centrality across all identified attack paths. It identifies the single resource—such as an open security group or an overly broad role binding—whose remediation eliminates the maximum number of attack paths simultaneously.

### 4. Closed-Loop Proof-of-Fix
When a remediation patch is proposed, it is not simply assumed to work. SecAgent Hub runs a 4-stage automated validation pipeline:
1. **HCL Syntax Validation:** Confirms the patched code is valid, parseable Terraform.
2. **Security Rescan:** Runs Checkov compliance checks against the patched code.
3. **Digital Twin Rebuild:** Reconstructs the infrastructure graph from the updated configuration.
4. **Attack Path Replay:** Verifies that zero reachable attack paths remain to critical assets.

### 5. Automated CI/CD Security Gate
The repository includes a reusable GitHub Actions workflow (.github/workflows/secagent-security.yml) that triggers on pull requests modifying Terraform files:
- Sends PR metadata and Terraform content to POST /api/v1/cicd/security-gate.
- Calculates the delta in risk score and newly introduced attack paths against the base branch.
- Generates a structured Markdown summary directly inside .
- Exits with status code 1 if critical attack paths are detected, blocking unsafe merges.
- Exits with status code 0 when changes are verified safe, allowing the merge to proceed.

### 6. Pay-Per-Analysis via x402 Micropayments
SecAgent Hub supports the HTTP 402 Payment Required standard on Algorand TestNet and MainNet:
- Each specialist agent analysis is a discrete micro-transaction in USDC or ALGO.
- Users connect via Pera Wallet to sign and settle payments on-chain.
- Multi-tier resilient verification uses the GoPlausible x402 Facilitator API, direct Algorand Indexer verification, or fast demo bypass modes.

---

## Live Hackathon Demonstration Guide

### Step 1: The Insecure Pull Request
1. A developer creates a feature branch introducing an open SSH security group (0.0.0.0/0:22) and a wildcard IAM role.
2. The developer opens a Pull Request against main.
3. GitHub Actions triggers the SecAgent Cloud Security Gate workflow.
4. The security gate contacts the SecAgent backend, evaluates the change, and blocks the pull request:
   `	ext
   Enforcement Verdict: BLOCK MERGE
   Blast Radius Risk: 94/100 (+25)
   Critical Attack Paths: 2
   Reachable Target: Production RDS Database
   `

### Step 2: Investigation in SecAgent Hub
1. Open the scan in SecAgent Hub (/scan/[id]/ci or /scan/[id]/twin).
2. Explore the interactive **Digital Twin Canvas** showing the exact chain:
   Internet -> Security Group -> EC2 Instance -> IAM Role -> RDS Database
3. Click on any edge to inspect the underlying evidence and MITRE ATT&CK classification.

### Step 3: Optimization and Simulation
1. Review the **Choke-Point Optimizer**, which highlights:
   Best Fix: aws_security_group.web_sg (Breaks 2 attack paths)
2. Click **Apply Fix** to trigger the counterfactual What-If simulation.
3. Observe the hypothetical risk score drop to 0 on the canvas in real time.

### Step 4: Proof-of-Fix Verification
1. Click **Run AI Proof-of-Fix Verification**.
2. Watch the 4 verification stages execute:
   - HCL Syntax Validation: PASSED
   - Security Rescan: PASSED (0 new findings)
   - Digital Twin Rebuild: PASSED
   - Attack Path Replay: PASSED (0 reachable paths)
3. The attestation banner updates to: CI/CD Gate: Now PASSES.

### Step 5: Merge Approval
1. The developer pushes the verified remediation to the pull request branch.
2. GitHub Actions re-evaluates the updated configuration.
3. The check turns green with verdict GATE PASSED, and the pull request is safely merged.

---

## Specialist Security Agents

| Agent | Focus Area | Capability |
|---|---|---|
| Misconfiguration Agent | IaC Hygiene | Identifies public ingress rules, unencrypted disks, and exposed management ports |
| IAM Risk Agent | Identity & Access | Analyzes least-privilege violations, wildcard permissions, and privilege escalation vectors |
| Compliance Agent | Regulatory Frameworks | Evaluates infrastructure against CIS Benchmarks, NIST 800-53, PCI-DSS, and HIPAA |
| Attack Path Agent | Lateral Movement | Computes multi-hop reachability graphs and blast radius scores from entry points to critical assets |
| AI Remediation Agent | Automated Fixing | Generates verified Terraform code diffs with plain-English contextual explanations |

---

## Repository Structure

`	ext
SecAgentHub/
├── README.md
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── secagent-security.yml       # GitHub Actions CI/CD Security Gate workflow
│
├── secagent-cicd-demo/                 # Standalone turnkey demo repository
│   ├── main.tf                         # Hardened baseline infrastructure
│   ├── insecure-change.tf              # Vulnerable PR configuration
│   └── README.md                       # Demo execution instructions
│
├── backend/
│   ├── requirements.txt
│   ├── schema.sql                      # PostgreSQL schema with Row-Level Security
│   ├── scripts/
│   │   ├── evaluate_gate.py            # CI/CD gate evaluator and summary generator
│   │   └── test_live_railway.py        # Live production endpoint test utility
│   ├── tests/
│   │   ├── test_security_gate.py       # Deterministic attack engine test cases
│   │   └── test_cicd_security_gate.py  # CI/CD API endpoint test cases
│   └── app/
│       ├── main.py                     # FastAPI application entrypoint
│       ├── cicd_routes.py              # POST /api/v1/cicd/security-gate endpoint
│       ├── twin_routes.py              # Digital Twin and mutation endpoints
│       ├── models.py                   # Pydantic data schemas
│       ├── repository.py               # Database persistence layer
│       ├── x402_middleware.py          # On-chain payment challenge and verification
│       └── services/
│           ├── attack_engine.py        # Deterministic digital twin and attack graph builder
│           ├── parser_service.py       # HCL2 AST parser
│           ├── scanner_service.py      # Checkov scanning integration
│           ├── agent_service.py        # Specialist security agent orchestrator
│           └── remediation_orchestrator.py # Closed-loop proof-of-fix verification engine
│
└── frontend/
    ├── app/
    │   ├── page.tsx                    # Landing page
    │   ├── login/page.tsx              # Authentication
    │   ├── dashboard/page.tsx          # Scan history dashboard
    │   ├── scan/new/page.tsx           # Upload and quick-demo interface
    │   └── scan/[id]/
    │       ├── agents/page.tsx         # Agent marketplace and x402 payment
    │       ├── results/page.tsx        # Findings, attack graph, and PDF report
    │       ├── twin/page.tsx           # Digital Twin, What-If simulation, and Proof-of-Fix
    │       └── ci/page.tsx             # Pull Request Security Gate comparison view
    ├── components/
    │   ├── DigitalTwinCanvas.tsx       # React Flow interactive topology canvas
    │   ├── SimulationPanel.tsx         # Counterfactual What-If mutation controls
    │   ├── RemediationOptimizer.tsx    # Choke-point centrality ranking
    │   ├── ProofOfFixPanel.tsx         # 4-step proof-of-fix verification UI
    │   ├── PathDetailsPanel.tsx        # Evidence drawer and MITRE mapping
    │   └── AIRemediationDiff.tsx       # Terraform code diff viewer
    └── lib/
        ├── api.ts                      # Backend API client and state bridge
        ├── x402Pera.ts                 # Pera Wallet connect and signing client
        └── supabase.ts                 # Supabase client configuration
`

---

## API Reference

### CI/CD Security Gate
- POST /api/v1/cicd/security-gate
  - Evaluates a pull request Terraform delta against the baseline branch.
  - Returns status (BLOCKED/PASSED), verdict (BLOCK/PASS), risk_score, critical_attack_paths, attack_paths, and reasons.

### Scans and Digital Twin
- POST /api/v1/scan/upload - Upload Terraform file and run initial policy analysis.
- GET /api/v1/scan/{id} - Retrieve full scan data, findings summary, and attack graph.
- GET /api/v1/scan/{id}/attack-paths - Retrieve attack paths and digital twin metadata.
- POST /api/v1/remediation/{id}/generate - Execute the closed-loop proof-of-fix pipeline.
- POST /api/v1/remediation/{id}/verify-patch - Validate a user-provided Terraform patch.

### Agent Marketplace and Payments
- POST /api/v1/agents/execute - Execute selected agents via x402 payment.
- POST /api/v1/ai/chat - Contextual AI chat assistant for infrastructure findings.
- GET /api/v1/scan/{id}/report - Export full PDF security audit report.

---

## Environment Variables

### Backend Configuration
`ini
ALGORAND_NETWORK=testnet
ALGOD_NODE_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
INDEXER_URL=https://testnet-idx.algonode.cloud
USDC_ASA_ID=10458941
FACILITATOR_ADDRESS=PT6VVN7OZ3TVISZ6C6AMQKS2LFLKPI5FFY5L5WCMZO4WKCIZL735ZNUWXU
ALLOW_MOCK_PAYMENTS=true
GROQ_API_KEY=<your-groq-api-key>
DATABASE_URL=<your-postgresql-connection-string>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-key>
INTERNAL_API_SECRET=
`

### Frontend Configuration
`ini
NEXT_PUBLIC_API_BASE_URL=https://secagent-hub-api-production-39fc.up.railway.app
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
NEXT_PUBLIC_ALGOD_NODE_URL=https://testnet-api.algonode.cloud
NEXT_PUBLIC_ALGOD_TOKEN=
NEXT_PUBLIC_USDC_ASA_ID=10458941
NEXT_PUBLIC_FACILITATOR_ADDRESS=PT6VVN7OZ3TVISZ6C6AMQKS2LFLKPI5FFY5L5WCMZO4WKCIZL735ZNUWXU
X402_NETWORK=algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
`

---

## Local Development Setup

### 1. Clone the Repository
`ash
git clone https://github.com/pranavk-7117/SecAgentHub.git
cd SecAgentHub
`

### 2. Backend Setup
`ash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
pip install pytest checkov

# Run unit tests
pytest tests/ -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
`

### 3. Frontend Setup
`ash
cd ../frontend
npm install
npm run dev
`
Open http://localhost:3000 to interact with the application.

---

## Technical Stack

- **Backend Framework:** FastAPI, Python 3.11
- **IaC Analysis:** python-hcl2, Checkov, NetworkX
- **Database & Auth:** PostgreSQL, Supabase Auth with Row-Level Security
- **Frontend Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling & Components:** Tailwind CSS, Lucide React, Radix UI
- **Graph Visualizations:** React Flow / @xyflow/react
- **Blockchain & Micropayments:** Algorand (py-algorand-sdk, @perawallet/connect, @x402-avm/fetch, GoPlausible Facilitator)
- **AI Engine:** Groq LLM Inference (Llama 3 70B)
- **Reporting:** ReportLab PDF Engine

---

## License

This project is released under the MIT License.
