from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from app.core.config import get_settings
from app.services.prompt_loader import load_conversation_prompt, load_report_prompt

logger = logging.getLogger(__name__)

_FALLBACK_REPORT_INTERVIEW = {
    "title": "면접 상황 연습 결과",
    "total_score": 70,
    "summary": "대화가 완료되었지만 자동 보고서 생성 중 일부 문제가 발생했습니다. 전체 대화 기록을 바탕으로 다시 연습해보는 것을 추천합니다.",
    "scores": {
        "clarity": 14,
        "specificity": 13,
        "confidence": 14,
        "relevance": 15,
        "improvement_potential": 14,
    },
    "strengths": ["대화를 끝까지 완료했습니다."],
    "weaknesses": ["상세 분석을 다시 생성해야 합니다."],
    "recommendations": ["같은 상황으로 한 번 더 연습해보세요."],
    "next_practice": "답변을 조금 더 구체적으로 말하는 연습을 추천합니다.",
}

_FALLBACK_REPORT_WORK = {
    "title": "업무 상황 연습 결과",
    "total_score": 70,
    "summary": "대화가 완료되었지만 자동 보고서 생성 중 일부 문제가 발생했습니다. 전체 대화 기록을 바탕으로 다시 연습해보는 것을 추천합니다.",
    "scores": {
        "clarity": 14,
        "politeness": 14,
        "problem_solving": 13,
        "context_awareness": 14,
        "actionability": 15,
    },
    "strengths": ["대화를 끝까지 완료했습니다."],
    "weaknesses": ["상세 분석을 다시 생성해야 합니다."],
    "recommendations": ["같은 상황으로 한 번 더 연습해보세요."],
    "next_practice": "업무 상황을 좀 더 구체적으로 표현하는 연습을 추천합니다.",
}


def _get_model():
    """Return a configured GenerativeModel or None if API key not set."""
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured; Gemini calls will use fallbacks.")
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        client = genai.GenerativeModel(settings.GEMINI_MODEL)
        return client
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to load Gemini model: %s", exc)
        return None


def _generate_text(prompt: str, max_chars: int = 2000) -> Optional[str]:
    client = _get_model()
    if client is None:
        return None
    try:
        response = client.generate_content(prompt)
        text = (response.text or "").strip()
        return text[:max_chars] if text else None
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gemini generate_content failed: %s", exc)
        return None


def get_first_question(scenario_type: str, job: Optional[str] = None) -> str:
    prompt = load_conversation_prompt(scenario_type)
    return (prompt.get("first_question") or "").strip()


def generate_next_question(
    scenario_type: str,
    recent_messages: list[dict[str, str]],
    user_answer: str,
    job: Optional[str] = None,
) -> str:
    prompt = load_conversation_prompt(scenario_type)
    system = prompt.get("system", "")
    rules = prompt.get("rules", []) or []
    few_shots = prompt.get("few_shots", []) or []
    fallback_q = (prompt.get("fallback_question") or "방금 답변에서 한 가지를 더 자세히 말해주시겠어요?").strip()

    rules_block = "\n".join(f"- {r}" for r in rules)

    history_block_lines = []
    for m in recent_messages[-6:]:
        role = "면접관" if m.get("role") == "ai" else "사용자"
        history_block_lines.append(f"{role}: {m.get('content', '').strip()}")
    history_block = "\n".join(history_block_lines)

    # Filter few-shots by job if available
    filtered_few_shots = few_shots
    if job:
        filtered_few_shots = [fs for fs in few_shots if fs.get("job") == job or not fs.get("job")]

    few_shots_block = "\n\n".join(
        f"[예시 답변]\n{(fs.get('user_answer') or '').strip()}\n[다음 질문]\n{(fs.get('next_question') or '').strip()}"
        for fs in filtered_few_shots[:2]
    )

    job_block = f"[지원 직무]\n{job}\n\n" if job else ""

    final_prompt = (
        f"{system.strip()}\n\n"
        f"{job_block}"
        f"[규칙]\n{rules_block}\n\n"
        f"[예시]\n{few_shots_block}\n\n"
        f"[최근 대화]\n{history_block}\n\n"
        f"[사용자의 마지막 답변]\n{user_answer.strip()}\n\n"
        f"위 대화에 자연스럽게 이어지는 다음 질문 한 개만 출력하세요. 다른 설명 없이 질문만 출력하세요."
    )

    text = _generate_text(final_prompt, max_chars=600)
    if not text:
        return fallback_q
    # Strip surrounding quotes if any
    return text.strip().strip('"').strip()


def correct_stt_text(stt_text: str, recent_context: list[dict[str, str]]) -> str:
    text = (stt_text or "").strip()
    if not text:
        return text

    recent = "\n".join(
        f"{'AI' if m.get('role') == 'ai' else '사용자'}: {m.get('content', '').strip()}"
        for m in recent_context[-4:]
    )

    prompt = (
        "다음 문장은 음성 인식 결과입니다.\n"
        "기존 의미와 말투를 유지하면서, 명백한 오타와 잘못 인식된 단어, 띄어쓰기만 최소한으로 수정하세요.\n"
        "문장을 더 좋게 만들거나 새로운 내용을 추가하지 마세요.\n"
        "수정된 문장만 출력하고, 따옴표나 설명을 붙이지 마세요.\n\n"
        f"[기존 대화 맥락]\n{recent if recent else '(없음)'}\n\n"
        f"[음성 인식 결과]\n{text}\n"
    )

    corrected = _generate_text(prompt, max_chars=1500)
    if not corrected:
        return text
    corrected = corrected.strip().strip('"').strip("'")
    return corrected or text


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    if not text:
        return None
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Try to extract first {...} block
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def generate_report(scenario_type: str, messages: list[dict[str, str]]) -> dict[str, Any]:
    prompt_data = load_report_prompt(scenario_type)
    system = prompt_data.get("system", "")
    grading = prompt_data.get("grading_criteria", {}) or {}
    score_rule = prompt_data.get("score_rule", "")
    output_format = prompt_data.get("output_format", "")
    few_shots = prompt_data.get("few_shots", []) or []

    grading_block = "\n".join(f"- {k}: {v}" for k, v in grading.items())
    few_shots_block = "\n\n".join(
        f"[대화 요약]\n{(fs.get('conversation_summary') or '').strip()}\n[보고서]\n{(fs.get('report') or '').strip()}"
        for fs in few_shots[:1]
    )

    transcript_lines = []
    for m in messages:
        role = "AI" if m.get("role") == "ai" else "사용자"
        transcript_lines.append(f"{role}: {m.get('content', '').strip()}")
    transcript = "\n".join(transcript_lines)

    final_prompt = (
        f"{system.strip()}\n\n"
        f"[채점 기준]\n{grading_block}\n\n"
        f"[채점 규칙]\n{score_rule.strip()}\n\n"
        f"[보고서 JSON 형식]\n{output_format.strip()}\n\n"
        f"[참고 예시]\n{few_shots_block}\n\n"
        f"[전체 대화 기록]\n{transcript}\n\n"
        f"위 대화 기록을 바탕으로 보고서 JSON 객체 한 개만 출력하세요. 마크다운이나 설명 없이 JSON만 출력하세요."
    )

    text = _generate_text(final_prompt, max_chars=4000)
    parsed = _extract_json(text or "")
    if parsed and isinstance(parsed, dict):
        # Compute total_score if missing or zero
        if not parsed.get("total_score"):
            scores = parsed.get("scores") or {}
            try:
                parsed["total_score"] = sum(int(v) for v in scores.values())
            except Exception:  # noqa: BLE001
                parsed["total_score"] = 0
        return parsed

    logger.warning("Falling back to default report (Gemini parsing failed).")
    return _FALLBACK_REPORT_INTERVIEW.copy() if scenario_type == "interview" else _FALLBACK_REPORT_WORK.copy()
