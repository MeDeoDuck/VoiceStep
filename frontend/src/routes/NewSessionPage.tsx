import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "@/lib/api";
import type { ScenarioType } from "@/types/session";

const SCENARIOS: Array<{ type: ScenarioType; label: string; description: string }> = [
  {
    type: "interview",
    label: "면접 상황",
    description: "자기소개, 지원동기, 강점, 협업 경험 등을 연습합니다.",
  },
  {
    type: "work",
    label: "업무 보고/요청",
    description: "지연 보고, 요청, 거절, 일정 조율, 피드백 대화를 연습합니다.",
  },
  {
    type: "presentation",
    label: "발표",
    description: "발표 오프닝, 핵심 메시지 정리, Q&A 대응 등을 연습합니다.",
  },
  {
    type: "meeting",
    label: "회의 발언",
    description: "아이디어 제안, 의견 표명, 의사결정 참여 등을 연습합니다.",
  },
  {
    type: "customer",
    label: "고객응대",
    description: "불만 처리, 상품 안내, 클레임 대응 등을 연습합니다.",
  },
];

const TOPICS: Record<ScenarioType, string[]> = {
  interview: [
    "반도체",
    "IT",
    "AI",
    "빅데이터",
    "HRD",
    "HRM",
    "배터리",
    "무역",
    "패션",
    "전략 기획",
    "컨텐츠 마케팅",
    "영업",
  ],
  work: [
    "업무 지연 보고",
    "추가 업무 요청 거절",
    "일정 조율",
    "피드백 전달",
    "업무 지원 요청",
  ],
  presentation: [
    "신제품 발표",
    "프로젝트 결과 보고",
    "학술 발표",
    "사업 계획 발표",
    "팀 성과 공유",
  ],
  meeting: [
    "아이디어 제안",
    "업무 진행 보고",
    "의사결정 참여",
    "문제 해결 토론",
    "의견 반대 표명",
  ],
  customer: [
    "불만 처리",
    "상품·서비스 안내",
    "환불·교환 처리",
    "예약·일정 조율",
    "클레임 대응",
  ],
};

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!selectedScenario || !selectedTopic) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await createSession(selectedScenario, selectedTopic);
      navigate(`/session/${res.session_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "세션 생성 실패");
      setSubmitting(false);
    }
  }

  function randomizeTopic() {
    if (!selectedScenario) return;
    const topics = TOPICS[selectedScenario];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    setSelectedTopic(randomTopic);
  }

  // 시나리오 선택 화면
  if (!selectedScenario) {
    return (
      <div>
        <h1 className="text-2xl font-bold">어떤 상황을 연습하시겠어요?</h1>
        <p className="mt-2 text-sm text-slate-500">상황을 선택하면 다음 단계로 진행합니다.</p>

        {error && (
          <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.type}
              type="button"
              onClick={() => setSelectedScenario(s.type)}
              disabled={submitting}
              className="rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow disabled:opacity-60"
            >
              <h2 className="text-lg font-semibold">{s.label}</h2>
              <p className="mt-2 text-sm text-slate-500">{s.description}</p>
              <span className="mt-4 inline-block rounded-md bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                선택
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 주제 선택 화면
  const scenarioLabel = SCENARIOS.find((s) => s.type === selectedScenario)?.label || selectedScenario;
  const topics = TOPICS[selectedScenario] || [];

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => {
            setSelectedScenario(null);
            setSelectedTopic(null);
          }}
          className="text-sm text-brand-600 hover:underline"
        >
          ← 상황 다시 선택
        </button>
      </div>

      <h1 className="text-2xl font-bold">{scenarioLabel} 주제를 선택하세요</h1>
      <p className="mt-2 text-sm text-slate-500">
        선택한 주제로 AI와 대화 연습을 진행합니다.
      </p>

      {error && (
        <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={randomizeTopic}
          disabled={submitting}
          className="rounded-lg border-2 border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
        >
          🎲 랜덤으로 선택
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setSelectedTopic(topic)}
            disabled={submitting}
            className={`rounded-lg border-2 p-4 text-center transition disabled:opacity-60 ${
              selectedTopic === topic
                ? "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white hover:border-brand-300"
            }`}
          >
            <span className="text-sm font-medium text-slate-900">{topic}</span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={start}
          disabled={!selectedTopic || submitting}
          className="w-full rounded-lg bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "준비 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
