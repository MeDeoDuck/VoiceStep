from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth as auth_router
from app.api import llm as llm_router
from app.api import reports as reports_router
from app.api import sessions as sessions_router
from app.api import stt as stt_router
from app.core.config import get_settings
from app.db.database import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database tables ensured.")
    except Exception as exc:  # noqa: BLE001
        logger.exception("init_db failed: %s", exc)
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{path:path}", include_in_schema=False)
async def preflight_handler(path: str):
    return {}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


@app.get("/")
@app.head("/")
def root() -> dict:
    return {"service": settings.APP_NAME, "docs": "/docs"}


app.include_router(auth_router.router)
app.include_router(sessions_router.router)
app.include_router(stt_router.router)
app.include_router(reports_router.router)
app.include_router(llm_router.router)
