"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";

interface AiChatPanelProps {
  lotCode: string;
  wallet: string;
  role: "farmer" | "partner";
}

export function AiChatPanel({ lotCode, wallet, role }: AiChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getOrCreateThread = useMutation(api.agentChat.getOrCreateThread);
  const sendMessage = useMutation(api.agentChat.sendMessage);

  // Fetch messages when we have a threadId
  const messagesResult = useQuery(
    api.agentChat.listThreadMessages,
    threadId
      ? { threadId, paginationOpts: { cursor: null, numItems: 50 } }
      : "skip",
  );

  const messagesPage = messagesResult?.page;
  const messages = useMemo(
    () => (messagesPage ?? []) as UIMessage[],
    [messagesPage],
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    if (!threadId) {
      try {
        const id = await getOrCreateThread({ wallet, role, lotCode });
        setThreadId(id);
      } catch (err) {
        console.error("Failed to create thread:", err);
      }
    }
  }, [getOrCreateThread, lotCode, role, threadId, wallet]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !threadId) return;
    const msg = input.trim();
    setInput("");
    setIsSending(true);
    try {
      await sendMessage({ threadId, message: msg, lotCode });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  }, [input, lotCode, sendMessage, threadId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="10" r="1" />
          <circle cx="8" cy="10" r="1" />
          <circle cx="16" cy="10" r="1" />
        </svg>
        Ask AI about this lot
      </button>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-indigo-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-gray-800">
            Harvverse AI
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex max-h-80 min-h-[200px] flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-xs text-gray-400">
              Ask me anything about lot{" "}
              <span className="font-mono font-semibold">{lotCode}</span>
              <br />I know about the farm, variety, partnerships, sensors, and
              more.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lot..."
            disabled={!threadId || isSending}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !threadId || isSending}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // Extract text content
  let text = "";
  if (message.content) {
    text = message.content;
  } else if (message.parts) {
    text = message.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }

  if (!text || message.role === "tool") return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-indigo-600 text-white"
            : isAssistant
              ? "bg-gray-100 text-gray-800"
              : "bg-yellow-50 text-yellow-800"
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
