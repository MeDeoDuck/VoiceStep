# VoiceStep - 기능 명세서

**프로젝트**: 음성 기반 대화 능력 향상 플랫폼  
**버전**: 1.0.0  
**최종 업데이트**: 2026-05-09

---

## 📋 목차

1. [개요](#개요)
2. [핵심 기능](#핵심-기능)
3. [API 명세](#api-명세)
4. [데이터 모델](#데이터-모델)
5. [기술 스택](#기술-스택)

---

## 개요

**VoiceStep**은 사용자가 다양한 상황에서 음성으로 대화를 연습하고, AI 분석을 통해 피드백을 받는 플랫폼입니다.

### 주요 특징
- 🎤 **음성 녹음**: 브라우저 기반 음성 녹음
- 🎯 **시나리오 기반 학습**: 고객응대, 회의, 프레젠테이션 등 다양한 상황 제공
- 🤖 **AI 분석**: Groq LLM을 통한 자동 평가 및 피드백
- 📊 **성장 추적**: 세션별 기록 및 통계 분석
- 💬 **위로 메시지**: 사용자 격려 메시지 자동 제공

---

## 핵심 기능

### 1. 인증 (Authentication)

**목적**: 사용자 관리 및 세션 보안

| 기능 | 설명 |
|------|------|
| **사용자 동기화** | 이메일 기반 사용자 등록/조회 |
| **현재 사용자 조회** | 인증된 사용자 정보 조회 |
| **토큰 관리** | JWT 기반 토큰 관리 |

**엔드포인트**:
- `POST /api/auth/sync` - 사용자 동기화
- `GET /api/auth/me` - 현재 사용자 정보

---

### 2. 세션 관리 (Sessions)

**목적**: 대화 연습 세션 생성 및 관리

#### 2.1 세션 생성

사용자가 연습하고 싶은 시나리오를 선택하여 새로운 세션 생성

**시나리오 타입**:
- `customer` - 고객응대 상황
- `meeting` - 회의 상황
- `presentation` - 프레젠테이션 상황

**요청 정보**:
```json
{
  "scenario_type": "customer",
  "job": "카페 직원"
}
```

**응답**:
```json
{
  "session_id": "uuid",
  "scenario_type": "customer",
  "status": "active",
  "first_ai_message": "안녕하세요. 뭘 도와드릴까요?"
}
```

#### 2.2 세션 조회

특정 세션의 상세 정보 및 메시지 히스토리 조회

**응답 정보**:
- 세션 정보 (ID, 상태, 시나리오)
- 대화 메시지 히스토리
- 평가 점수

#### 2.3 응답 입력

사용자 음성을 텍스트로 변환하여 세션에 입력

**프로세스**:
1. 음성 파일 업로드
2. STT로 텍스트 변환
3. LLM으로 분석 및 평가
4. AI 응답 생성
5. 위로 메시지 제공 (선택사항)

**엔드포인트**:
- `POST /api/sessions` - 세션 생성
- `GET /api/sessions/{session_id}` - 세션 조회
- `POST /api/sessions/{session_id}/reply` - 응답 입력

---

### 3. 음성 인식 (STT - Speech-to-Text)

**목적**: 음성 파일을 텍스트로 변환

**기능**:
- 오디오 파일 업로드 (WAV, MP3 등)
- Google Cloud Speech-to-Text API 연동
- 한국어 자동 인식

**요청**:
```json
{
  "audio_file": "<binary audio data>",
  "language": "ko-KR"
}
```

**응답**:
```json
{
  "text": "안녕하세요. 커피 한 잔 주세요.",
  "confidence": 0.95
}
```

**엔드포인트**:
- `POST /api/stt/transcribe` - 음성을 텍스트로 변환

---

### 4. LLM 분석 (Conversation Analysis)

**목적**: AI를 통한 대화 분석 및 피드백 제공

**모델**: Groq Llama-3.1 (글로벌 가용성, 빠른 응답)

**분석 항목**:
- 발화 적절성 (0-100점)
- 상황 이해도 (0-100점)
- 의사소통 능력 (0-100점)
- 구체적 피드백 및 개선 사항

**프롬프트 템플릿**:
```
시나리오: {scenario}
직업: {job}
사용자 발화: {user_text}
AI 초기 메시지: {ai_message}

위 상황에서 사용자의 응답을 평가하세요...
```

**엔드포인트**:
- `GET /api/llm/ping` - LLM 서버 상태 확인

---

### 5. 리포트 및 통계 (Reports)

**목적**: 학습 기록 및 성장 추적

#### 5.1 리포트 목록

사용자의 모든 세션 기록 및 평가 조회

**정보**:
- 세션 ID, 시나리오, 날짜
- 평가 점수 요약
- 상태 (완료/진행 중)

#### 5.2 리포트 상세

특정 세션의 상세 기록 조회

**포함 정보**:
- 전체 대화 히스토리
- 세부 평가 점수
- AI 피드백
- 개선 제안

#### 5.3 통계 요약

사용자의 전체 성장 지표

**지표**:
- 총 세션 수
- 평균 점수
- 시나리오별 성과
- 점수 추이

**엔드포인트**:
- `GET /api/reports` - 리포트 목록
- `GET /api/reports/{report_id}` - 리포트 상세
- `GET /api/reports/stats/summary` - 통계 요약

---

### 6. 위로 메시지 (Comfort Messages)

**목적**: 사용자 격려 및 동기부여

#### 6.1 메시지 전처리

- **데이터 소스**: 네이버 지식인 위로글 데이터셋
- **필터링 기준**:
  - 최소 길이: 10자 이상
  - 최대 길이: 100자 이하 (토큰 효율성)
  - 개인정보 제거: 마스킹된 ID, 전화번호, 이메일
  - 공백 정규화

**통계**:
- 원본 데이터: 5,190개
- 전처리 후: 2,169개
- Few-shot 예시: 10개

#### 6.2 메시지 제공

STT 실패 시 또는 회답 입력 후 격려 메시지 제공

**사용 시나리오**:
```
사용자 음성 → STT 변환 실패 → 위로 메시지 제공
```

**예시 메시지**:
- "겨울이 오면 봄도 멀지 않으리."
- "상처는 시간이 지남에 따라 서서히 아문다."
- "비오는 날도 내가 좋으면 그냥 좋은거야."

**엔드포인트**:
- `GET /api/comfort/message` - 위로 메시지 랜덤 조회

---

### 7. UI/UX

#### 7.1 페이지 구조

| 페이지 | 경로 | 기능 |
|--------|------|------|
| **대시보드** | `/` | 홈, 빠른 시작 버튼, 기록/통계 링크 |
| **새 세션** | `/new-session` | 시나리오 선택, 세션 생성 |
| **진행 중** | `/session/{id}` | 음성 녹음, AI 응답, 피드백 |
| **리포트** | `/reports` | 세션 목록, 상세 기록 |
| **성장 기록** | `/progress` | 점수 추이, 통계 그래프 |

#### 7.2 핵심 컴포넌트

| 컴포넌트 | 기능 |
|----------|------|
| **AudioRecorder** | 음성 녹음, 재생, 제출 |
| **SessionCard** | 세션 정보 표시 |
| **ReportView** | 상세 기록 및 피드백 표시 |
| **ProgressChart** | 점수 추이 시각화 |
| **AuthProvider** | 인증 상태 관리 |

---

## API 명세

### 인증 헤더

모든 보호된 엔드포인트는 다음 헤더 필요:
```
Authorization: Bearer <token>
```

### 기본 응답 형식

**성공 (200)**:
```json
{
  "data": { /* 응답 데이터 */ }
}
```

**에러**:
```json
{
  "detail": "에러 메시지"
}
```

### 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 404 | 찾을 수 없음 |
| 500 | 서버 에러 |

---

## 데이터 모델

### User (사용자)

```python
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "사용자명",
  "created_at": "2026-05-09T12:00:00Z"
}
```

### Session (세션)

```python
{
  "id": "uuid",
  "user_id": "uuid",
  "scenario_type": "customer|meeting|presentation",
  "job": "직책/직무",
  "status": "active|completed",
  "score": 85.5,
  "created_at": "2026-05-09T12:00:00Z"
}
```

### Message (메시지)

```python
{
  "id": "uuid",
  "session_id": "uuid",
  "role": "user|ai",
  "content": "메시지 내용",
  "score": 85.5,
  "feedback": "피드백 텍스트",
  "created_at": "2026-05-09T12:00:00Z"
}
```

### Report (리포트)

```python
{
  "id": "uuid",
  "session_id": "uuid",
  "messages": [Message],
  "overall_score": 85.5,
  "analysis": {
    "appropriateness": 90,
    "comprehension": 80,
    "communication": 85
  }
}
```

---

## 기술 스택

### Backend

| 항목 | 기술 |
|------|------|
| **언어** | Python 3.9+ |
| **프레임워크** | FastAPI |
| **ORM** | SQLAlchemy |
| **DB** | SQLite / PostgreSQL |
| **LLM** | Groq Llama-3.1 |
| **STT** | Google Cloud Speech-to-Text |
| **인증** | JWT |

### Frontend

| 항목 | 기술 |
|------|------|
| **언어** | TypeScript |
| **프레임워크** | React 19 |
| **스타일링** | Tailwind CSS |
| **라우팅** | React Router v6 |
| **상태관리** | React Context API |
| **HTTP** | Fetch API |

### DevOps

| 항목 | 기술 |
|------|------|
| **VCS** | Git / GitHub |
| **패키지** | npm (frontend), pip (backend) |
| **환경 변수** | .env 파일 |

---

## 향후 기능 (Roadmap)

- [ ] 음성 품질 분석 (음량, 속도, 명확도)
- [ ] 발음 분석 및 교정
- [ ] 실시간 자막 표시
- [ ] 비교 분석 (세션 간 비교)
- [ ] 커뮤니티 기능 (결과 공유)
- [ ] 모바일 앱 (Native)
- [ ] 오프라인 모드
- [ ] 멀티언어 지원

---

**문서 버전**: 1.0  
**작성일**: 2026-05-09  
**작성자**: Claude Haiku 4.5
