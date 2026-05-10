import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import LoadingState from "@/components/LoadingState";
import { getReportStats, type ReportStats } from "@/lib/api";

const SCENARIO_COLORS: Record<string, string> = {
  interview: "#3b82f6",
  work: "#10b981",
  presentation: "#f59e0b",
  meeting: "#8b5cf6",
  customer: "#ef4444",
};

const SCENARIO_LABELS: Record<string, string> = {
  interview: "면접",
  work: "업무",
  presentation: "발표",
  meeting: "회의",
  customer: "고객응대",
};

interface ScoreTrendData {
  date: string;
  interview?: number;
  work?: number;
  presentation?: number;
  meeting?: number;
  customer?: number;
}

const formatDateOnly = (rawDate: string): string => {
  if (!rawDate) return "";
  return rawDate.includes("T") ? rawDate.split("T")[0] : rawDate.split(" ")[0];
};

const buildScoreTrendData = (history: any[]): ScoreTrendData[] => {
  const grouped: Record<string, Record<string, number[]>> = {};

  history.forEach((record) => {
    const date = formatDateOnly(record.date);
    const scenario = record.scenario_type || "interview";

    if (!grouped[date]) {
      grouped[date] = {};
    }
    if (!grouped[date][scenario]) {
      grouped[date][scenario] = [];
    }
    grouped[date][scenario].push(record.score);
  });

  return Object.entries(grouped)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, scenarios]) => {
      const result: ScoreTrendData = { date };
      Object.entries(scenarios).forEach(([scenario, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        result[scenario as keyof ScoreTrendData] = parseFloat(avg.toFixed(1));
      });
      return result;
    });
};

export default function ProgressPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReportStats()
      .then((r) => !cancelled && setStats(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        {error}
      </div>
    );
  if (!stats) return <LoadingState />;

  // 총 연습 횟수가 0이면 안내 문구 표시
  if (stats.total_count === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">성장 기록</h1>
        <div className="mt-6 rounded-lg border bg-white p-6 text-center text-slate-500">
          <p>아직 저장된 대화 기록이 없습니다.</p>
          <Link to="/new-session" className="mt-3 inline-block text-brand-600 hover:underline">
            새 대화 시작하기 →
          </Link>
        </div>
      </div>
    );
  }

  // 요약 정보
  const avgScore =
    stats.history.length > 0
      ? (stats.history.reduce((sum, h) => sum + h.score, 0) / stats.history.length).toFixed(1)
      : "0";

  // LineChart용 데이터 변환 (날짜별+시나리오별 평균, wide format)
  const chartData = buildScoreTrendData(stats.history);

  // BarChart용 데이터 (항목별 평균)
  const categoryData = Object.entries(stats.category_avgs)
    .map(([category, avg]) => ({
      category,
      score: parseFloat(avg.toFixed(1)),
    }))
    .filter(item => item.score > 0);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/reports" className="text-sm text-brand-600 hover:underline">
          ← 보고서 목록
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">성장 기록</h1>
        <p className="mt-1 text-sm text-slate-600">지금까지의 연습 현황을 확인해보세요.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">총 연습 횟수</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats.total_count}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">평균 점수</div>
          <div className="mt-2 text-3xl font-bold text-brand-600">{avgScore}</div>
        </div>
      </div>

      {/* 시나리오별 평균 카드 */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">시나리오별 평균</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.keys(SCENARIO_LABELS).map((scenario) => (
            <div key={scenario} className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm font-medium text-slate-700">
                {SCENARIO_LABELS[scenario]}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {stats.avg_by_scenario[scenario] ? parseFloat(stats.avg_by_scenario[scenario].toFixed(1)) : 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 날짜별 점수 추이 */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">점수 추이</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: "12px" }} />
                <YAxis domain={[0, 100]} style={{ fontSize: "12px" }} />
                <Tooltip />
                <Legend />
                {Object.entries(SCENARIO_COLORS).map(([scenario, color]) => (
                  <Line
                    key={scenario}
                    type="monotone"
                    dataKey={scenario}
                    stroke={color}
                    name={SCENARIO_LABELS[scenario]}
                    connectNulls={false}
                    dot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 항목별 평균 */}
      {categoryData.length > 0 && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">항목별 평균 점수</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 5, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: "12px" }}
                />
                <YAxis domain={[0, 20]} style={{ fontSize: "12px" }} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
