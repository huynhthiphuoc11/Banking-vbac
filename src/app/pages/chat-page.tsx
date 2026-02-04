import React from "react";
import { ThumbsDown, ThumbsUp, Mic, Send, Sparkles } from "lucide-react";

import { SparkleShell } from "../components/layout/sparkle-shell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { cn } from "../components/ui/utils";
import { apiFetch, ChatMessageRes } from "../services/api";

export function ChatPage() {
  const USER_ID = "00017496858921195E5A";
  const [conversationId] = React.useState(() => {
    const key = "demo_conversation_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, next);
    return next;
  });

  type UiMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
    meta?: { intent?: string; emotion?: string };
    feedback?: { reaction: "like" | "dislike" | "none" };
  };

  const [messages, setMessages] = React.useState<UiMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      createdAt: Date.now(),
      content:
        "Hi! I’m your AI Consultant.\n\nPick a suggested question on the left or type your own.",
      feedback: { reaction: "none" },
    },
  ]);
  const [summary, setSummary] = React.useState<string>("");
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const suggestedQuestions = [
    {
      title: "Spending",
      questions: [
        "Analyze my spending in the last 30 days",
        "What category do I spend the most on?",
        "Compare this month vs last month",
      ],
    },
    {
      title: "Product",
      questions: [
        "Recommend a credit card for me",
        "Which saving plan should I use?",
        "Best loan options for home purchase",
      ],
    },
    {
      title: "Plan",
      questions: [
        "Plan to save $2,000 in 3 months",
        "Should I rent or buy a home?",
        "How can I reduce my installment ratio?",
      ],
    },
  ];

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: UiMessage = {
      id: `m_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    try {
      const history = [...messages, userMsg]
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content, ts: m.createdAt }));

      const res = await apiFetch<ChatMessageRes>("/v1/chat/message", {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          conversation_id: conversationId,
          message: trimmed,
          history,
          summary,
          modality: "text",
        }),
        timeoutMs: 20000,
      });

      setSummary(res.summary || "");
      const assistantMsg: UiMessage = {
        id: res.request_id,
        role: "assistant",
        content: res.assistant_message,
        createdAt: Date.now(),
        meta: { intent: res.intent?.label, emotion: res.emotion?.label },
        feedback: { reaction: "none" },
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const onSend = async () => {
    const current = input;
    setInput("");
    await sendMessage(current);
  };

  const reset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        createdAt: Date.now(),
        content:
          "Hi! I’m your AI Consultant.\n\nPick a suggested question on the left or type your own.",
        feedback: { reaction: "none" },
      },
    ]);
    setSummary("");
  };

  const reactToMessage = async (messageId: string, reaction: "like" | "dislike" | "none") => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: { reaction } } : m,
      ),
    );
    if (reaction === "none") return;
    await apiFetch("/v1/chat/feedback", {
      method: "POST",
      body: JSON.stringify({
        user_id: USER_ID,
        conversation_id: conversationId,
        message_id: messageId,
        reaction,
      }),
    });
  };

  return (
    <SparkleShell greeting="AI Consultant">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Suggestions */}
        <div className="hidden lg:block space-y-4">
          <Card className="border-[#EEF1F6] shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#3AD6B0]">
                  <Sparkles className="h-4 w-4 text-white" />
            </div>
                <div className="text-lg font-semibold text-[#1C2433]">
                  Suggested questions
            </div>
          </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {suggestedQuestions.map((group) => (
                <div key={group.title} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#A0A7B4]">
                    {group.title}
                  </div>
                      <div className="space-y-2">
                    {group.questions.map((q) => (
                          <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="w-full rounded-xl border border-[#EEF1F6] bg-white px-4 py-3 text-left text-sm text-[#1C2433] hover:bg-[#F7F9FF] transition-colors"
                          >
                        {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

              <div className="pt-2">
                <div className="rounded-2xl border border-[#EEF1F6] bg-[#F7F9FF]/60 p-4">
                  <div className="text-sm font-semibold text-[#1C2433]">Context summary</div>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#6B7383]">
                    {summary || "No conversation context yet."}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Button
            variant="outline"
            className="w-full rounded-xl border-[#EEF1F6] text-[#6B7383] shadow-none"
            onClick={reset}
          >
            Reset conversation
          </Button>
            </div>

        {/* Chat */}
        <Card className="border-[#EEF1F6] shadow-none flex min-h-[680px] flex-col overflow-hidden">
          <CardHeader className="border-b border-[#EEF1F6] pb-4">
                <div className="flex items-center justify-between">
                    <div>
                <div className="text-lg font-semibold text-[#1C2433]">AI Consultant</div>
                <div className="text-sm text-[#A0A7B4]">Text input</div>
              </div>
              <Badge className="border-0 bg-[#F3FFFB] text-[#3AD6B0]">Beta</Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto bg-[#F7F9FF]/40 p-6">
            <div className="space-y-4">
              {messages.map((m) => (
                  <div
                  key={m.id}
                  className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl border px-5 py-4 text-sm leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "border-transparent bg-[#4C6FFF] text-white"
                        : "border-[#EEF1F6] bg-white text-[#1C2433]",
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {m.role === "assistant" && (
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-[#A0A7B4]">
                          {m.meta?.intent && (
                            <span className="rounded-lg bg-[#F7F9FF] px-2 py-1">
                              intent: {m.meta.intent}
                            </span>
                          )}
                          {m.meta?.emotion && (
                            <span className="rounded-lg bg-[#F7F9FF] px-2 py-1">
                              emotion: {m.meta.emotion}
                            </span>
                          )}
                        </div>

                        {/* Feedback for finetune */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Like this answer"
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-xl border border-[#EEF1F6] bg-white hover:bg-[#F7F9FF] transition-colors",
                              m.feedback?.reaction === "like" && "border-[#3AD6B0] bg-[#F3FFFB]",
                            )}
                            onClick={() =>
                              reactToMessage(m.id, m.feedback?.reaction === "like" ? "none" : "like")
                            }
                          >
                            <ThumbsUp className="h-4 w-4 text-[#6B7383]" />
                          </button>
                          <button
                            type="button"
                            aria-label="Dislike this answer"
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-xl border border-[#EEF1F6] bg-white hover:bg-[#F7F9FF] transition-colors",
                              m.feedback?.reaction === "dislike" && "border-[#FF6B6B] bg-[#FFF5F5]",
                            )}
                            onClick={() =>
                              reactToMessage(
                                m.id,
                                m.feedback?.reaction === "dislike" ? "none" : "dislike",
                              )
                            }
                          >
                            <ThumbsDown className="h-4 w-4 text-[#6B7383]" />
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
          </CardContent>

          <div className="border-t border-[#EEF1F6] bg-white p-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-12 rounded-xl border-[#EEF1F6] text-[#A0A7B4] shadow-none"
                disabled
                title="Voice input is in backlog"
              >
                <Mic className="h-5 w-5" />
              </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question…"
                className="h-12 rounded-xl border-[#EEF1F6] bg-white text-sm shadow-none focus-visible:ring-[#3AD6B0]/25"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                  />

                  <Button
                type="button"
                onClick={onSend}
                disabled={isSending}
                className="h-12 w-12 rounded-xl bg-[#3AD6B0] text-white hover:bg-[#33C9A6] disabled:opacity-60"
                aria-label="Send"
                  >
                <Send className="h-5 w-5" />
                  </Button>
                </div>

            <div className="mt-3 text-center text-xs text-[#A0A7B4]">
              Feedback (like/dislike) is stored locally to support future finetune pipelines.
            </div>
              </div>
            </Card>
          </div>
    </SparkleShell>
  );
}
