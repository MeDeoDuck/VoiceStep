from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import (
    CreateSessionRequest,
    CreateSessionResponse,
    MessageOut,
    ReplyRequest,
    ReplyResponse,
    SessionDetailOut,
)
from app.services import conversation_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=CreateSessionResponse)
def create_session(
    body: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreateSessionResponse:
    session = conversation_service.create_session(db, user, body.scenario_type, body.job)
    messages = conversation_service.list_messages(db, session.id)
    first_ai = next((m for m in messages if m.role == "ai"), None)
    return CreateSessionResponse(
        session_id=session.id,
        scenario_type=session.scenario_type,  # type: ignore[arg-type]
        status=session.status,  # type: ignore[arg-type]
        first_ai_message=first_ai.content if first_ai else "",
    )


@router.get("/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    session = conversation_service.get_session_for_user(db, user, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    messages = conversation_service.list_messages(db, session.id)
    return SessionDetailOut(
        id=session.id,
        scenario_type=session.scenario_type,  # type: ignore[arg-type]
        status=session.status,  # type: ignore[arg-type]
        turn_count=session.turn_count,
        messages=[MessageOut.model_validate(m) for m in messages],
    )


@router.post("/{session_id}/reply", response_model=ReplyResponse)
def post_reply(
    session_id: uuid.UUID,
    body: ReplyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReplyResponse:
    session = conversation_service.get_session_for_user(db, user, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active")

    result = conversation_service.submit_user_reply(
        db=db,
        user=user,
        session=session,
        original_stt_text=body.original_stt_text,
        corrected_text=body.corrected_text,
    )
    return ReplyResponse(**result)
