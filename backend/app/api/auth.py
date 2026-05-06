from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_token_payload
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import AuthSyncRequest, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/sync", response_model=UserOut)
def sync_user(
    payload: AuthSyncRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
) -> UserOut:
    """Create or update the user record from a verified Firebase token."""
    firebase_uid = token.get("uid")
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        user = User(
            firebase_uid=firebase_uid,
            email=payload.email or token.get("email"),
            display_name=payload.display_name or token.get("name"),
        )
        db.add(user)
    else:
        if payload.email:
            user.email = payload.email
        if payload.display_name:
            user.display_name = payload.display_name
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return current_user
