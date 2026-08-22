# SecAgent Hub

> **An AI Security Agent Marketplace for Cloud Infrastructure, powered by x402 micropayments on Algorand.**

SecAgent Hub enables developers to upload Infrastructure-as-Code (IaC) files and pay for specialist AI security agents on a per-analysis basis — no subscriptions, no seat licences. Every analysis is triggered by a unique on-chain payment challenge, verified against the Algorand blockchain before results are unlocked.

---

## 📸 Overview

```
Developer Login
      │
      ▼
Upload Terraform / IaC Files
      │
      ▼
Automatic Security Scan (HCL Parse + Policy Analysis)
      │
      ▼
Select AI Security Agents  ──▶  x402 Payment (Algorand USDC)
      │                                    │
      ▼                                    ▼
Agents Execute                  On-Chain Verification
      │
      ▼
Interactive Attack Graph + AI Report + PDF Download
```

---

## 🤖 AI Security Agents

| Agent | Capability | Price |
|---|---|---|
| 🛡️ **Misconfiguration Agent** | Surfaces exposed resources, open ports, missing encryption, hardcoded credentials | 0.25 USDC |
| 🔐 **IAM Risk Agent** | Detects wildcard permissions, privilege escalation paths, and least-privilege violations | 0.30 USDC |
| 📋 **Compliance Agent** | Scores infrastructure against CIS, NIST 800-53, PCI DSS, and HIPAA controls | 0.20 USDC |
| 🕸️ **Attack Path Agent** | Builds a graph-based attack topology — lateral movement paths, blast radius, critical assets | 0.35 USDC |
| 🤖 **AI Remediation Agent** | LLM-powered plain-English explanations + concrete Terraform code fixes | 0.50 USDC |

Each agent is independently invoked and independently paid. Users may combine any subset.

---

## 🚀 Key Features

- **Pay-Per-Analysis Model** — x402 HTTP 402 challenge/response payment flow; no subscription required
- **On-Chain Payment Verification** — Every agent run is gated by a confirmed Algorand USDC transaction with a unique embedded challenge note
- **Interactive Attack Graph** — React Flow visualisation of resource relationships and attack paths
- **AI Chat Interface** — Ask follow-up questions about any finding via Groq-powered LLM
- **PDF Audit Reports** — Downloadable full-page security report per scan
- **Dual-Network Support** — Automatic detection of TestNet vs. MainNet payments based on USDC ASA ID
- **Supabase Auth + RLS** — Row-level security ensures each user only accesses their own scans
- **Results Lock** — Agent reports are inaccessible until the corresponding payment is confirmed on-chain

---

## 🗂️ Repository Structure

```
SecAgentHub/
├── README.md
├── docker-compose.yml          # Local dev: Postgres + Backend + Frontend
├── render.yaml                 # Render deployment manifest (backend)
├── examples/
│   └── insecure-main.tf        # Sample Terraform file for testing
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── schema.sql              # Supabase PostgreSQL schema + RLS policies
│   ├── .env.example
│   └── app/
│       ├── main.py             # FastAPI routes and application entrypoint
│       ├── models.py           # Pydantic data models
│       ├── repository.py       # PostgreSQL persistence layer + migrations
│       ├── x402_middleware.py  # Payment challenge/verification logic (Algorand Indexer)
│       ├── core/               # Scan parsing (HCL2) and policy analysis engine
│       └── services/           # Agent runners (compliance, IAM, attack path, remediation)
│
└── frontend/
    ├── Dockerfile
    ├── .env.example
    ├── app/
    │   ├── page.tsx            # Landing page
    │   ├── login/page.tsx      # Auth (Supabase)
    │   ├── dashboard/page.tsx  # Scan history dashboard
    │   ├── scan/new/page.tsx   # File upload and scan creation
    │   ├── scan/[id]/
    │   │   ├── agents/page.tsx # Agent selection + x402 payment UI
    │   │   └── results/page.tsx# Attack graph, findings, AI chat, PDF
    │   └── api/                # Next.js API routes (backend proxy)
    ├── components/
    │   ├── Shell.tsx           # Authenticated layout shell + navigation
    │   ├── PaymentModal.tsx    # Pera Wallet x402 payment flow
    │   └── ui/                 # Shared design system components
    └── lib/
        ├── api.ts              # Backend API client
        ├── supabase.ts         # Supabase browser client
        └── x402Pera.ts         # Pera Wallet connect + transaction signing
```

---

## 💳 Payment Flow (x402)

```
1. User selects agents → POST /api/v1/agents/execute
2. Backend returns HTTP 402 with per-agent payment challenges:
   { agent, price_in_microalgos, pay_to_address, challenge }
3. Frontend opens Pera Wallet → user signs USDC ASA transfer
   (transaction note = challenge string)
4. Frontend retries POST with Authorization: x402 <tx_id>
5. Backend queries Algorand Indexer to verify:
   ✓ Correct receiver address
   ✓ Correct USDC ASA ID (TestNet or MainNet auto-detected)
   ✓ Amount ≥ quoted price
   ✓ Note field contains challenge
6. On-chain confirmation → agents execute → results unlocked
```

> **Local development:** Set `ALLOW_MOCK_PAYMENTS=true` to accept transaction IDs beginning with `mock-` without a live wallet. Set to `false` for real on-chain verification.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/scan/upload` | Upload a `.tf` file, parse HCL, run policy analysis, return scan + agents |
| `GET` | `/api/v1/scan/{id}` | Retrieve full scan state for dashboard hydration |
| `POST` | `/api/v1/agents/execute` | Execute selected agents (requires x402 payment per agent) |
| `GET` | `/api/v1/graph/{id}` | Return React Flow nodes and edges for the attack graph |
| `POST` | `/api/v1/ai/chat` | Send a question about a scan to the LLM |
| `GET` | `/api/v1/scan/{id}/report` | Download PDF audit report |
| `GET` | `/api/v1/scans` | List all scans for the authenticated user |
| `GET` | `/api/v1/health` | Liveness check + integration configuration status |

---

## 🗄️ Database Schema

Apply `backend/schema.sql` in the Supabase SQL editor. It creates:

| Table | Purpose |
|---|---|
| `users` | Maps Supabase auth UUIDs to internal user records |
| `scans` | Stores uploaded file metadata, parsed findings, and risk scores |
| `agent_executions` | Records per-agent run results, network (testnet/mainnet), and tx hash |
| `reports` | Stores generated PDF report references |

RLS policies ensure each row is only accessible by its owning `auth.uid()`.

---

## 🖥️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — REST API framework
- **[python-hcl2](https://github.com/amplify-education/python-hcl2)** — Terraform HCL parsing
- **[Checkov](https://www.checkov.io/)** — IaC policy scanning engine
- **[NetworkX](https://networkx.org/)** — Attack graph construction
- **[Groq](https://groq.com/)** — LLM inference (Llama 3) for remediation agent
- **[py-algorand-sdk](https://github.com/algorand/py-algorand-sdk)** — Algorand Indexer payment verification
- **[Supabase](https://supabase.com/)** — PostgreSQL + Auth + RLS
- **[ReportLab](https://www.reportlab.com/)** — PDF report generation

### Frontend
- **[Next.js 14](https://nextjs.org/)** (App Router) — React framework
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe client code
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling
- **[React Flow](https://reactflow.dev/)** — Interactive attack graph visualisation
- **[@perawallet/connect](https://github.com/perawallet/connect)** — Pera Wallet integration
- **[@x402-avm/fetch](https://github.com/coinbase/x402)** — x402 payment protocol client

---

## ⚙️ Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/lc215640-stack/SecAgentHub.git
cd SecAgentHub

# 2. Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start all services
docker-compose up --build
```

Services will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Health:** http://localhost:8000/api/v1/health

Upload `examples/insecure-main.tf` for a quick end-to-end demo.

---

## 🌐 Production Deployment

### Backend (Railway / Render)

```env
# Algorand
ALGORAND_NETWORK=testnet
ALGOD_NODE_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
INDEXER_URL=https://testnet-idx.algonode.cloud
USDC_ASA_ID=<Testnet USDC ASA ID>
FACILITATOR_ADDRESS=<Algorand receiving address>

# Payment
ALLOW_MOCK_PAYMENTS=false

# AI
GROQ_API_KEY=<Groq API key>

# Database
DATABASE_URL=<Supabase PostgreSQL connection string>

# Security
INTERNAL_API_SECRET=<shared secret with frontend>

# Auth
SUPABASE_URL=<your Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
```

### Frontend (Vercel)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>

# Backend
NEXT_PUBLIC_API_BASE_URL=<Railway/Render backend URL>
BACKEND_API_BASE=<Railway/Render backend URL>
INTERNAL_API_SECRET=<same shared secret as backend>

# Algorand / x402
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
NEXT_PUBLIC_ALGOD_NODE_URL=https://testnet-api.algonode.cloud
NEXT_PUBLIC_ALGOD_TOKEN=
NEXT_PUBLIC_USDC_ASA_ID=<Testnet USDC ASA ID>
NEXT_PUBLIC_FACILITATOR_ADDRESS=<Algorand receiving address>
X402_NETWORK=algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
```

---

## 🔗 Real Wallet Payment Setup (TestNet)

1. Install [Pera Wallet](https://perawallet.app/) on your mobile device
2. Switch to **TestNet** in Pera Wallet settings
3. Fund your wallet with TestNet ALGO from the [Algorand Testnet Dispenser](https://bank.testnet.algorand.network/)
4. Opt-in to the TestNet USDC ASA using its Asset ID
5. Set `ALLOW_MOCK_PAYMENTS=false` in the backend
6. Run a scan, select agents, and approve the Pera Wallet signing request

Each agent generates a unique challenge. The backend verifies the transaction note, receiver, asset ID, and amount against the Algorand Indexer before unlocking results.

---

## 📁 Example Terraform File

The repository includes `examples/insecure-main.tf` — a deliberately misconfigured Terraform file containing:
- A publicly accessible S3 bucket
- An overly permissive IAM role with wildcard actions
- A security group open to `0.0.0.0/0`
- An unencrypted RDS instance
- Missing CloudTrail logging

Use this file to test the full agent pipeline end-to-end without setting up real cloud infrastructure.

---

## 🔒 Security Notes

- Never commit `.env` or `.env.local` files — they are listed in `.gitignore`
- `INTERNAL_API_SECRET` is used to authenticate Next.js API route → backend proxy calls; keep it consistent across both deployments
- All scan data and agent results are scoped by Supabase `auth.uid()` via RLS — users cannot access each other's scans
- Payment verification is server-side only; the frontend never has access to the Algorand facilitator private key

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.
