from __future__ import annotations

import json
import logging
import random
from pathlib import Path

logger = logging.getLogger(__name__)

_COMFORT_MESSAGES: list[str] = []
_LOADED = False

_FALLBACK_MESSAGES = [
    "잘 하고 있어요. 연습이 쌓이면 반드시 나아집니다.",
    "처음부터 완벽한 사람은 없습니다. 한 번 더 시도해보세요.",
    "당신의 노력이 분명히 도움이 될 거예요.",
    "어려운 상황이지만 차근차근 진행해보세요.",
    "오늘도 좋은 연습이 되었어요. 계속 응원합니다.",
]


def _load_messages_from_json() -> list[str]:
    """전처리된 JSON 파일에서 위로 메시지를 로드합니다. 실패 시 빈 리스트 반환."""
    json_path = Path(__file__).parent.parent.parent.parent / "data" / "comfort_messages.json"
    if not json_path.exists():
        logger.warning(f"comfort_messages.json not found at {json_path}")
        return []

    try:
        with open(json_path, encoding="utf-8") as f:
            messages = json.load(f)
        logger.info(f"Loaded {len(messages)} comfort messages from JSON")
        return messages
    except Exception as exc:  # noqa: BLE001
        logger.exception(f"Failed to load comfort messages from JSON: {exc}")
        return []


def _ensure_loaded() -> None:
    """메시지가 로드되지 않았으면 로드합니다."""
    global _COMFORT_MESSAGES, _LOADED
    if _LOADED:
        return

    _COMFORT_MESSAGES = _load_messages_from_json()
    if not _COMFORT_MESSAGES:
        _COMFORT_MESSAGES = _FALLBACK_MESSAGES.copy()
        logger.info("Using fallback comfort messages")

    _LOADED = True


def get_random_message() -> str:
    """랜덤 위로 메시지를 반환합니다."""
    _ensure_loaded()
    if _COMFORT_MESSAGES:
        return random.choice(_COMFORT_MESSAGES)
    return _FALLBACK_MESSAGES[0]
