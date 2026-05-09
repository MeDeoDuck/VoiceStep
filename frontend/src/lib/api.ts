import { getIdToken } from "./auth";
import type {
  CreateSessionResponse,
  ScenarioType,
  SessionDetail,
} from "@/types/session";
import type { ReportDetail, ReportListItem } from "@/types/report";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  return { Authorization: `Bearer ${token}` };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = (data?.detail as string) || JSON.stringify(data);
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `요청 실패 (${res.status})`);
  }
  // No content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function syncUser(payload: { email?: string | null; display_name?: string | null }) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/auth/sync`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email ?? null,
      display_name: payload.display_name ?? null,
    }),
  });
  return handle<{ id: string; firebase_uid: string; email?: string; display_name?: string }>(res);
}

export async function createSession(scenarioType: ScenarioType, job?: string): Promise<CreateSessionResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/sessions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_type: scenarioType, job: job || null }),
  });
  return handle<CreateSessionResponse>(res);
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers });
  return handle<SessionDetail>(res);
}

export type TranscribeResult = { original_text: string; corrected_text: string };

export async function transcribeAudio(
  sessionId: string,
  audio: Blob,
  filename = "audio.webm"
): Promise<TranscribeResult> {
  const headers = await authHeaders();
  const form = new FormData();
  form.append("audio_file", audio, filename);
  form.append("session_id", sessionId);
  const res = await fetch(`${BASE_URL}/api/stt/transcribe`, {
    method: "POST",
    headers,
    body: form,
  });
  return handle<TranscribeResult>(res);
}

export type ReplyResponse = {
  session_id: string;
  turn_count: number;
  is_completed: boolean;
  ai_message: { role: "ai"; content: string; turn_index: number };
  report_id?: string | null;
};

export async function postReply(
  sessionId: string,
  body: { original_stt_text: string; corrected_text: string }
): Promise<ReplyResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/reply`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<ReplyResponse>(res);
}

export async function listReports(): Promise<ReportListItem[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/reports`, { headers });
  return handle<ReportListItem[]>(res);
}

export async function getReport(reportId: string): Promise<ReportDetail> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/reports/${reportId}`, { headers });
  return handle<ReportDetail>(res);
}

export type ReportStats = {
  total_count: number;
  history: Array<{ date: string; score: number; scenario_type: string }>;
  avg_by_scenario: Record<string, number>;
  category_avgs: Record<string, number>;
};

export async function getReportStats(): Promise<ReportStats> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/api/reports/stats/summary`, { headers });
  return handle<ReportStats>(res);
}

export async function getComfortMessage(): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/comfort/message`);
  return handle<{ message: string }>(res);
}
