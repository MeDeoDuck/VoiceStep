import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardPage() {
  const { user } = useAuth();
  const name = user?.displayName || user?.email?.split("@")[0] || "사용자";

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">안녕하세요, {name}님</h1>
      <p className="mt-2 text-sm text-slate-500">오늘은 어떤 연습을 해볼까요?</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          to="/new-session"
          className="rounded-2xl border bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow"
        >
          <div className="text-sm font-medium text-brand-600">새로 시작</div>
          <h2 className="mt-2 text-lg font-semibold">새로 만들기</h2>
          <p className="mt-2 text-sm text-slate-500">
            다양한 상황을 선택해 새 대화 연습을 시작합니다.
          </p>
        </Link>
        <Link
          to="/reports"
          className="rounded-2xl border bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow"
        >
          <div className="text-sm font-medium text-brand-600">기록 보기</div>
          <h2 className="mt-2 text-lg font-semibold">이전 결과 보기</h2>
          <p className="mt-2 text-sm text-slate-500">
            저장된 보고서와 대화 기록을 확인합니다.
          </p>
        </Link>
        <Link
          to="/progress"
          className="rounded-2xl border bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow"
        >
          <div className="text-sm font-medium text-brand-600">통계</div>
          <h2 className="mt-2 text-lg font-semibold">성장 기록</h2>
          <p className="mt-2 text-sm text-slate-500">
            점수 추이와 항목별 성장 현황을 확인합니다.
          </p>
        </Link>
      </div>
    </div>
  );
}
