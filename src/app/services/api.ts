export type ApiError = {
  status: number;
  message: string;
  detail?: unknown;
};

const DEFAULT_BASE_URL = "http://localhost:8000";

export function getApiBaseUrl() {
  // Vite exposes env vars on import.meta.env
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return (envBase || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function readError(res: Response): Promise<ApiError> {
  const contentType = res.headers.get("content-type") || "";
  let detail: unknown = undefined;
  try {
    if (contentType.includes("application/json")) detail = await res.json();
    else detail = await res.text();
  } catch {
    // ignore
  }
  return {
    status: res.status,
    message: `Request failed (${res.status})`,
    detail,
  };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 15000;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) throw await readError(res);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export type ChatMessageReq = {
  user_id: string;
  conversation_id: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string; ts?: number }>;
  summary?: string | null;
  modality?: "text" | "voice";
};

export type ChatMessageRes = {
  request_id: string;
  assistant_message: string;
  summary: string;
  intent: { label: string; confidence: number };
  emotion: { label: string; confidence: number };
  safety: { allowed: boolean; reasons: string[] };
  latency_ms: number;
};

export type ChatFeedbackReq = {
  user_id: string;
  conversation_id: string;
  message_id: string;
  reaction: "like" | "dislike";
  reason?: string | null;
};

export type DashboardSummaryRes = {
  user_id: string;
  window_days: number;
  spend_total: number;
  income_total: number;
  tx_count: number;
  installment_ratio: number;
  top_categories: Array<{ category: string; total: number }>;
};

export type DashboardTransaction = {
  id: string;
  user_id: string;
  posted_at: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  merchant_name?: string | null;
  channel?: string | null;
  category: string;
  mcc: number;
  isin: string;
  installment?: { is_installment: boolean; months?: number | null; monthly_amount?: number | null } | null;
};

export type DashboardInsightsRes = {
  user_id: string;
  window_days: number;
  insights: Array<{
    level: "high" | "warning" | "stable";
    title: string;
    description: string;
    impact: string;
    why: string[];
  }>;
};

export type DashboardRecommendationsRes = {
  user_id: string;
  window_days: number;
  recommendations: Array<{
    product: string;
    type: string;
    match: number; // 0..1
    why: string[];
    explanation: string;
  }>;
};


