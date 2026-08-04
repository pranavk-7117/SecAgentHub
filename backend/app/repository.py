import json
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings
from app.models import AgentExecutionRecord, ScanRecord


class Repository(Protocol):
    def create_scan(self, scan: ScanRecord) -> ScanRecord: ...
    def get_scan(self, scan_id: str) -> ScanRecord | None: ...
    def list_scans(self) -> list[ScanRecord]: ...
    def save_execution(self, execution: AgentExecutionRecord) -> AgentExecutionRecord: ...
    def get_executions(self, scan_id: str) -> list[AgentExecutionRecord]: ...
    def has_paid(self, scan_id: str, agent_id: str) -> bool: ...
    def tx_used(self, tx_hash: str) -> bool: ...


class InMemoryRepository:
    """Local-dev persistence backed by disk. Swap this layer for Supabase in production."""

    def __init__(self) -> None:
        self.scans: dict[str, ScanRecord] = {}
        self.executions: dict[str, AgentExecutionRecord] = {}
        self.used_tx_hashes: set[str] = set()
        self.storage_path = Path(__file__).resolve().parents[1] / "data" / "store.json"
        self._load()

    def _load(self) -> None:
        if not self.storage_path.exists():
            return
        try:
            payload = json.loads(self.storage_path.read_text(encoding="utf-8"))
            self.scans = {row["id"]: ScanRecord(**row) for row in payload.get("scans", [])}
            self.executions = {row["id"]: AgentExecutionRecord(**row) for row in payload.get("executions", [])}
            self.used_tx_hashes = set(payload.get("used_tx_hashes", []))
        except Exception:
            self.scans = {}
            self.executions = {}
            self.used_tx_hashes = set()

    def _persist(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "scans": [row.model_dump(mode="json") for row in self.scans.values()],
            "executions": [row.model_dump(mode="json") for row in self.executions.values()],
            "used_tx_hashes": sorted(self.used_tx_hashes),
        }
        self.storage_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def create_scan(self, scan: ScanRecord) -> ScanRecord:
        self.scans[scan.id] = scan
        self._persist()
        return scan

    def get_scan(self, scan_id: str) -> ScanRecord | None:
        return self.scans.get(scan_id)

    def list_scans(self) -> list[ScanRecord]:
        return sorted(self.scans.values(), key=lambda row: row.created_at, reverse=True)

    def save_execution(self, execution: AgentExecutionRecord) -> AgentExecutionRecord:
        self.executions[execution.id] = execution
        if execution.tx_hash:
            self.used_tx_hashes.add(execution.tx_hash)
        self._persist()
        return execution

    def get_executions(self, scan_id: str) -> list[AgentExecutionRecord]:
        return [item for item in self.executions.values() if item.scan_id == scan_id]

    def has_paid(self, scan_id: str, agent_id: str) -> bool:
        return any(
            row.scan_id == scan_id and row.agent_id == agent_id and row.status in {"verified", "executed"}
            for row in self.executions.values()
        )

    def tx_used(self, tx_hash: str) -> bool:
        return tx_hash in self.used_tx_hashes

class PostgresRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._init_db()

    def _connect(self):
        import psycopg
        from psycopg.rows import dict_row

        return psycopg.connect(self.database_url, row_factory=dict_row)

    def _init_db(self) -> None:
        sql = """
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS scans (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id),
          filename TEXT NOT NULL,
          raw_hcl TEXT NOT NULL,
          parsed_hcl_json JSONB DEFAULT '{}'::jsonb,
          raw_checkov_json JSONB,
          graph_json JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS agent_executions (
          id UUID PRIMARY KEY,
          scan_id UUID REFERENCES scans(id),
          agent_id TEXT NOT NULL,
          tx_hash TEXT NOT NULL UNIQUE,
          amount_paid NUMERIC NOT NULL,
          pay_to_address TEXT NOT NULL,
          challenge_nonce TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          output_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY,
          scan_id UUID REFERENCES scans(id),
          pdf_storage_path TEXT NOT NULL,
          generated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_agent_executions_scan_id ON agent_executions(scan_id);
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)


    def create_scan(self, scan: ScanRecord) -> ScanRecord:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO scans (id, user_id, filename, raw_hcl, parsed_hcl_json, raw_checkov_json, graph_json, created_at)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s)
                    """,
                    (
                        scan.id,
                        scan.user_id,
                        scan.filename,
                        scan.raw_hcl,
                        json.dumps(scan.parsed),
                        json.dumps(scan.raw_checkov_json),
                        json.dumps(scan.graph),
                        scan.created_at,
                    ),
                )
        return scan

    def get_scan(self, scan_id: str) -> ScanRecord | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM scans WHERE id = %s", (scan_id,))
                row = cur.fetchone()
        return _scan_from_row(row) if row else None

    def list_scans(self) -> list[ScanRecord]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM scans ORDER BY created_at DESC LIMIT 100")
                rows = cur.fetchall()
        return [_scan_from_row(row) for row in rows]

    def save_execution(self, execution: AgentExecutionRecord) -> AgentExecutionRecord:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO agent_executions
                      (id, scan_id, agent_id, tx_hash, amount_paid, pay_to_address, challenge_nonce, status, output_data, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (tx_hash) DO UPDATE SET status = EXCLUDED.status, output_data = EXCLUDED.output_data
                    """,
                    (
                        execution.id,
                        execution.scan_id,
                        execution.agent_id,
                        execution.tx_hash,
                        execution.amount_paid,
                        execution.pay_to_address,
                        execution.challenge_nonce,
                        execution.status,
                        json.dumps(execution.output_data) if execution.output_data is not None else None,
                        execution.created_at,
                    ),
                )
        return execution

    def get_executions(self, scan_id: str) -> list[AgentExecutionRecord]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM agent_executions WHERE scan_id = %s ORDER BY created_at", (scan_id,))
                rows = cur.fetchall()
        return [_execution_from_row(row) for row in rows]

    def has_paid(self, scan_id: str, agent_id: str) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1 FROM agent_executions
                    WHERE scan_id = %s AND agent_id = %s AND status IN ('verified', 'executed')
                    LIMIT 1
                    """,
                    (scan_id, agent_id),
                )
                return cur.fetchone() is not None

    def tx_used(self, tx_hash: str) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM agent_executions WHERE tx_hash = %s LIMIT 1", (tx_hash,))
                return cur.fetchone() is not None


def _scan_from_row(row: dict) -> ScanRecord:
    return ScanRecord(
        id=str(row["id"]),
        user_id=str(row["user_id"]) if row.get("user_id") else None,
        filename=row["filename"],
        raw_hcl=row["raw_hcl"],
        parsed=row.get("parsed_hcl_json") or {},
        raw_checkov_json=row.get("raw_checkov_json") or {},
        graph=row.get("graph_json") or {},
        created_at=row["created_at"],
    )


def _execution_from_row(row: dict) -> AgentExecutionRecord:
    return AgentExecutionRecord(
        id=str(row["id"]),
        scan_id=str(row["scan_id"]),
        agent_id=row["agent_id"],
        tx_hash=row["tx_hash"],
        amount_paid=int(row["amount_paid"]),
        pay_to_address=row["pay_to_address"],
        challenge_nonce=row["challenge_nonce"],
        status=row["status"],
        output_data=row.get("output_data"),
        created_at=row["created_at"],
    )


def build_repository() -> Repository:
    settings = get_settings()
    if settings.database_url:
        return PostgresRepository(settings.database_url)
    return InMemoryRepository()


repository = build_repository()
