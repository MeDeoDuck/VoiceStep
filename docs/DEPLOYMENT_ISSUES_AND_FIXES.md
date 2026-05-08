# 배포 중 겪었던 문제와 해결책

VoiceStep을 Render + Vercel로 배포하면서 겪었던 주요 문제들과 해결 방법을 정리한 문서입니다.

---

## 1. ❌ CORS Preflight 400 에러 문제

### 증상
```
OPTIONS /api/sessions HTTP 400 Bad Request
OPTIONS /api/auth/sync HTTP 400 Bad Request
```
브라우저 콘솔에서 CORS preflight 요청(`OPTIONS`)이 실패하여 실제 API 요청(`POST`, `GET`)도 차단됨

### 원인
FastAPI 백엔드에서 **명시적으로 OPTIONS 핸들러를 정의**했는데, 이게 CORSMiddleware와 충돌

```python
# ❌ 잘못된 방식
@app.options("/api/sessions")
def options_sessions():
    return {}
```

CORSMiddleware는 자동으로 OPTIONS 요청을 처리하는데, 명시적 핸들러가 먼저 실행되면서 middleware의 CORS 헤더를 덮어씀

### 해결책
**명시적 OPTIONS 핸들러 제거** → CORSMiddleware가 모든 CORS 처리를 담당하도록 변경

```python
# ✅ 올바른 방식 (app/main.py)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],           # ← OPTIONS 포함 자동 처리
    allow_headers=["*"],
)

# OPTIONS 핸들러는 제거!
```

### 확인 방법
1. 브라우저 DevTools → Network 탭
2. API 요청 → Headers 확인
3. `Access-Control-Allow-Origin` 헤더 존재하는지 확인

### 관련 커밋
```
0cfff04 Fix CORS preflight errors by removing redundant OPTIONS handlers
```

---

## 2. ❌ Render 무료 플랜 자동 슬립 문제

### 증상
```
504 Gateway Timeout / 502 Bad Gateway
서버가 가동되는데 1분 정도 시간이 걸림
프론트엔드 요청이 타임아웃됨
```

### 원인
Render 무료 플랜의 자동 슬립 기능:
- **15분 동안 요청이 없으면** → 자동으로 서버가 슬립 상태로 전환
- 다시 깨어나는데 **약 30초 ~ 1분 소요**
- 프론트엔드가 백엔드 응답을 기다리는 동안 타임아웃

### 해결책
**UptimeRobot으로 정기적 헬스 체크** → 15분 이내에 계속 요청 전송

#### 설정 단계

1. **UptimeRobot 가입** ([https://uptimerobot.com](https://uptimerobot.com))

2. **모니터 추가**
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://voicestep-backend.render.com/health`
   - **Monitoring Interval**: 5분 (무료 플랜)

3. **백엔드 헬스 체크 엔드포인트 확인** (app/main.py)
   ```python
   @app.get("/health")
   def health() -> dict:
       return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}
   ```

#### UptimeRobot 무료 vs 유료

| 구분 | 무료 플랜 | 유료 (Pro) |
|---|---|---|
| 최소 체크 간격 | **5분** | **1분 또는 30초** |
| Render 슬립 타임아웃 | 15분 | 15분 |
| 충분한가? | ✅ 네 (5분 간격이 15분 타임아웃 내) | ✅ 더 빠름 |
| 비용 | 무료 | $9.99/월 |

#### 권장 설정
- **현재**: 무료 플랜 5분 간격 (충분함)
- **Uptime 모니터링**: 24시간 100% 유지 가능

---

## 3. ⚠️ 기타 배포 시 주의사항

### 환경 변수 관리
```yaml
# render.yaml의 envVars는 모두 Render 대시보드에서도 설정 필요
envVars:
  - key: DATABASE_URL
    scope: run
  - key: GEMINI_API_KEY
    scope: run
  - key: FIREBASE_SERVICE_ACCOUNT_JSON
    scope: run
```

**주의**: Secret 값은 `render.yaml`에 하드코딩하지 말 것 → Render 대시보드에서만 설정

### CORS 설정 (render.yaml)
```yaml
envVars:
  - key: BACKEND_CORS_ORIGINS
    value: https://voicestep.vercel.app
    scope: run
```

Vercel 프론트엔드 URL을 정확히 입력해야 함 (프로토콜 포함)

### 포트 설정
```yaml
envVars:
  - key: PORT
    value: "10000"
    scope: run
```

Render은 동적 PORT를 할당하므로 환경 변수 사용 필수

---

## 4. 📋 배포 전 체크리스트

배포 전에 다음을 확인하세요:

- [ ] **CORS 설정 확인**
  - [ ] `CORSMiddleware` 설정 확인
  - [ ] 명시적 OPTIONS 핸들러 없음
  - [ ] `allow_origins` = 프론트엔드 URL (또는 `["*"]`)

- [ ] **환경 변수 설정**
  - [ ] Render 대시보드에서 모든 env vars 입력됨
  - [ ] SECRET 정보 `.env` 또는 대시보드에만 저장 (git 제외)
  - [ ] `DATABASE_URL`, `GEMINI_API_KEY` 등 필수값 설정됨

- [ ] **헬스 체크 엔드포인트**
  - [ ] `/health` 엔드포인트 동작 확인
  - [ ] 브라우저에서 `https://voicestep-backend.render.com/health` 접근 가능

- [ ] **UptimeRobot 설정**
  - [ ] 모니터 생성됨
  - [ ] Last 24h Uptime 100% 확인

- [ ] **프론트엔드 배포**
  - [ ] Vercel `.env` 설정 (`VITE_API_BASE_URL` = Render 백엔드 URL)
  - [ ] 프론트엔드에서 백엔드 API 호출 성공 확인

---

## 5. 🔧 문제 발생 시 디버깅 순서

### 1단계: 헬스 체크
```bash
curl https://voicestep-backend.render.com/health
```
응답: `{"status": "ok", ...}` ✅

### 2단계: CORS 확인
브라우저 DevTools → Network → 요청 선택 → Headers → `Access-Control-Allow-Origin` 확인

### 3단계: 로그 확인
Render 대시보드 → Logs → 에러 메시지 확인

### 4단계: 환경 변수 확인
Render 대시보드 → Environment → 모든 변수 값 확인

---

## 📝 요약

| 문제 | 해결책 | 상태 |
|---|---|---|
| CORS 400 에러 | 명시적 OPTIONS 핸들러 제거 | ✅ 해결 |
| Render 슬립 타임아웃 | UptimeRobot 5분 간격 모니터링 | ✅ 해결 |
| 환경 변수 누락 | Render 대시보드 + render.yaml 동기화 | ✅ 해결 |

---

## 6. ❌ LLM API 문제들 (2026-05-08)

### 6-1. Gemini API Import 경로 오류
**문제**: `ModuleNotFoundError: No module named 'google.genai'`
- 코드가 존재하지 않는 import 경로 사용

**해결**: `import google.generativeai as genai` 로 변경  
**커밋**: `c261747`

### 6-2. Gemini 모델 버전 불일치
**문제**: 로컬은 2.5인데 배포 환경에서 1.5 사용
- 로컬 `.env`: `gemini-2.5-flash-lite`
- `config.py` 기본값: `gemini-1.5-flash`

**해결**: `config.py` 기본값을 `gemini-2.5-flash-lite` 로 변경  
**커밋**: `15307f9`

### 6-3. Gemini API 지역 제한 (최종 해결)
**문제**: `400 User location is not supported for the API use.`
- Gemini API가 한국/일부 지역 미지원
- Render 서버가 미지원 지역에 위치

**해결**: **Gemini → Groq Llama 3.1 8B 로 변경**
- 전 세계 지역 제한 없음
- `requirements.txt`: groq==0.9.0 추가
- `gemini_service.py`: Groq chat.completions API 사용
- `config.py`: GROQ_API_KEY, GROQ_MODEL (llama-3.1-8b-instant)

**커밋**: `e7f5e21`

---

**마지막 업데이트**: 2026-05-08  
**배포 상태**: Groq Llama API 적용 완료 ✅
