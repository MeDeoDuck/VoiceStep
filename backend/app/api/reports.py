from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User, Report
from app.db.schemas import MessageOut, ReportDetail, ReportListItem
from app.services import conversation_service, report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportStatsResponse(BaseModel):
    total_count: int
    history: list[dict[str, Any]]
    avg_by_scenario: dict[str, float]
    category_avgs: dict[str, float]


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


@router.get("/stats/summary", response_model=ReportStatsResponse)
def get_report_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportStatsResponse:
    """사용자의 보고서 통계를 반환합니다."""
    reports = db.query(Report).filter(Report.user_id == user.id).order_by(Report.created_at).all()

    # 기본 수
    total_count = len(reports)

    # 날짜별 이력
    history = [
        {
            "date": r.created_at.strftime("%Y-%m-%d"),
            "score": r.total_score or 0,
            "scenario_type": r.scenario_type,
        }
        for r in reports
    ]

    # 시나리오별 평균
    scenario_scores: dict[str, list[int]] = {}
    for r in reports:
        if r.total_score:
            scenario_scores.setdefault(r.scenario_type, []).append(r.total_score)

    avg_by_scenario = {
        scenario: sum(scores) / len(scores) if scores else 0
        for scenario, scores in scenario_scores.items()
    }

    # 항목별 평균 (모든 보고서의 report_json.scores 병합)
    category_totals: dict[str, list[float]] = {}
    for r in reports:
        json_data = r.report_json or {}
        scores = json_data.get("scores") or {}
        for category, value in scores.items():
            if isinstance(value, (int, float)):
                category_totals.setdefault(category, []).append(float(value))

    category_avgs = {
        category: sum(values) / len(values) if values else 0
        for category, values in category_totals.items()
    }

    return ReportStatsResponse(
        total_count=total_count,
        history=history,
        avg_by_scenario=avg_by_scenario,
        category_avgs=category_avgs,
    )
