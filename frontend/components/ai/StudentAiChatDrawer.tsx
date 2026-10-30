"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Sparkles,
    X,
    ArrowUp,
    ChevronDown,
    RotateCcw,
    CornerDownLeft,
    Check,
    Copy,
    Maximize2,
    Minimize2,
    ExternalLink
} from "lucide-react";
import { fetchApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export interface StudentChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    executionTimeMs?: number;
    suggestedFollowUps?: string[];
    timestamp: string;
}

interface StudentAiChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuestion?: string;
}

const DEFAULT_SUBJECTS = [
    "Mathematics",
    "English",
    "Physics",
    "Chemistry",
    "Biology",
    "History",
    "Civics",
    "Geography"
];

function getSubjectPrompts(subject: string): string[] {
    const norm = (subject || "").toLowerCase();
    if (norm.includes("math") || norm.includes("algebra") || norm.includes("calculus") || norm.includes("geometry")) {
        return [
            "Explain quadratic equations step-by-step",
            "How do I solve systems of linear equations using substitution?",
            "Give me a quick way to remember trigonometric identities",
            "What are the most common exam traps in algebra?"
        ];
    }
    if (norm.includes("phys")) {
        return [
            "Explain Newton's third law with real-world examples",
            "How do I distinguish work, kinetic energy, and potential energy?",
            "Walk me through a conservation of momentum problem",
            "Why is acceleration zero at terminal velocity?"
        ];
    }
    if (norm.includes("chem")) {
        return [
            "How do I balance redox equations easily?",
            "Explain ionic vs covalent bonding with everyday examples",
            "What is Le Chatelier's principle and how does pressure affect it?",
            "How do I calculate molarity step-by-step?"
        ];
    }
    if (norm.includes("bio")) {
        return [
            "Explain the main stages of cellular respiration simply",
            "What is the difference between mitosis and meiosis?",
            "How does DNA transcription and translation work?",
            "Explain enzyme-substrate specificity and active sites"
        ];
    }
    if (norm.includes("eng") || norm.includes("lit")) {
        return [
            "How do I write a compelling thesis statement?",
            "Explain metaphor vs simile with creative examples",
            "How do I identify active vs passive voice?",
            "Give me the standard structure of a persuasive 5-paragraph essay"
        ];
    }
    if (norm.includes("hist")) {
        return [
            "What were the primary triggers of World War I?",
            "Explain the key economic impacts of the Industrial Revolution",
            "How do I critically analyze primary vs secondary sources?",
            "Summarize the major turning points of the Cold War"
        ];
    }
    if (norm.includes("civic") || norm.includes("gov") || norm.includes("social")) {
        return [
            "Explain the separation of powers among the three branches",
            "What is the difference between direct democracy and representative democracy?",
            "How are constitutional rights protected?",
            "Why is civic participation important in a community?"
        ];
    }
    if (norm.includes("geo")) {
        return [
            "Explain plate tectonics and how earthquakes happen",
            "What determines different global climate zones?",
            "How do ocean currents affect weather patterns?",
            "Explain the demographic transition model simply"
        ];
    }
    return [
        `Explain the fundamental concepts in ${subject} simply`,
        `Walk me through a step-by-step example problem in ${subject}`,
        `What are the most tested exam topics in ${subject}?`,
        `Give me 3 memory tricks for key ${subject} definitions`
    ];
}

export default function StudentAiChatDrawer({
    isOpen,
    onClose,
    initialQuestion
}: StudentAiChatDrawerProps) {
    const { authData } = useAuth();
    const studentName = authData?.user?.name ? authData.user.name.split(" ")[0] : "Student";

    const [messages, setMessages] = useState<StudentChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState("Analyzing academic concepts...");
    const [activeSubject, setActiveSubject] = useState<string>("Mathematics");
    const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
    const [prompts, setPrompts] = useState<string[]>(() => getSubjectPrompts("Mathematics"));
    const [copiedId, setCopiedId] = useState<string | null>(null);
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

    // Update starter prompts when active subject changes
    useEffect(() => {
        setPrompts(getSubjectPrompts(activeSubject));
    }, [activeSubject]);

    // Cycling reasoning stages while loading
    useEffect(() => {
        if (!loading) return;
        setLoadingStage(`Analyzing ${activeSubject} concepts...`);
        const timer = setTimeout(() => {
            setLoadingStage("Synthesizing step-by-step guidance...");
        }, 1800);
        return () => clearTimeout(timer);
    }, [loading, activeSubject]);

    // Fetch enrolled subjects on mount
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadSubjects = async () => {
            try {
                const res = await fetchApi("/student/dashboard");
                if (res && res.ok) {
                    const data = await res.json();
                    if (isMounted && Array.isArray(data.subjects) && data.subjects.length > 0) {
                        const list = data.subjects
                            .map((s: any) => s.subject?.name || s.name)
                            .filter(Boolean);
                        if (list.length > 0) {
                            const uniqueList = Array.from(new Set(list)) as string[];
                            setEnrolledSubjects(uniqueList);
                            if (!uniqueList.includes(activeSubject)) {
                                setActiveSubject(uniqueList[0]);
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not load enrolled subjects", err);
            }
        };

        loadSubjects();
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

        const startTime = Date.now();
        const userMsgId = `user-${startTime}`;
        const newMessages: StudentChatMessage[] = [
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
            // Build recent conversational history (up to last 6 turns)
            const history = newMessages.slice(-6).map((m) => ({
                role: m.role === "user" ? ("user" as const) : ("model" as const),
                text: m.content
            }));

            // Strictly calls student tutor endpoint — isolated from any admin or school data
            const res = await fetchApi("/student/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: activeSubject,
                    enrolledSubjects,
                    history,
                    message: queryText
                })
            });

            const data = await res.json().catch(() => ({}));
            const elapsed = Date.now() - startTime;

            if (res.ok && data.reply) {
                const assistantMsgId = `assistant-${Date.now()}`;
                const assistantMsg: StudentChatMessage = {
                    id: assistantMsgId,
                    role: "assistant",
                    content: data.reply,
                    executionTimeMs: elapsed,
                    suggestedFollowUps: data.suggestedFollowUps || [],
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                };

                setMessages([...newMessages, assistantMsg]);
            } else {
                setMessages([
                    ...newMessages,
                    {
                        id: `fallback-${Date.now()}`,
                        role: "assistant",
                        content:
                            data.reply ||
                            `In **${activeSubject}**, remember to always write down the given information, identify the fundamental theorem or formula, and check your work step-by-step. What specific problem or example should we explore?`,
                        executionTimeMs: elapsed,
                        suggestedFollowUps: [
                            "Show a worked example step-by-step",
                            "What is a common exam trap here?",
                            "Explain the core formula simply"
                        ],
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    }
                ]);
            }
        } catch (err) {
            console.error("Student AI Quick Chat error", err);
            setMessages([
                ...newMessages,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: "Unable to reach EduBridge AI services right now. Please verify your connection and try asking again.",
                    suggestedFollowUps: ["Try again"],
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (msgId: string, text: string) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedId(msgId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none select-text">
            {/* Subtle backdrop overlay for mobile screens */}
            <div
                className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] pointer-events-auto sm:hidden transition-opacity"
                onClick={onClose}
            />

            {/* Canva-Style Floating Popover Card matching Admin UI */}
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
                        {/* Subject Selector Pill matching Scope Badge */}
                        <div className="relative inline-flex items-center">
                            <select
                                value={activeSubject}
                                onChange={(e) => setActiveSubject(e.target.value)}
                                className="appearance-none pl-2.5 pr-6 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100/70 hover:bg-blue-100 text-blue-800 border-none outline-none cursor-pointer transition-colors"
                                title="Switch Subject"
                            >
                                {enrolledSubjects.map((s) => (
                                    <option key={s} value={s} className="bg-white text-slate-800 text-xs font-normal normal-case">
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-2.5 h-2.5 text-blue-800 pointer-events-none absolute right-1.5" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Full Workspace Link */}
                        <Link
                            href="/dashboard/student/assistant?mode=explain"
                            onClick={onClose}
                            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-[#2563eb] hover:bg-white/80 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Open full tutor workspace"
                        >
                            <span className="hidden xs:inline">Full Workspace</span>
                            <ExternalLink className="w-3 h-3" />
                        </Link>

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
                    {/* Canva Style Hero Greeting (Empty State matching Admin) */}
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col justify-center py-6 px-2 text-center space-y-4">
                            <div className="space-y-1.5">
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                                    Get{" "}
                                    <span className="bg-gradient-to-r from-[#2563eb] to-[#0ea5e9] bg-clip-text text-transparent">
                                        guidance
                                    </span>{" "}
                                    with
                                    <br />
                                    anything {activeSubject}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Fast concept explanations & homework assistance. Powered by Gemini AI.
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
                                    <div className="flex items-center justify-between">
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

                                        <button
                                            type="button"
                                            onClick={() => handleCopy(msg.id, msg.content)}
                                            className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
                                            title="Copy response"
                                        >
                                            {copiedId === msg.id ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Direct Text Output */}
                                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-5 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>

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
                            placeholder={`How can I help with ${activeSubject}?`}
                            disabled={loading}
                            className="w-full text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-1"
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="w-7 h-7 ml-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-[#2563eb] shrink-0 cursor-pointer shadow-xs"
                            title="Send question"
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                    </form>

                    {/* Centered Footnote */}
                    <p className="text-[10px] text-slate-400 text-center pt-2 select-none">
                        AI can make mistakes. Verify important academic formulas.
                    </p>
                </div>
            </div>
        </div>
    );
}
