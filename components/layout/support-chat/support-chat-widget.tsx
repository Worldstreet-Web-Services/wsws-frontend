"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChatHeader } from "./chat-header";
import { ChatMessageList, type ChatMessage } from "./chat-message-list";
import { ChatComposer } from "./chat-composer";
import type { ChatAttachment } from "./attachment-preview";

interface SupportChatWidgetProps {
  defaultOpen?: boolean;
}

export function SupportChatWidget({ defaultOpen = false }: SupportChatWidgetProps) {
  const t = useTranslations("supportChat");
  const topbarT = useTranslations("topbar");

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "initial-welcome",
      sender: "agent",
      text: t("greetingMessage"),
      timestamp: Date.now(),
    },
  ]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const simulateAgentResponse = useCallback(
    (userQuery: string, attachmentsCount: number) => {
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);

        let responseText = t("defaultAgentReply");

        const q = userQuery.toLowerCase();
        if (q.includes("deposit") || q.includes("fund")) {
          responseText = t("depositHelpReply");
        } else if (q.includes("trade") || q.includes("swap") || q.includes("order")) {
          responseText = t("tradeHelpReply");
        } else if (q.includes("bug") || q.includes("error") || attachmentsCount > 0) {
          responseText = t("bugReportReply");
        }

        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: responseText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, agentMsg]);

        if (!isOpen) {
          setUnreadCount((c) => c + 1);
        }
      }, 900);
    },
    [isOpen, t]
  );

  const handleSendMessage = useCallback(
    (text: string, attachments: ChatAttachment[]) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
        timestamp: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      setMessages((prev) => [...prev, userMsg]);
      simulateAgentResponse(text, attachments.length);
    },
    [simulateAgentResponse]
  );

  const handleSelectFaq = useCallback(
    (faqKey: string, promptText: string) => {
      handleSendMessage(promptText, []);
    },
    [handleSendMessage]
  );

  return (
    <>
      {/* Floating launcher trigger button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={topbarT("support")}
          className="group fixed right-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[80] flex cursor-pointer flex-col items-center gap-1 focus:outline-none md:right-6 md:bottom-6"
        >
          <span className="ws-glass relative grid size-[52px] place-items-center rounded-full shadow-[0_14px_40px_-12px_rgba(0,0,0,0.85)] transition-transform group-hover:scale-105 active:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/support.png"
              alt="Support"
              width={36}
              height={36}
              className="h-9 w-9 grayscale"
            />
            {unreadCount > 0 && (
              <span className="animate-in zoom-in absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black shadow-md">
                {unreadCount}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium text-white/60 transition-colors group-hover:text-white/85">
            {topbarT("support")}
          </span>
        </button>
      )}

      {/* Interactive Chat Panel Window */}
      {isOpen && (
        <div
          data-testid="support-chat-panel"
          className="fixed inset-0 z-[95] flex h-full w-full flex-col bg-zinc-950/95 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl md:inset-auto md:right-6 md:bottom-6 md:h-[580px] md:max-h-[calc(100dvh-48px)] md:w-[380px] md:rounded-2xl md:border md:border-white/15 md:bg-zinc-950/90 md:pt-0 md:pb-0"
        >
          <ChatHeader onClose={() => setIsOpen(false)} onMinimize={() => setIsOpen(false)} />

          <ChatMessageList messages={messages} isTyping={isTyping} onSelectFaq={handleSelectFaq} />

          <ChatComposer onSend={handleSendMessage} disabled={isTyping} />
        </div>
      )}
    </>
  );
}
