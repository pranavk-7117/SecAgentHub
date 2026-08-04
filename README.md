# SecAgent Hub

SecAgent Hub is a full-stack demo of an AI Security Agent Marketplace for Terraform security scans. Developers upload `.tf` files, choose specialized agents, satisfy an HTTP `402 Payment Required` challenge, then review findings, attack paths, AI remediation guidance, receipts, and a PDF report.

## Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Lucide icons, React Flow.
- Backend: FastAPI, `python-hcl2`, `networkx`, Checkov integration with fallback scanner, Groq integration with local fallback, Algorand x402-style verification.
- Persistence: Local in-memory repository for bootstrapping, plus Supabase PostgreSQL schema and RLS policies in `backend/schema.sql`.
- Local dev: Docker Compose with Postgres, backend, and frontend.

## Run Locally

```bash
docker-compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/api/v1/health

For a quick scan, upload `examples/insecure-main.tf`.

Compose boots Postgres with `backend/schema.sql` and runs the backend with:

```text
DATABASE_URL=postgresql://secagent:secagent@postgres:5432/secagent
```

If `DATABASE_URL` is omitted, the backend falls back to in-memory storage for quick isolated tests.

## Deploy

Recommended production split:

- Backend: Render web service from `render.yaml`.
- Frontend: Vercel project with root directory `frontend`.

Backend environment variables on Render:

```text
ALGORAND_NETWORK=testnet
ALLOW_MOCK_PAYMENTS=false
ALGOD_NODE_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
INDEXER_URL=https://testnet-idx.algonode.cloud
USDC_ASA_ID=<testnet USDC ASA id>
FACILITATOR_ADDRESS=<Algorand Testnet receiving address>
GROQ_API_KEY=<Groq API key>
DATABASE_URL=<Postgres/Supabase connection string, optional for demo>
INTERNAL_API_SECRET=<same random secret used by Vercel>
```

Frontend environment variables on Vercel:

```text
NEXT_PUBLIC_API_BASE_URL=<Render backend URL>
BACKEND_API_BASE=<Render backend URL>
INTERNAL_API_SECRET=<same random secret used by Render>
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
X402_NETWORK=algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
NEXT_PUBLIC_ALGOD_NODE_URL=https://testnet-api.algonode.cloud
NEXT_PUBLIC_ALGOD_TOKEN=
NEXT_PUBLIC_USDC_ASA_ID=<testnet USDC ASA id>
NEXT_PUBLIC_FACILITATOR_ADDRESS=<Algorand Testnet receiving address>
```

Keep `backend/.env` and `frontend/.env.local` private. They are ignored by Git.

## Environment

Copy the examples before configuring real services:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Backend variables:

- `ALGORAND_NETWORK=testnet`
- `ALGOD_NODE_URL`
- `ALGOD_TOKEN`
- `INDEXER_URL`
- `USDC_ASA_ID`
- `FACILITATOR_ADDRESS`
- `FACILITATOR_MNEMONIC`
- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOW_MOCK_PAYMENTS=true`

Frontend variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ALGORAND_NETWORK=testnet`

## Payment Flow

The backend returns `402` for unpaid agent execution requests. The response lists only unpaid agents with:

- `agent`
- `price_in_microalgos`
- `pay_to_address`
- `challenge`

For local development, `ALLOW_MOCK_PAYMENTS=true` accepts transaction IDs beginning with `mock-`. The frontend payment modal currently uses that path so the demo can run without wallet setup.

For a real Algorand Testnet cycle:

1. Set `ALLOW_MOCK_PAYMENTS=false`.
2. Configure `INDEXER_URL`, `USDC_ASA_ID`, and `FACILITATOR_ADDRESS`.
3. Fund a Testnet wallet with ALGO from the Algorand dispenser.
4. Opt into the Testnet USDC ASA used by your demo facilitator.
5. Send an asset transfer to `FACILITATOR_ADDRESS` for at least the requested amount.
6. Include the exact `challenge` string in the transaction note.
7. Retry `POST /api/v1/agents/execute` with `Authorization: x402 <tx_id>`.

## API Highlights

- `POST /api/v1/scan/upload`: uploads a Terraform file, parses HCL, runs Checkov or fallback checks, returns scan summary and agents.
- `POST /api/v1/agents/execute`: requires per-agent x402 payment before executing selected agents.
- `GET /api/v1/graph/{file_id}`: returns React Flow nodes and edges.
- `POST /api/v1/ai/chat`: asks questions about a scan.
- `GET /api/v1/scan/{scan_id}`: rehydrates dashboard state.
- `GET /api/v1/scan/{scan_id}/report`: downloads a PDF report.
- `GET /api/v1/health`: liveness and integration configuration status.

## Supabase

Apply `backend/schema.sql` in Supabase SQL editor. It creates `users`, `scans`, `agent_executions`, and `reports`, enables RLS on scan-owned tables, and adds ownership policies tied to `auth.uid()`.

The backend uses PostgreSQL/Supabase persistence when `DATABASE_URL` is set. The Compose setup points it at the local Postgres service; production Supabase can use its pooled Postgres connection string.

## Real Wallet Payment

Set these frontend variables to enable real Pera Wallet TestNet signing instead of the local mock fallback:

```text
NEXT_PUBLIC_ALGOD_NODE_URL=
NEXT_PUBLIC_ALGOD_TOKEN=
NEXT_PUBLIC_USDC_ASA_ID=
NEXT_PUBLIC_FACILITATOR_ADDRESS=
```

Set these backend variables to verify the submitted transaction hash through the Algorand Indexer:

```text
ALLOW_MOCK_PAYMENTS=false
INDEXER_URL=
USDC_ASA_ID=
FACILITATOR_ADDRESS=
```

The wallet transfer must be an ASA transfer to `FACILITATOR_ADDRESS`, for at least the quoted amount, with the exact challenge in the note field.
