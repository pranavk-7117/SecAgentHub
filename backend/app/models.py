from datetime import datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class AgentDefinition(BaseModel):
    id: str
    name: str
    description: str
    price_in_microalgos: int
    icon: str


class ScanRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str | None = None
    filename: str
    raw_hcl: str
    parsed: dict[str, Any] = Field(default_factory=dict)
    raw_checkov_json: dict[str, Any] = Field(default_factory=dict)
    graph: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentExecutionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    scan_id: str
    agent_id: str
    tx_hash: str
    amount_paid: int
    pay_to_address: str
    challenge_nonce: str
    status: str = "pending"
    output_data: dict[str, Any] | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UploadResponse(BaseModel):
    scan_id: str
    findings_summary: dict[str, Any]
    agents: list[AgentDefinition]


class AgentExecuteRequest(BaseModel):
    file_id: str
    agent_ids: list[str]


class X402SettledExecuteRequest(BaseModel):
    file_id: str
    agent_ids: list[str]
    tx_id: str
    payer: str | None = None
    network: str
    facilitator: str
    amount_paid: int
    payment_response: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    scan_id: str
    question: str


class ReactFlowNode(BaseModel):
    id: str
    type: str = "default"
    position: dict[str, float]
    data: dict[str, Any]


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None
