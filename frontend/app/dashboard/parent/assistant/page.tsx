"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Sparkles,
    Bot,
    Compass,
    TrendingUp,
    Lightbulb,
    ChevronDown,
    Check,
    ArrowLeft,
    Brain,
    HelpCircle,
    MessageSquare,
    BookOpen,
    Send
} from "lucide-react";

function AssistantContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "progress";

    const [profile, setProfile] = useState<any>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [promptText, setPromptText] = useState("");
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        async function fetchProfile() {
            try {
                setLoading(true);
                const res = await fetch("/api/parent/me");
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (err) {
                console.error("Failed to load parent profile", err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentStudent = hasChildren ? children[selectedChildIndex]?.student : null;
    const studentFullName = currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : "Student";

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Header Panel with Dropdown Student Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm text-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/parent"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#4085b3] transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Dashboard
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Sparkles className="w-7 h-7 text-purple-600" />
                        AI Parent Assistant
                    </h1>
                    <p className="text-sm text-gray-500">
                        Intelligent learning insights, score explanations, and home study advice for {studentFullName}.
                    </p>
                </div>

                {/* Single Student Selector Dropdown Button */}
                {children.length > 0 && (
                    <div className="relative flex-shrink-0" ref={dropdownRef}>
                        <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center justify-between">
                            <span>Active Student</span>
                            {children.length > 1 && (
                                <span className="text-[11px] text-[#4085b3] font-medium">
                                    {selectedChildIndex + 1} of {children.length}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full sm:w-auto min-w-[240px] flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-300 hover:border-[#4085b3] rounded-xl shadow-sm hover:shadow transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {currentStudent?.firstName?.[0] || "S"}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">
                                        {studentFullName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        ID: {currentStudent?.studentId || "N/A"}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {isDropdownOpen && children.length > 1 && (
                            <div className="absolute right-0 mt-2 w-full sm:w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                                {children.map((child: any, idx: number) => {
                                    const s = child.student;
                                    const isSelected = idx === selectedChildIndex;
                                    return (
                                        <button
                                            key={s?.id || idx}
                                            onClick={() => {
                                                setSelectedChildIndex(idx);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                                                isSelected ? "bg-purple-50/70 font-semibold text-purple-900" : "text-gray-700"
                                            }`}
                                        >
                                            <div>
                                                <div>{s?.firstName} {s?.lastName}</div>
                                                <div className="text-xs text-gray-400">{s?.studentId}</div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 gap-6">
                <Link
                    href="/dashboard/parent/assistant"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "progress"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Progress Explanations
                </Link>
                <Link
                    href="/dashboard/parent/assistant?tab=guide"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "guide"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Compass className="w-4 h-4" />
                    Home Learning Advice
                </Link>
            </div>

            {/* Tailored Feature Overview Card */}
            <div className="bg-gradient-to-br from-purple-50/70 via-white to-pink-50/40 rounded-2xl border border-purple-100 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                            <Sparkles className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900">
                                <Bot className="w-3.5 h-3.5" />
                                AI Copilot for Parents
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                EduBridge AI Parent Assistant Hub
                            </h2>
                            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                                Get clear, jargon-free explanations of {studentFullName}'s assessment results and trends. Discover personalized home study strategies, recommended reading, and suggested topics to discuss during your next teacher meeting.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-purple-100/80 pt-6">
                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-purple-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Brain className="w-4 h-4 text-purple-600" />
                            Plain-Language Summaries
                        </div>
                        <p className="text-xs text-gray-600">
                            Translate complex rubric scores and test statistics into clear strengths and focus areas.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-purple-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                            Tailored Home Exercises
                        </div>
                        <p className="text-xs text-gray-600">
                            Curated daily learning activities that reinforce the specific topics your child is studying this week.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-purple-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-[#4085b3]" />
                            Teacher Meeting Prep
                        </div>
                        <p className="text-xs text-gray-600">
                            Prepares constructive, targeted questions to ask subject teachers to best support your student.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Assistant Interactive Consultation Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">
                            Ask EduBridge AI about {studentFullName}&apos;s progress
                        </h3>
                        <p className="text-xs text-gray-500">
                            Type a question or pick one of the sample inquiries below.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        "How can I help my child prepare for upcoming math exams?",
                        "Explain the latest assessment grades in simple terms.",
                        "What study routine is recommended for their grade level?"
                    ].map((sample, idx) => (
                        <button
                            key={idx}
                            onClick={() => setPromptText(sample)}
                            className="text-xs bg-purple-50 hover:bg-purple-100/80 text-purple-900 px-3 py-1.5 rounded-lg border border-purple-200/60 transition-colors text-left"
                        >
                            &ldquo;{sample}&rdquo;
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder={`Ask AI about ${studentFullName}'s performance, homework advice, or learning habits...`}
                        className="w-full pr-28 pl-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all text-gray-800"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (!promptText.trim()) return;
                            alert(`AI Assistant preview: Your query regarding ${studentFullName} has been received. Live conversational AI responses are rolling out with the semester update.`);
                        }}
                        className="absolute right-2 top-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <Send className="w-3.5 h-3.5" />
                        Inquire
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AssistantPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading AI assistant...</div>}>
            <AssistantContent />
        </Suspense>
    );
}
