from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ScenarioType = Literal["interview", "work", "presentation", "meeting", "customer"]
SessionStatus = Literal["active", "completed", "cancelled"]
MessageRole = Literal["ai", "user", "system"]


class AuthSyncRequest(BaseModel):
    email: Optional[str] = None
    display_name: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    firebase_uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None


class CreateSessionRequest(BaseModel):
    scenario_type: ScenarioType
    job: Optional[str] = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: MessageRole
    content: str
    original_stt_text: Optional[str] = None
    corrected_text: Optional[str] = None
    turn_index: int


class CreateSessionResponse(BaseModel):
    session_id: uuid.UUID
    scenario_type: ScenarioType
    status: SessionStatus
    first_ai_message: str


class SessionDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_type: ScenarioType
    status: SessionStatus
    turn_count: int
    messages: list[MessageOut] = Field(default_factory=list)


class TranscribeResponse(BaseModel):
    original_text: str
    corrected_text: str


class ReplyRequest(BaseModel):
    original_stt_text: str
    corrected_text: str


class ReplyAiMessage(BaseModel):
    role: MessageRole
    content: str
    turn_index: int


class ReplyResponse(BaseModel):
    session_id: uuid.UUID
    turn_count: int
    is_completed: bool
    ai_message: ReplyAiMessage
    report_id: Optional[uuid.UUID] = None


class ReportListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_type: ScenarioType
    job: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    total_score: Optional[int] = None
    created_at: datetime


class ReportDetail(BaseModel):
    id: uuid.UUID
    scenario_type: ScenarioType
    job: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    total_score: Optional[int] = None
    report_json: dict[str, Any]
    messages: list[MessageOut]
    created_at: datetime
