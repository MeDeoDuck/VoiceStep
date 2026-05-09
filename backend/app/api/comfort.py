from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import comfort_service

router = APIRouter(prefix="/api/comfort", tags=["comfort"])


class ComfortMessageResponse(BaseModel):
    message: str


@router.get("/message", response_model=ComfortMessageResponse)
def get_comfort_message() -> ComfortMessageResponse:
    """
    위로의 메시지를 반환합니다.
    인증이 필요하지 않습니다.
    """
    message = comfort_service.get_random_message()
    return ComfortMessageResponse(message=message)
