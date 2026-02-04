import * as React from "react";

import {
  ConversationMessage,
  ConversationState,
  applyFeedback,
  createId,
  detectEmotion,
  detectIntent,
  generateAssistantResponse,
  loadConversationState,
  saveConversationState,
  summarizeConversation,
} from "./conversation";

export function useConversation() {
  const [state, setState] = React.useState<ConversationState>(() =>
    typeof window === "undefined" ? { messages: [], summary: "" } : loadConversationState(),
  );

  const send = React.useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setState((prev) => {
      const userMsg: ConversationMessage = {
        id: createId("m"),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
        meta: {
          intent: detectIntent(trimmed),
          emotion: detectEmotion(trimmed),
          summarySnapshot: prev.summary,
        },
      };

      const nextMessages = [...prev.messages, userMsg];
      const nextSummary = summarizeConversation(nextMessages);

      const assistantText = generateAssistantResponse(trimmed, {
        messages: nextMessages,
        summary: nextSummary,
      });
      const assistantMsg: ConversationMessage = {
        id: createId("m"),
        role: "assistant",
        content: assistantText,
        createdAt: Date.now(),
        meta: {
          intent: detectIntent(trimmed),
          emotion: detectEmotion(trimmed),
          summarySnapshot: nextSummary,
        },
        feedback: { reaction: "none" },
      };

      const next: ConversationState = {
        messages: [...nextMessages, assistantMsg],
        summary: nextSummary,
      };

      saveConversationState(next);
      return next;
    });
  }, []);

  const reactToMessage = React.useCallback(
    (messageId: string, reaction: "like" | "dislike" | "none") => {
      setState((prev) => applyFeedback(prev, messageId, reaction));
    },
    [],
  );

  const reset = React.useCallback(() => {
    const next = {
      summary: "",
      messages: loadConversationState().messages,
    };
    saveConversationState(next);
    setState(next);
  }, []);

  return { state, send, reactToMessage, reset };
}


