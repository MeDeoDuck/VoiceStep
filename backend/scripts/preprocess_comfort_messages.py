"""
위로글 데이터셋 전처리 스크립트

xlsx 파일에서 위로 메시지를 추출하고 필터링:
- 최소 글자수 제한 (10글자 이상)
- 개인정보 제거 (전화번호, 이메일, 마스킹된 ID)
- 특수문자 정규화
- 중복 제거
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

MIN_LENGTH = 10
MAX_LENGTH = 100


def _remove_personal_info(text: str) -> str:
    """개인정보 패턴 제거"""
    # 마스킹된 ID (0plm****, lgy3**** 등)
    text = re.sub(r"[a-z0-9]+\*{2,}", "", text)
    # 전화번호
    text = re.sub(r"\d{2,4}-?\d{3,4}-?\d{4}", "", text)
    # 이메일
    text = re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "", text)
    return text


def _normalize_whitespace(text: str) -> str:
    """공백 정규화: 여러 줄바꿈을 하나로, 앞뒤 공백 제거"""
    text = re.sub(r"\n\n+", "\n", text)
    text = re.sub(r" +", " ", text)
    return text.strip()


def _is_valid_message(text: str) -> bool:
    """메시지 유효성 검사"""
    if not text:
        return False
    if len(text) < MIN_LENGTH or len(text) > MAX_LENGTH:
        return False
    if text.count("\n") > 50:  # 줄바꿈이 너무 많음
        return False
    return True


def preprocess_xlsx() -> list[str]:
    """xlsx에서 위로 메시지 추출 및 필터링"""
    if not HAS_OPENPYXL:
        logger.error("openpyxl not installed")
        return []

    xlsx_path = Path(__file__).parent.parent.parent / "data" / "위로글.xlsx"
    if not xlsx_path.exists():
        logger.error(f"위로글.xlsx not found at {xlsx_path}")
        return []

    messages = set()
    try:
        wb = openpyxl.load_workbook(str(xlsx_path), read_only=True, data_only=True)
        ws = wb.active

        for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not row[1]:  # 행이 비었거나 열2(본문)가 비었음
                continue

            text = row[1]
            if not isinstance(text, str):
                continue

            # 전처리
            text = _remove_personal_info(text)
            text = _normalize_whitespace(text)

            if _is_valid_message(text):
                messages.add(text)
            else:
                logger.debug(f"Row {idx} filtered out (length: {len(text)})")

        wb.close()
        logger.info(f"Extracted {len(messages)} unique messages after filtering")
        return sorted(messages)

    except Exception as exc:
        logger.exception(f"Failed to preprocess xlsx: {exc}")
        return []


def save_to_json(messages: list[str], output_path: Path) -> None:
    """JSON 파일로 저장"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved {len(messages)} messages to {output_path}")


def create_fewshot_examples(messages: list[str], output_path: Path, n_examples: int = 10) -> None:
    """few-shot용 예시 10개 랜덤 선택"""
    import random
    random.seed(42)
    selected = random.sample(messages, min(n_examples, len(messages)))
    save_to_json(selected, output_path)


if __name__ == "__main__":
    messages = preprocess_xlsx()
    if messages:
        data_dir = Path(__file__).parent.parent.parent / "data"

        save_to_json(messages, data_dir / "comfort_messages.json")
        print(f"Created: {len(messages)} messages")

        create_fewshot_examples(messages, data_dir / "comfort_messages_fewshot.json", n_examples=10)
        print("Created: comfort_messages_fewshot.json (10 examples)")
    else:
        print("No messages extracted")
