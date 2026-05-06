"""Reserved for future LLM-related debug endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.get("/ping")
def ping() -> dict:
    return {"ok": True}
