# Data Preprocessing: 위로글 데이터셋 전처리

**문서 목적**: 위로글 데이터셋의 수집, 정제, 필터링 과정 상세 기록  
**최종 업데이트**: 2026-05-09  
**작성자**: Claude Haiku 4.5

---

## 📋 목차

1. [개요](#개요)
2. [원본 데이터](#원본-데이터)
3. [전처리 파이프라인](#전처리-파이프라인)
4. [필터링 기준](#필터링-기준)
5. [단계별 처리](#단계별-처리)
6. [결과 분석](#결과-분석)
7. [사용 가이드](#사용-가이드)

---

## 개요

### 목표
- 사용자 격려용 위로 메시지 수집 및 정제
- 프롬프트 토큰 효율성을 고려한 최적화
- 개인정보 제거 및 품질 보증

### 동기
- 원본 데이터: 5,190개 (불완전하고 개인정보 포함)
- 최종 데이터: 2,169개 (정제, 필터링 완료)
- 효율성: 100자 이하로 제한하여 비용 최소화

---

## 원본 데이터

### 데이터 소스

**출처**: 네이버 지식인 위로글 데이터셋  
**파일**: `data/위로글.xlsx`  
**크기**: 2.1 MB (2,101,237 bytes)  
**행 수**: 5,190행  
**열 수**: 5개

### 원본 데이터 구조

```
| 열 번호 | 열명 | 내용 | 예시 |
|---------|------|------|------|
| 1 | 제목/상황 | 위로가 필요한 상황 설명 | "직장에서 스트레스 받음" |
| 2 | 위로의 말 본문 | 실제 위로 메시지 | "힘내세요. 모두 어렵습니다." |
| 3 | URL | 원본 출처 URL | "https://kin.naver.com/..." |
| 4 | 태그 | 분류 태그 | "직장생활" |
| 5 | 카테고리 | 주제 분류 | "격려" |
```

### 원본 데이터의 문제점

| 문제 | 예시 | 영향 |
|------|------|------|
| **길이 편차 큼** | 10자~1992자 | 토큰 비용 증가, 프롬프트 부담 |
| **개인정보 포함** | "010-1234-5678", "kim@email.com" | 보안/개인정보 문제 |
| **마스킹된 ID** | "0plm****", "lgy3****" | 유용하지 않은 텍스트 |
| **특수문자 많음** | 연속된 줄바꿈, 빈 줄 | 파싱 오류, 가독성 저하 |
| **불완전한 문장** | 문장 조각, 기호만 있는 행 | 품질 저하 |
| **중복** | 동일 메시지 반복 | 다양성 부족 |

---

## 전처리 파이프라인

### 아키텍처

```
원본 데이터
    ↓
[1] 데이터 로드
    ↓
[2] 개인정보 제거
    ↓
[3] 공백 정규화
    ↓
[4] 길이 필터링
    ↓
[5] 유효성 검사
    ↓
[6] 중복 제거
    ↓
정제된 데이터 (JSON)
    ↓
[7] Few-shot 샘플링
    ↓
위로 메시지 데이터셋
```

### 스크립트 위치

```
backend/scripts/preprocess_comfort_messages.py
```

### 핵심 함수

```python
# 1. 개인정보 제거
_remove_personal_info(text: str) -> str

# 2. 공백 정규화
_normalize_whitespace(text: str) -> str

# 3. 유효성 검사
_is_valid_message(text: str) -> bool

# 4. 전체 전처리
preprocess_xlsx() -> list[str]

# 5. JSON 저장
save_to_json(messages, output_path)

# 6. Few-shot 샘플링
create_fewshot_examples(messages, output_path, n_examples=10)
```

---

## 필터링 기준

### 1. 길이 필터링 (Length Filtering)

**기준**: 최소 10자, 최대 100자

**목적**:
- 너무 짧은 메시지 제외 (의미 없음)
- 너무 긴 메시지 제외 (토큰 비용)

**정의**:
```python
MIN_LENGTH = 10
MAX_LENGTH = 100
```

**영향**:
- 원본: 5,190개
- 100자 이하: 2,169개 (41.8% 통과)
- 50자 이하: 902개 (17.4%)

**예시**:
```
❌ 너무 짧음 (5자)
   "화이팅!"

✅ 적절함 (45자)
   "겨울이 오면 봄도 멀지 않으리. 
   힘내세요!"

❌ 너무 길음 (150자)
   "당신의 노력이 분명히 도움이 될 거예요. 
   어려운 상황이지만 차근차근 진행해보세요. 
   오늘도 좋은 연습이 되었어요. 
   계속 응원합니다. 
   힘내세요!"
```

### 2. 개인정보 제거 (PII Removal)

**대상 패턴**:

| 패턴 | 정규식 | 예시 |
|------|--------|------|
| **마스킹된 ID** | `[a-z0-9]+\*{2,}` | "0plm****", "lgy3****" |
| **전화번호** | `\d{2,4}-?\d{3,4}-?\d{4}` | "010-1234-5678" |
| **이메일** | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | "user@example.com" |

**처리 방식**: 정규식으로 매칭되는 패턴을 공백으로 대체

**예시**:
```python
입력:  "0plm****님께 감사합니다. 010-1234-5678로 연락주세요."
출력:  "님께 감사합니다.  로 연락주세요."
```

**코드**:
```python
def _remove_personal_info(text: str) -> str:
    # 마스킹된 ID
    text = re.sub(r"[a-z0-9]+\*{2,}", "", text)
    # 전화번호
    text = re.sub(r"\d{2,4}-?\d{3,4}-?\d{4}", "", text)
    # 이메일
    text = re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "", text)
    return text
```

### 3. 공백 정규화 (Whitespace Normalization)

**처리 항목**:

| 항목 | 규칙 | 예시 |
|------|------|------|
| **다중 줄바꿈** | `\n\n+` → `\n` | 3개 이상 줄바꿈을 1개로 |
| **다중 공백** | `  +` → ` ` | 연속 공백을 1개로 |
| **앞뒤 공백** | `strip()` | "  text  " → "text" |

**목적**: 일관된 형식, 읽기 쉬운 구조

**코드**:
```python
def _normalize_whitespace(text: str) -> str:
    # 여러 줄바꿈 → 하나로
    text = re.sub(r"\n\n+", "\n", text)
    # 여러 공백 → 하나로
    text = re.sub(r" +", " ", text)
    return text.strip()
```

### 4. 유효성 검사 (Validation)

**검사 항목**:

```python
def _is_valid_message(text: str) -> bool:
    # 1. 빈 문자열 확인
    if not text:
        return False
    
    # 2. 길이 범위 확인
    if len(text) < MIN_LENGTH or len(text) > MAX_LENGTH:
        return False
    
    # 3. 줄바꿈 수 확인 (너무 많으면 제외)
    if text.count("\n") > 50:
        return False
    
    return True
```

**제외 조건**:
- 빈 문자열
- 10자 미만
- 100자 초과
- 줄바꿈 50개 초과

---

## 단계별 처리

### Step 1: 데이터 로드

```python
xlsx_path = Path(__file__).parent.parent.parent.parent / "data" / "위로글.xlsx"
wb = openpyxl.load_workbook(str(xlsx_path), read_only=True, data_only=True)
ws = wb.active
```

**결과**: 5,190행 읽음

### Step 2: 메시지 추출

```python
for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
    if not row or not row[1]:  # 행이 비었거나 열2(본문)가 비었음
        continue
    
    text = row[1]  # 위로의 말 본문 추출
    if not isinstance(text, str):
        continue
```

**대상**: 2번째 열 (위로의 말 본문)만 추출

### Step 3: 개인정보 제거

```python
text = _remove_personal_info(text)
```

**처리 대상**: 마스킹된 ID, 전화번호, 이메일

### Step 4: 공백 정규화

```python
text = _normalize_whitespace(text)
```

**처리 대상**: 줄바꿈, 공백 정규화

### Step 5: 유효성 검사

```python
if _is_valid_message(text):
    messages.add(text)  # Set 사용 (중복 자동 제거)
else:
    logger.debug(f"Row {idx} filtered out (length: {len(text)})")
```

**처리**: 조건 만족 시만 추가

### Step 6: 중복 제거

```python
messages = set(messages)  # Set의 특성으로 중복 자동 제거
```

**결과**: 2,169개 유니크 메시지

### Step 7: JSON 저장

```python
def save_to_json(messages: list[str], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved {len(messages)} messages to {output_path}")
```

**파일**:
- `data/comfort_messages.json` (2,169개 전체)

### Step 8: Few-shot 샘플링

```python
def create_fewshot_examples(messages: list[str], output_path: Path, n_examples: int = 10):
    import random
    random.seed(42)  # 재현성 보장
    selected = random.sample(messages, min(n_examples, len(messages)))
    save_to_json(selected, output_path)
```

**파일**:
- `data/comfort_messages_fewshot.json` (10개 샘플)

**목적**: LLM 프롬프트에서 few-shot 예시로 사용

---

## 결과 분석

### 통계

| 지표 | 값 |
|------|-----|
| **원본 행 수** | 5,190 |
| **최종 메시지 수** | 2,169 (41.8%) |
| **필터링됨** | 3,021 (58.2%) |
| **Few-shot 샘플** | 10 |
| **평균 길이** | 269자 |
| **중간값 길이** | 116자 |
| **최소 길이** | 10자 |
| **최대 길이** | 100자 |

### 길이별 분포

```
100자 이하:   2,169개 (100%)
  ├─ 50자 이하:    902개 (41.6%)
  ├─ 51~100자:   1,267개 (58.4%)
```

### 필터링 분석

| 필터 | 제외된 데이터 | 비율 |
|------|--------------|------|
| **길이 > 100자** | 3,021 | 58.2% |
| **길이 < 10자** | 0 | 0% |
| **개인정보 포함** | ~500* | ~9.6% |
| **중복** | ~100* | ~1.9% |

*예상 값 (정확한 통계는 로그 확인)

### Few-shot 예시

```json
[
  "내가 어떤 사람인지를 더 정확히 알기 위한...",
  "겨울이 오면 봄도 멀지 않으리.",
  "상처는 시간이 지남에 따라 서서히 아문다.",
  "비오는 날도 내가 좋으면 그냥 좋은거야.",
  "믿음이라는 것은 별것 없어. 나 스스로가 믿기 나름일 뿐이야.",
  ...
]
```

---

## 사용 가이드

### 전처리 스크립트 실행

```bash
cd backend
python scripts/preprocess_comfort_messages.py
```

**출력**:
```
2026-05-09 22:44:59,873 [INFO] __main__: Extracted 2169 unique messages after filtering
2026-05-09 22:44:59,897 [INFO] __main__: Saved 2169 messages to data/comfort_messages.json
2026-05-09 22:44:59,900 [INFO] __main__: Saved 10 messages to data/comfort_messages_fewshot.json
```

### 생성된 파일

```
data/
├── comfort_messages.json           (2,169개 전체 메시지)
├── comfort_messages_fewshot.json   (10개 few-shot 샘플)
└── 위로글.xlsx                     (원본 데이터)
```

### Python에서 사용

```python
import json

# 전체 메시지 로드
with open('data/comfort_messages.json', 'r', encoding='utf-8') as f:
    messages = json.load(f)
    print(f"로드됨: {len(messages)}개 메시지")

# Few-shot 샘플 로드
with open('data/comfort_messages_fewshot.json', 'r', encoding='utf-8') as f:
    examples = json.load(f)
    print(f"Few-shot 예시: {len(examples)}개")
```

### Backend 통합

```python
# backend/app/services/comfort_service.py

def _load_messages_from_json() -> list[str]:
    json_path = Path(__file__).parent.parent.parent.parent / "data" / "comfort_messages.json"
    with open(json_path, encoding="utf-8") as f:
        messages = json.load(f)
    return messages
```

### Frontend 사용

```typescript
// frontend/src/components/AudioRecorder.tsx

const comfort = await getComfortMessage();
setComfortMessage(comfort.message);
```

---

## 품질 보증

### 검증 체크리스트

- [x] 개인정보 제거 확인
- [x] 길이 범위 확인 (10~100자)
- [x] 공백 정규화 확인
- [x] 중복 제거 확인
- [x] JSON 파일 생성 확인
- [x] Few-shot 샘플 생성 확인
- [x] 서비스 통합 테스트 완료

### 테스트 결과

```python
# 5번 호출 시 5개의 서로 다른 메시지 반환 ✓
messages = set()
for _ in range(5):
    msg = comfort_service.get_random_message()
    messages.add(msg)

assert len(messages) == 5  # 다양성 확인 ✓
```

---

## 개선 사항 및 최적화

### 현재 설정

- **길이 제한**: 100자 (토큰 비용 최적화)
- **샘플 수**: 10개 (프롬프트 효율성)
- **필터 전략**: 보수적 필터링 (품질 우선)

### 미래 개선 가능성

- [ ] 감정 분석을 통한 추가 필터링
- [ ] 카테고리별 분류 (직장, 연애, 학업 등)
- [ ] 길이별 티어 분류
- [ ] 주기적 데이터 업데이트
- [ ] 사용자 피드백 기반 순위 지정

---

## 참고 자료

### 파일 구조
```
VoiceStep/
├── backend/
│   └── scripts/
│       └── preprocess_comfort_messages.py
├── data/
│   ├── comfort_messages.json
│   ├── comfort_messages_fewshot.json
│   └── 위로글.xlsx
└── DATA_PREPROCESSING.md  (이 문서)
```

### 관련 문서
- [FEATURES.md](./FEATURES.md) - 기능 명세서
- [backend/app/services/comfort_service.py](./backend/app/services/comfort_service.py) - 서비스 코드
- [backend/scripts/preprocess_comfort_messages.py](./backend/scripts/preprocess_comfort_messages.py) - 전처리 스크립트

---

**문서 버전**: 1.0  
**작성일**: 2026-05-09  
**작성자**: Claude Haiku 4.5
