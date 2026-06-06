"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    input: Record<string, any>;
    result: Record<string, any>;
  }>;
}

export default function AiChat() {
  const { address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, connectedAddress: address }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            toolCalls: data.toolCalls,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    }

    setIsLoading(false);
  };

  const suggestedQueries = [
    "Originate a loan of 5000 for 0xccEF39b7e2081b9c814DBbf0e51D450DdaBB64a2",
    "Check the health factor for 0xccEF39b7e2081b9c814DBbf0e51D450DdaBB64a2",
    "Compute credit line with scores: repayment 90, collateral 60, activity 30",
    "Repay 2000 tokens for 0xccEF39b7e2081b9c814DBbf0e51D450DdaBB64a2",
  ];

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-white text-sm">🤖</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Agent (Claude + MCP Tools)</h3>
          <p className="text-[10px] text-gray-400">Natural language → FHE contract operations</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">Connected</span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">
              Ask me to interact with the ZeroCredits protocol using natural language.
            </p>
            <div className="space-y-2">
              {suggestedQueries.map((query, i) => (
                <button
                  key={i}
                  onClick={() => setInput(query)}
                  className="block w-full text-left px-3 py-2 bg-gray-800/50 border border-gray-700/50 
                             rounded-lg text-xs text-gray-400 hover:text-primary-300 hover:border-primary-700/50 transition-all"
                >
                  &quot;{query}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-800 border border-gray-700 text-gray-200"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content.length > 500 ? msg.content.slice(0, 500) + "..." : msg.content}</p>

              {/* Show tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.toolCalls.map((tool, j) => (
                    <div key={j} className="p-2 bg-gray-900/80 rounded border border-gray-600/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary-900/50 text-primary-300 rounded font-mono">
                          TOOL
                        </span>
                        <span className="text-[11px] text-primary-400 font-medium">
                          {tool.name}
                        </span>
                      </div>
                      {tool.result.transactionHash && (
                        <p className="text-[10px] text-gray-500 font-mono mt-1">
                          Tx: {tool.result.transactionHash.slice(0, 22)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-gray-400">Processing with MCP tools...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask the AI agent to interact with ZeroCredits..."
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg 
                       text-white text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 
                       text-white font-medium rounded-lg transition-all text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
