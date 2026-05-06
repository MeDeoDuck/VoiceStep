from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import MessageOut, ReportDetail, ReportListItem
from app.services import conversation_service, report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=list[ReportListItem])
def list_reports(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ReportListItem]:
    reports = report_service.list_reports_for_user(db, user)
    return [ReportListItem.model_validate(r) for r in reports]


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportDetail:
    report = report_service.get_report_for_user(db, user, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    messages = conversation_service.list_messages(db, report.session_id)
    return ReportDetail(
        id=report.id,
        scenario_type=report.scenario_type,  # type: ignore[arg-type]
        title=report.title,
        summary=report.summary,
        total_score=report.total_score,
        report_json=report.report_json or {},
        messages=[MessageOut.model_validate(m) for m in messages],
        created_at=report.created_at,
    )
