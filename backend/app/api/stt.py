from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import TranscribeResponse
from app.services import conversation_service, gemini_service, whisper_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stt", tags=["stt"])

MAX_AUDIO_BYTES = 8 * 1024 * 1024  # 8MB cap


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio_file: UploadFile = File(...),
    session_id: Optional[uuid.UUID] = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TranscribeResponse:
    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio file too large")

    # Use original filename suffix when possible
    filename = audio_file.filename or "audio.webm"
    suffix = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".webm"

    original_text = whisper_service.transcribe_bytes(audio_bytes, suffix=suffix)
    if not original_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="음성을 인식하지 못했습니다. 조금 더 또렷하게 다시 말해볼까요?",
        )

    # Build recent context if session is provided
    recent_context: list[dict] = []
    if session_id is not None:
        session = conversation_service.get_session_for_user(db, user, session_id)
        if session:
            messages = conversation_service.list_messages(db, session.id)
            recent_context = [{"role": m.role, "content": m.content} for m in messages[-4:]]

    corrected_text = gemini_service.correct_stt_text(original_text, recent_context)

    return TranscribeResponse(original_text=original_text, corrected_text=corrected_text or original_text)
