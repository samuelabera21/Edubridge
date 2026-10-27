"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Sparkles,
    X,
    Send,
    Bot,
    User,
    ChevronDown,
    ChevronUp,
    Database,
    Zap,
    RefreshCw,
    CornerDownLeft,
    Lightbulb,
    Table as TableIcon,
    BarChart3,
    Check,
    Copy,
    Building2,
    Shield
} from "lucide-react";
import { fetchApi } from "../../lib/api";

export interface KeyMetric {
    label: string;
    value: string | number;
    change?: string;
}

export interface TableData {
    headers: string[];
    rows: Array<Array<string | number | boolean | null>>;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    metrics?: KeyMetric[];
    table?: TableData;
    sql?: string;
    executionTimeMs?: number;
    suggestedFollowUps?: string[];
    timestamp: string;
}

interface EmisAiChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuestion?: string;
}

export default function EmisAiChatDrawer({
    isOpen,
    onClose,
    initialQuestion
}: EmisAiChatDrawerProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [prompts, setPrompts] = useState<string[]>([]);
    const [scopeInfo, setScopeInfo] = useState<{ level: string; name: string } | null>(null);
    const [expandedSqlId, setExpandedSqlId] = useState<string | null>(null);
    const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom on new message
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, messages]);

    // Fetch suggested starter prompts when opened
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadPrompts = async () => {
            try {
                const res = await fetchApi("/ai-analytics/prompts");
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.success) {
                        setPrompts(data.prompts || []);
                        setScopeInfo(data.scope || null);
                    }
                }
            } catch (err) {
                console.warn("Could not load AI starter prompts", err);
            }
        };

        loadPrompts();
        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // Handle initial question if passed from external trigger
    useEffect(() => {
        if (initialQuestion && isOpen && messages.length === 0) {
            handleSubmit(initialQuestion);
        }
    }, [initialQuestion, isOpen]);

    const handleSubmit = async (questionText?: string) => {
        const query = (questionText || input).trim();
        if (!query || loading) return;

        const userMsgId = `msg-${Date.now()}`;
        const newMsg: ChatMessage = {
            id: userMsgId,
            role: "user",
            content: query,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetchApi("/ai-analytics/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: query })
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || "Failed to process question");
            }

            const data = json.data;
            const assistantMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: data.summary,
                metrics: data.keyMetrics,
                table: data.tableData,
                sql: data.sqlQuery,
                executionTimeMs: data.executionTimeMs,
                suggestedFollowUps: data.suggestedFollowUps,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error: any) {
            const errorMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: `⚠️ ${error.message || "An unexpected error occurred while querying the database."}`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleCopySql = (id: string, sql: string) => {
        navigator.clipboard.writeText(sql);
        setCopiedSqlId(id);
        setTimeout(() => setCopiedSqlId(null), 2000);
    };

    const handleClearChat = () => {
        setMessages([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over Drawer */}
            <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e3a5f] text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4085b3] to-cyan-400 flex items-center justify-center shadow-md">
                            <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-base tracking-tight text-white">EMIS Executive AI</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Gemini 2.5 Flash
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                                <span>
                                    {scopeInfo ? `${scopeInfo.level} • ${scopeInfo.name}` : "National Hierarchy"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearChat}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                title="Clear conversation"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                            title="Close chat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scope Notice Bar */}
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#4085b3]" />
                        <span>Read-only natural language queries strictly scoped to your administrative tier.</span>
                    </span>
                    <span className="font-medium text-slate-500">Live PostgreSQL Engine</span>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    {/* Empty State */}
                    {messages.length === 0 && (
                        <div className="py-6 flex flex-col items-center text-center max-w-md mx-auto space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#4085b3]">
                                <Bot className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 text-base">Ask EMIS Natural Language AI</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Ask any question about schools, teachers, students, regional counts, or educational directives. The AI converts your question into live verified database queries.
                                </p>
                            </div>

                            {/* Suggested Prompts */}
                            {prompts.length > 0 && (
                                <div className="w-full pt-2 text-left">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Suggested questions to get started:</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {prompts.map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSubmit(p)}
                                                className="text-left text-xs p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#4085b3] text-slate-800 transition-all shadow-sm flex items-center justify-between group cursor-pointer"
                                            >
                                                <span>{p}</span>
                                                <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#4085b3] shrink-0 ml-2" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat Messages */}
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role === "assistant" && (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4085b3] to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                                    <Bot className="w-4 h-4" />
                                </div>
                            )}

                            <div className={`max-w-[85%] space-y-2.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                {/* Bubble */}
                                <div
                                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                        msg.role === "user"
                                            ? "bg-[#4085b3] text-white rounded-tr-none shadow-sm font-medium"
                                            : "bg-slate-50 border border-slate-200 text-slate-900 rounded-tl-none shadow-sm"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>

                                    {/* Key Metric Badges */}
                                    {msg.metrics && msg.metrics.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80">
                                            {msg.metrics.map((m, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col"
                                                >
                                                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                                                        {m.label}
                                                    </span>
                                                    <span className="text-lg font-bold text-[#4085b3] mt-0.5">
                                                        {m.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Table Data View */}
                                    {msg.table && msg.table.headers.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-2">
                                                <TableIcon className="w-3.5 h-3.5 text-[#4085b3]" />
                                                <span>Tabular Breakdown ({msg.table.rows.length} records)</span>
                                            </div>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                                <table className="w-full text-left text-[11px]">
                                                    <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                                                        <tr>
                                                            {msg.table.headers.map((h, hIdx) => (
                                                                <th key={hIdx} className="px-3 py-2 whitespace-nowrap">
                                                                    {h}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {msg.table.rows.map((row, rIdx) => (
                                                            <tr key={rIdx} className="hover:bg-slate-50/80">
                                                                {row.map((cell, cIdx) => (
                                                                    <td key={cIdx} className="px-3 py-2 text-slate-800 whitespace-nowrap">
                                                                        {cell === null ? "—" : String(cell)}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Executed SQL Toggle */}
                                    {msg.sql && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedSqlId(expandedSqlId === msg.id ? null : msg.id)}
                                                className="text-[11px] font-medium text-slate-600 hover:text-[#4085b3] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                                <Database className="w-3 h-3 text-slate-500" />
                                                <span>{expandedSqlId === msg.id ? "Hide SQL Query" : "View Executed SQL"}</span>
                                                {expandedSqlId === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>

                                            {expandedSqlId === msg.id && (
                                                <div className="mt-2 p-2.5 rounded bg-slate-900 text-cyan-300 font-mono text-[10px] overflow-x-auto relative group">
                                                    <div className="flex justify-between items-center pb-1 mb-1 border-b border-slate-800 text-[9px] text-slate-400">
                                                        <span>PostgreSQL Dialect</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopySql(msg.id, msg.sql!)}
                                                            className="flex items-center gap-1 text-slate-300 hover:text-white"
                                                        >
                                                            {copiedSqlId === msg.id ? (
                                                                <>
                                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                                    <span className="text-emerald-400">Copied</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="w-3 h-3" />
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <code>{msg.sql}</code>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Message Footer Info */}
                                <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                                    <span>{msg.timestamp}</span>
                                    {msg.executionTimeMs && (
                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                                            <Zap className="w-2.5 h-2.5" />
                                            <span>{(msg.executionTimeMs / 1000).toFixed(2)}s</span>
                                        </span>
                                    )}
                                </div>

                                {/* Suggested Follow-ups */}
                                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                                    <div className="pt-1 flex flex-wrap gap-1.5">
                                        {msg.suggestedFollowUps.map((fu, fIdx) => (
                                            <button
                                                key={fIdx}
                                                type="button"
                                                onClick={() => handleSubmit(fu)}
                                                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-[#4085b3] border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                                            >
                                                {fu}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {msg.role === "user" && (
                                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                    <User className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4085b3] to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-600 flex items-center gap-2.5">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-[#4085b3] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-[#4085b3] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-[#4085b3] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                </div>
                                <span className="font-medium text-slate-700">Translating to SQL and querying database...</span>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Footer Input Area */}
                <div className="p-4 border-t border-slate-200 bg-white">
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                        className="relative"
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask EMIS AI (e.g. How many schools have below 100 teachers?)..."
                            rows={2}
                            disabled={loading}
                            className="w-full text-xs sm:text-sm pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent resize-none placeholder:text-slate-400 bg-slate-50/50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-[#4085b3] hover:bg-[#32698e] text-white disabled:opacity-40 disabled:hover:bg-[#4085b3] transition-colors cursor-pointer"
                            title="Send query"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                        <span>Press Enter to send, Shift+Enter for new line</span>
                        <span>Powered by Gemini 2.5 Flash</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
