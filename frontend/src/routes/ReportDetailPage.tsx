import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LoadingState from "@/components/LoadingState";
import ChatMessageList from "@/components/ChatMessageList";
import { getReport, getComfortMessage } from "@/lib/api";
import type { ReportDetail } from "@/types/report";
import type { ChatMessage } from "@/types/message";

const SCENARIO_LABEL: Record<string, string> = {
  interview: "면접 상황 연습",
  work: "발표/회의 발언 연습",
};

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [comfortMessage, setComfortMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    getReport(reportId)
      .then((r) => !cancelled && setReport(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));

    getComfortMessage()
      .then((r) => !cancelled && setComfortMessage(r.message))
      .catch(() => {
        // ignore error for comfort message
      });

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const chatMessages: ChatMessage[] = useMemo(() => {
    if (!report) return [];
    return report.messages
      .filter((m) => m.role === "ai" || m.role === "user")
      .map((m) => ({
        id: m.id,
        role: m.role as "ai" | "user",
        content: m.content,
        originalSttText: m.original_stt_text ?? undefined,
        correctedText: m.corrected_text ?? undefined,
        turnIndex: m.turn_index,
      }));
  }, [report]);

  if (error)
    return (
      <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        {error}
      </div>
    );
  if (!report) return <LoadingState />;

  const j = report.report_json || {};
  const scores = (j.scores as Record<string, number> | undefined) || {};
  const strengths = j.strengths || [];
  const weaknesses = j.weaknesses || [];
  const recs = j.recommendations || [];
  const nextPractice = (j.next_practice as string | undefined) || "";

  const created = new Date(report.created_at).toLocaleString("ko-KR");

  return (
    <div className="space-y-6">
      <div>
        <Link to="/reports" className="text-sm text-brand-600 hover:underline">
          ← 보고서 목록
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
              <span>{SCENARIO_LABEL[report.scenario_type] || report.scenario_type}</span>
              <span>·</span>
              <span>{created}</span>
              {report.job && (
                <>
                  <span>·</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 normal-case">{report.job}</span>
                </>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold">
              {report.title || j.title || "결과 보고서"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {report.summary || (j.summary as string) || ""}
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
            <div className="text-xs text-brand-700">총점</div>
            <div className="text-3xl font-bold text-brand-700">
              {report.total_score ?? j.total_score ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {Object.keys(scores).length > 0 && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">항목별 평가</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(scores).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="text-slate-600">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">강점</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {strengths.length === 0 && <li className="list-none text-slate-400">기록 없음</li>}
            {strengths.map((s: string, idx: number) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">약점</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {weaknesses.length === 0 && <li className="list-none text-slate-400">기록 없음</li>}
            {weaknesses.map((s: string, idx: number) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">개선 조언</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {recs.length === 0 && <li className="list-none text-slate-400">기록 없음</li>}
          {recs.map((s: string, idx: number) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>
        {nextPractice && (
          <div className="mt-4 rounded-md bg-brand-50 p-3 text-sm text-brand-800">
            <div className="font-medium">다음 연습 추천</div>
            <div className="mt-1">{nextPractice}</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">전체 대화 기록</h3>
        <div className="mt-3">
          <ChatMessageList messages={chatMessages} showOriginalStt />
        </div>
      </div>

      {comfortMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-medium text-amber-700">오늘의 응원 메시지</div>
          <p className="mt-2 text-sm text-amber-900">{comfortMessage}</p>
        </div>
      )}
    </div>
  );
}
