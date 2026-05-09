export type ScenarioType = "interview" | "work" | "presentation" | "meeting" | "customer";
export type SessionStatus = "active" | "completed" | "cancelled";

export type CreateSessionResponse = {
  session_id: string;
  scenario_type: ScenarioType;
  status: SessionStatus;
  first_ai_message: string;
  job?: string | null;
};

export type SessionDetail = {
  id: string;
  scenario_type: ScenarioType;
  status: SessionStatus;
  turn_count: number;
  messages: SessionMessage[];
};

export type SessionMessage = {
  id: string;
  role: "ai" | "user" | "system";
  content: string;
  original_stt_text?: string | null;
  corrected_text?: string | null;
  turn_index: number;
};
