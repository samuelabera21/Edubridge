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
    Check,
    Copy,
    Maximize2,
    Minimize2
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
    const [isExpanded, setIsExpanded] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = async (questionText?: string) => {
        const queryText = (questionText || input).trim();
        if (!queryText || loading) return;

        const userMsgId = `user-${Date.now()}`;
        const newMessages: ChatMessage[] = [
            ...messages,
            {
                id: userMsgId,
                role: "user",
                content: queryText,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
        ];

        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetchApi("/ai-analytics/query", {
                method: "POST",
                body: JSON.stringify({ question: queryText })
            });

            const data = await res.json();

            if (data.success && data.data) {
                const assistantMsgId = `assistant-${Date.now()}`;
                const assistantMsg: ChatMessage = {
                    id: assistantMsgId,
                    role: "assistant",
                    content: data.data.executiveSummary || "Analysis completed successfully.",
                    metrics: data.data.metrics || [],
                    table: data.data.table || undefined,
                    sql: data.data.sql || undefined,
                    executionTimeMs: data.data.executionTimeMs,
                    suggestedFollowUps: data.data.suggestedFollowUps || [],
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                };

                setMessages([...newMessages, assistantMsg]);
            } else {
                setMessages([
                    ...newMessages,
                    {
                        id: `error-${Date.now()}`,
                        role: "assistant",
                        content: data.error?.message || "I encountered an issue querying the database. Please try rephrasing your request.",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    }
                ]);
            }
        } catch (err) {
            console.error("AI query execution failed", err);
            setMessages([
                ...newMessages,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: "Unable to reach EMIS AI services. Please verify your network connection and retry.",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopySql = (msgId: string, sqlText: string) => {
        navigator.clipboard.writeText(sqlText);
        setCopiedSqlId(msgId);
        setTimeout(() => setCopiedSqlId(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none select-text">
            {/* Subtle backdrop overlay for mobile screens */}
            <div
                className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] pointer-events-auto sm:hidden transition-opacity"
                onClick={onClose}
            />

            {/* Canva-Style Floating Popover Card */}
            <div
                ref={cardRef}
                className={`fixed pointer-events-auto bg-white transition-all duration-300 ease-out flex flex-col overflow-hidden border border-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.22),0_0_1px_1px_rgba(15,23,42,0.06)] ${
                    isExpanded
                        ? "inset-4 sm:inset-y-6 sm:right-6 sm:left-auto sm:w-[560px] md:w-[620px] rounded-[28px]"
                        : "bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[410px] md:w-[430px] h-[580px] max-h-[82vh] rounded-[28px]"
                } animate-in fade-in zoom-in-95 duration-200`}
            >
                {/* Ethereal Gradient Header matching Canva's pastel ambiance */}
                <div className="px-5 pt-3.5 pb-2.5 bg-gradient-to-b from-[#e0f2fe]/70 via-[#f0f9ff]/40 to-white flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse to floating card" : "Expand window"}
                        >
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <span className="text-xs font-semibold text-slate-700 tracking-tight flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                            <span>EduBridge AI</span>
                        </span>
                        {scopeInfo && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100/70 text-blue-800">
                                {scopeInfo.level === "FEDERAL" ? "National" : scopeInfo.name}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setMessages([])}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                title="Clear conversation"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Stream / Empty State */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Canva Style Hero Greeting (Empty State) */}
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col justify-center py-6 px-2 text-center space-y-4">
                            <div className="space-y-1.5">
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                                    Get{" "}
                                    <span className="bg-gradient-to-r from-[#2563eb] to-[#0ea5e9] bg-clip-text text-transparent">
                                        intelligence
                                    </span>{" "}
                                    with
                                    <br />
                                    anything EduBridge
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Fast institutional insights. Powered by Gemini AI.
                                </p>
                            </div>

                            {/* Starter prompt cards */}
                            {prompts.length > 0 && (
                                <div className="pt-2 text-left space-y-2 max-w-sm mx-auto w-full">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                        Suggested questions
                                    </span>
                                    <div className="flex flex-col gap-1.5">
                                        {prompts.slice(0, 4).map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSubmit(p)}
                                                className="text-left text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-blue-50/50 hover:border-blue-300 hover:text-blue-700 text-slate-700 transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                                            >
                                                <span className="line-clamp-1">{p}</span>
                                                <CornerDownLeft className="w-3 h-3 text-slate-300 group-hover:text-blue-500 shrink-0 ml-2" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages Flow */}
                    {messages.map((msg) => (
                        <div key={msg.id} className="space-y-2">
                            {/* USER MESSAGE: Compact royal blue bubble */}
                            {msg.role === "user" ? (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%]">
                                        <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-[#2563eb] text-white text-xs sm:text-sm font-medium shadow-2xs leading-relaxed">
                                            {msg.content}
                                        </div>
                                        <span className="block text-[10px] text-slate-400 text-right mt-1 px-1">
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* ASSISTANT MESSAGE: Natural clean flow */
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                                        <span className="font-semibold text-slate-700">EduBridge AI</span>
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
                                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-5 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>

                                    {/* Minimalist Key Metric Chips */}
                                    {msg.metrics && msg.metrics.length > 0 && (
                                        <div className="pl-5 flex flex-wrap gap-2 pt-1">
                                            {msg.metrics.map((m, idx) => (
                                                <div
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs"
                                                >
                                                    <span className="text-slate-500 font-medium">{m.label}:</span>
                                                    <span className="font-bold text-[#1d4ed8]">{m.value}</span>
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
                                                                <th key={hIdx} className="px-3 py-1.5 whitespace-nowrap">
                                                                    {h}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {msg.table.rows.map((row, rIdx) => (
                                                            <tr key={rIdx} className="hover:bg-slate-50/60">
                                                                {row.map((cell, cIdx) => (
                                                                    <td key={cIdx} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
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

                                    {/* Query Details Expander */}
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
                                                <div className="mt-1.5 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto relative group">
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

                                    {/* Follow-up Question Chips */}
                                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                                        <div className="pl-5 pt-1 flex flex-wrap gap-1.5">
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

                    {/* Reasoning Indicator */}
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

                {/* Canva Style Floating Rounded Input Bar */}
                <div className="p-4 pt-2 bg-white border-t border-slate-100 shrink-0">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                        className="relative flex items-center rounded-full border border-slate-200/90 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 bg-slate-50/70 hover:bg-white focus-within:bg-white transition-all shadow-2xs px-4 py-1.5"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="How can I help?"
                            disabled={loading}
                            className="w-full text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-1"
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="w-7 h-7 ml-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-[#2563eb] shrink-0 cursor-pointer shadow-xs"
                            title="Send query"
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                    </form>

                    {/* Centered Footnote matching Canva */}
                    <p className="text-[10px] text-slate-400 text-center pt-2 select-none">
                        AI can make mistakes. Verify institutional figures.
                    </p>
                </div>
            </div>
        </div>
    );
}
