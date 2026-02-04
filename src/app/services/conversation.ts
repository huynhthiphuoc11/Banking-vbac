export type ConversationRole = "user" | "assistant";

export type Intent =
  | "loan"
  | "travel"
  | "saving"
  | "credit"
  | "insurance"
  | "spending"
  | "investment"
  | "unknown";

export type Emotion = "stress" | "concern" | "excitement" | "neutral";

export type FeedbackReaction = "like" | "dislike" | "none";

export type MessageMeta = {
  intent?: { label: Intent; confidence: number };
  emotion?: { label: Emotion; confidence: number };
  summarySnapshot?: string;
};

export type ConversationMessage = {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: number;
  meta?: MessageMeta;
  feedback?: { reaction: FeedbackReaction };
};

export type ConversationState = {
  messages: ConversationMessage[];
  summary: string;
};

const STORAGE_KEY_STATE = "sparkle_conversation_state_v1";
const STORAGE_KEY_FEEDBACK = "sparkle_conversation_feedback_v1";

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadConversationState(): ConversationState {
  const parsed = safeJsonParse<ConversationState>(localStorage.getItem(STORAGE_KEY_STATE));
  if (parsed?.messages?.length) return parsed;
  return {
    summary: "",
    messages: [
      {
        id: createId("m"),
        role: "assistant",
        createdAt: Date.now(),
        content:
          "Hi! I’m your AI Consultant.\n\nI can help you with:\n- Spending analysis and budgeting\n- Product recommendations (card/loan/saving/insurance)\n- Financial planning and goal tracking\n\nPick a suggested question on the left or type your own.",
      },
    ],
  };
}

export function saveConversationState(state: ConversationState) {
  localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
}

type StoredFeedback = Record<string, { reaction: FeedbackReaction; updatedAt: number }>;

export function loadFeedback(): StoredFeedback {
  return safeJsonParse<StoredFeedback>(localStorage.getItem(STORAGE_KEY_FEEDBACK)) ?? {};
}

export function saveFeedback(feedback: StoredFeedback) {
  localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(feedback));
}

export function detectIntent(text: string): { label: Intent; confidence: number } {
  const t = text.toLowerCase();
  const rules: Array<{ label: Intent; score: number; hit: boolean }> = [
    { label: "loan", score: 0.85, hit: /(loan|vay|mortgage|interest|lãi suất)/i.test(t) },
    { label: "travel", score: 0.8, hit: /(travel|du lịch|flight|hotel|vé máy bay|khách sạn)/i.test(t) },
    { label: "saving", score: 0.8, hit: /(saving|tiết kiệm|deposit|gửi góp|lãi kép)/i.test(t) },
    { label: "credit", score: 0.75, hit: /(credit|thẻ tín dụng|limit|cashback|points)/i.test(t) },
    { label: "insurance", score: 0.75, hit: /(insurance|bảo hiểm|policy|premium)/i.test(t) },
    { label: "spending", score: 0.7, hit: /(spending|chi tiêu|budget|ngân sách|transaction|giao dịch)/i.test(t) },
    { label: "investment", score: 0.7, hit: /(invest|đầu tư|stock|fund|bond|ETF|cổ phiếu)/i.test(t) },
  ];
  const match = rules.find((r) => r.hit);
  return match ? { label: match.label, confidence: match.score } : { label: "unknown", confidence: 0.4 };
}

export function detectEmotion(text: string): { label: Emotion; confidence: number } {
  const t = text.toLowerCase();
  if (/(urgent|gấp|kẹt|overdue|nợ|debt|stress|áp lực)/i.test(t)) return { label: "stress", confidence: 0.8 };
  if (/(worried|lo|concern|sợ|không biết)/i.test(t)) return { label: "concern", confidence: 0.75 };
  if (/(great|tuyệt|excited|hào hứng|được rồi|yay)/i.test(t)) return { label: "excitement", confidence: 0.75 };
  return { label: "neutral", confidence: 0.7 };
}

export function summarizeConversation(messages: ConversationMessage[]): string {
  const userMsgs = messages.filter((m) => m.role === "user").slice(-6);
  if (!userMsgs.length) return "";
  const bullets = userMsgs.map((m) => `- ${m.content.replace(/\s+/g, " ").slice(0, 120)}`);
  return `Recent user topics:\n${bullets.join("\n")}`;
}

export function generateAssistantResponse(input: string, state: ConversationState): string {
  const intent = detectIntent(input).label;
  const base = `Here’s a structured answer based on your request.`;

  switch (intent) {
    case "spending":
      return `${base}\n\n**Spending analysis**\n- Top categories (last 30 days)\n- Trend vs previous period\n- Quick actions to reduce overspend\n\nIf you want, paste 3–5 recent transactions and I’ll categorize them.`;
    case "credit":
      return `${base}\n\n**Card recommendation**\n- Best-fit card type (cashback vs travel vs points)\n- Why it matches your spend pattern\n- What to watch (fees, APR, limits)\n\nTell me your top 2 spend categories and monthly income range.`;
    case "loan":
      return `${base}\n\n**Loan guidance**\n- Clarify purpose (home/car/personal)\n- Estimate affordable monthly payment\n- Rate vs term trade-offs\n\nWhat’s your target amount and preferred term?`;
    case "saving":
      return `${base}\n\n**Savings plan**\n- Goal → monthly saving target\n- Simple envelope budget\n- Auto-transfer schedule\n\nWhat’s your goal amount and timeline?`;
    case "insurance":
      return `${base}\n\n**Insurance check**\n- Coverage gaps (health/life/accident)\n- Budget-friendly options\n- Key exclusions to review\n\nWhat type of insurance are you considering?`;
    case "travel":
      return `${base}\n\n**Travel optimization**\n- Travel budget breakdown (flight/hotel/food)\n- Reward strategy (miles/points)\n- Best payment method\n\nHow many trips per year do you take?`;
    case "investment":
      return `${base}\n\n**Investment basics**\n- Risk profile (low/med/high)\n- Time horizon\n- Diversification starter plan\n\nWhat’s your horizon (1y/3y/5y+)?`;
    default:
      return `${base}\n\nTell me what you want to achieve (save more, reduce spending, get a card, plan a loan, etc.).`;
  }
}

export function applyFeedback(
  state: ConversationState,
  messageId: string,
  reaction: FeedbackReaction,
): ConversationState {
  const next: ConversationState = {
    ...state,
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, feedback: { reaction } } : m,
    ),
  };
  const stored = loadFeedback();
  stored[messageId] = { reaction, updatedAt: Date.now() };
  saveFeedback(stored);
  saveConversationState(next);
  return next;
}


