import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInEmail, signUpEmail } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, configured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-lg rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow">
          <h2 className="mb-2 text-lg font-semibold">Firebase 환경 변수가 필요합니다.</h2>
          <p className="text-sm">
            <code>frontend/.env</code> 파일에 <code>VITE_FIREBASE_*</code> 값을 채운 뒤 새로고침해주세요.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-brand-600">AI 대화훈련</h1>
        <p className="mt-1 text-sm text-slate-500">
          면접·업무 상황을 음성으로 연습하고 AI 보고서를 받아보세요.
        </p>

        <div className="mt-6 flex rounded-md bg-slate-100 p-1 text-sm">
          <button
            className={`flex-1 rounded-md py-1 ${mode === "signin" ? "bg-white shadow" : "text-slate-500"}`}
            onClick={() => setMode("signin")}
            type="button"
          >
            로그인
          </button>
          <button
            className={`flex-1 rounded-md py-1 ${mode === "signup" ? "bg-white shadow" : "text-slate-500"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            회원가입
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-500 py-2 text-sm font-medium text-white shadow hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
          </button>
        </form>
      </div>
    </div>
  );
}
