"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Sparkles,
    X,
    ArrowUp,
    ChevronDown,
    ChevronUp,
    Database,
    RotateCcw,
    CornerDownLeft,
    Table as TableIcon,
    Check,
    Copy,
    Building2
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
    const [loadingStage, setLoadingStage] = useState("Analyzing institutional data...");
    const [prompts, setPrompts] = useState<string[]>([]);
    const [scopeInfo, setScopeInfo] = useState<{ level: string; name: string } | null>(null);
    const [expandedSqlId, setExpandedSqlId] = useState<string | null>(null);
    const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [isOpen, messages, loading]);

    // Cycling reasoning stages while loading
    useEffect(() => {
        if (!loading) return;
        setLoadingStage("Analyzing institutional records...");
        const timer = setTimeout(() => {
            setLoadingStage("Synthesizing executive insights...");
        }, 1800);
        return () => clearTimeout(timer);
    }, [loading]);

    // Fetch suggested starter prompts
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

    // Initial question trigger
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
                throw new Error(json.error || "Unable to complete request.");
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
                content: error.message || "An unexpected error occurred while analyzing records.",
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
        setTimeout(() => setCopiedSqlId(null), 1800);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
                {/* Clean Modern Minimal Header */}
                <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb]">
                            <Sparkles className="w-4 h-4 text-[#2563eb]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-sm tracking-tight text-slate-900">EMIS Copilot</h2>
                                {scopeInfo && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        {scopeInfo.level === "FEDERAL" ? "National" : scopeInfo.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setMessages([])}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Clear chat"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                    {/* Clean Empty State */}
                    {messages.length === 0 && (
                        <div className="py-10 max-w-md mx-auto text-center space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] mx-auto shadow-xs">
                                <Sparkles className="w-6 h-6 text-[#2563eb]" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-slate-900 text-base">Educational Intelligence</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    Ask natural questions about institutions, faculty, student enrollment, and regional administrative metrics.
                                </p>
                            </div>

                            {/* Clean Starter Prompt Chips */}
                            {prompts.length > 0 && (
                                <div className="pt-2 text-left space-y-2">
                                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-1">
                                        Suggested inquiries
                                    </span>
                                    <div className="flex flex-col gap-1.5">
                                        {prompts.map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSubmit(p)}
                                                className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-blue-50/50 hover:border-blue-300 hover:text-blue-700 text-slate-700 transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                                            >
                                                <span>{p}</span>
                                                <CornerDownLeft className="w-3 h-3 text-slate-300 group-hover:text-blue-500 shrink-0 ml-2" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages Flow */}
                    {messages.map(msg => (
                        <div key={msg.id} className="space-y-2">
                            {/* USER MESSAGE: Compact, sleek pill on right */}
                            {msg.role === "user" ? (
                                <div className="flex justify-end">
                                    <div className="max-w-[80%]">
                                        <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-[#2563eb] text-white text-xs sm:text-sm font-medium shadow-xs leading-relaxed">
                                            {msg.content}
                                        </div>
                                        <span className="block text-[10px] text-slate-400 text-right mt-1 px-1">
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* ASSISTANT MESSAGE: Clean, unboxed natural flow */
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                                        <span className="font-semibold text-slate-700">Copilot</span>
                                        <span>•</span>
                                        <span className="text-[10px]">{msg.timestamp}</span>
                                        {msg.executionTimeMs && (
                                            <>
                                                <span>•</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {(msg.executionTimeMs / 1000).toFixed(1)}s
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Direct Text Output */}
                                    <div className="text-sm text-slate-800 leading-relaxed pl-5 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>

                                    {/* Minimalist Key Metric Chips */}
                                    {msg.metrics && msg.metrics.length > 0 && (
                                        <div className="pl-5 flex flex-wrap gap-2 pt-1">
                                            {msg.metrics.map((m, idx) => (
                                                <div
                                                    key={idx}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs"
                                                >
                                                    <span className="text-slate-500 font-medium">{m.label}:</span>
                                                    <span className="font-bold text-[#1d4ed8] text-sm">{m.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tabular Data View */}
                                    {msg.table && msg.table.headers.length > 0 && (
                                        <div className="pl-5 pt-1">
                                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                        <tr>
                                                            {msg.table.headers.map((h, hIdx) => (
                                                                <th key={hIdx} className="px-3.5 py-2 whitespace-nowrap">
                                                                    {h}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {msg.table.rows.map((row, rIdx) => (
                                                            <tr key={rIdx} className="hover:bg-slate-50/60">
                                                                {row.map((cell, cIdx) => (
                                                                    <td key={cIdx} className="px-3.5 py-2 text-slate-700 whitespace-nowrap">
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

                                    {/* Delicate Query Details Expander */}
                                    {msg.sql && (
                                        <div className="pl-5 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedSqlId(expandedSqlId === msg.id ? null : msg.id)}
                                                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                                <Database className="w-3 h-3 text-slate-400" />
                                                <span>{expandedSqlId === msg.id ? "Hide query" : "Query details"}</span>
                                                {expandedSqlId === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>

                                            {expandedSqlId === msg.id && (
                                                <div className="mt-1.5 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto relative group">
                                                    <div className="flex justify-between items-center pb-1 mb-1.5 border-b border-slate-800 text-[9px] text-slate-400">
                                                        <span>PostgreSQL Query</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopySql(msg.id, msg.sql!)}
                                                            className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
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

                                    {/* Compact Wrapping Follow-up Tag Chips */}
                                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                                        <div className="pl-5 pt-1.5 flex flex-wrap gap-1.5">
                                            {msg.suggestedFollowUps.map((fu, fIdx) => (
                                                <button
                                                    key={fIdx}
                                                    type="button"
                                                    onClick={() => handleSubmit(fu)}
                                                    className="text-[11px] px-3 py-1 rounded-full bg-slate-100/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200/60 text-slate-600 transition-all cursor-pointer"
                                                >
                                                    {fu}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Clean Subtle Reasoning / Thinking State */}
                    {loading && (
                        <div className="flex items-center gap-2.5 text-xs text-slate-500 pl-1 py-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                            </span>
                            <span className="font-medium animate-pulse">{loadingStage}</span>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Modern Command Bar Input (Linear Style) */}
                <div className="p-4 border-t border-slate-200/80 bg-white">
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                        className="relative rounded-2xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 bg-white transition-all shadow-2xs"
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask EMIS Copilot (e.g. How many schools have below 100 teachers?)..."
                            rows={2}
                            disabled={loading}
                            className="w-full text-xs sm:text-sm px-3.5 pt-3 pb-8 rounded-2xl border-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-400 bg-transparent text-slate-800"
                        />

                        {/* Bottom Action Bar inside the Input Box */}
                        <div className="absolute left-3.5 right-2.5 bottom-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 select-none">
                                ↵ to send • Shift+↵ for new line
                            </span>

                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="w-7 h-7 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-[#2563eb] cursor-pointer shadow-xs"
                                title="Send query"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
