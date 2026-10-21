"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
    MessageSquare,
    Megaphone,
    Calendar,
    Send,
    User,
    Users,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    Building2,
    CalendarCheck,
    Plus,
    FileText,
    Check,
    Sparkles
} from "lucide-react";

function CommunicationContent() {
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "messages";

    const [profile, setProfile] = useState<any>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Teachers & Messaging state
    const [teachers, setTeachers] = useState<any[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessageText, setNewMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [msgLoading, setMsgLoading] = useState(false);

    // Announcements state
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [annLoading, setAnnLoading] = useState(false);

    // Meetings state
    const [meetings, setMeetings] = useState<any[]>([]);
    const [meetingsLoading, setMeetingsLoading] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [meetingForm, setMeetingForm] = useState({
        title: "",
        agenda: "",
        preferredDate: "",
        location: "School Conference Room"
    });
    const [submittingMeeting, setSubmittingMeeting] = useState(false);
    const [meetingSuccessMsg, setMeetingSuccessMsg] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

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
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentStudent = hasChildren ? children[selectedChildIndex]?.student : null;

    // Fetch teachers for current student
    useEffect(() => {
        async function fetchTeachers() {
            if (!currentStudent?.id) return;
            try {
                setMsgLoading(true);
                const res = await fetch(`/api/parent/children/${currentStudent.id}/teachers`);
                if (res.ok) {
                    const data = await res.json();
                    setTeachers(data);
                    if (data.length > 0 && !selectedTeacher) {
                        setSelectedTeacher(data[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to load teachers", err);
            } finally {
                setMsgLoading(false);
            }
        }
        fetchTeachers();
    }, [currentStudent?.id]);

    // Fetch messages
    const fetchMessages = async () => {
        try {
            const res = await fetch("/api/parent/messages");
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 12000);
        return () => clearInterval(interval);
    }, []);

    // Fetch announcements
    useEffect(() => {
        async function fetchAnnouncements() {
            try {
                setAnnLoading(true);
                const res = await fetch("/api/parent/announcements");
                if (res.ok) {
                    const data = await res.json();
                    setAnnouncements(data);
                }
            } catch (err) {
                console.error("Failed to load announcements", err);
            } finally {
                setAnnLoading(false);
            }
        }
        fetchAnnouncements();
    }, []);

    // Fetch meetings
    useEffect(() => {
        async function fetchMeetings() {
            try {
                setMeetingsLoading(true);
                const res = await fetch("/api/parent/meetings-list");
                if (res.ok) {
                    const data = await res.json();
                    setMeetings(data);
                }
            } catch (err) {
                console.error("Failed to load meetings", err);
            } finally {
                setMeetingsLoading(false);
            }
        }
        fetchMeetings();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, selectedTeacher]);

    const setTab = (tabName: string) => {
        const url = new URL(window.location.href);
        if (tabName === "messages") {
            url.searchParams.delete("tab");
        } else {
            url.searchParams.set("tab", tabName);
        }
        window.history.pushState({}, "", url.toString());
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !selectedTeacher?.userId) return;

        try {
            setSendingMessage(true);
            const res = await fetch("/api/parent/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId: selectedTeacher.userId,
                    content: newMessageText.trim()
                })
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages(prev => [...prev, sentMsg]);
                setNewMessageText("");
            }
        } catch (err) {
            console.error("Failed to send message", err);
        } finally {
            setSendingMessage(false);
        }
    };

    const handleRequestMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!meetingForm.title.trim()) return;

        try {
            setSubmittingMeeting(true);
            const res = await fetch("/api/parent/meetings/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(meetingForm)
            });

            if (res.ok) {
                const newMeeting = await res.json();
                setMeetings(prev => [newMeeting, ...prev]);
                setMeetingSuccessMsg("Your meeting request has been submitted to the school administration.");
                setMeetingForm({ title: "", agenda: "", preferredDate: "", location: "School Conference Room" });
                setTimeout(() => {
                    setShowRequestModal(false);
                    setMeetingSuccessMsg("");
                }, 2000);
            }
        } catch (err) {
            console.error("Failed to request meeting", err);
        } finally {
            setSubmittingMeeting(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse">
                <div className="h-32 bg-gray-100 rounded-2xl" />
                <div className="h-96 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    if (!currentStudent) {
        return (
            <div className="w-full max-w-5xl mx-auto p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-center space-y-3">
                <Users className="w-12 h-12 mx-auto text-amber-600 opacity-60" />
                <h3 className="font-bold text-base">No Linked Student Found</h3>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                    There is currently no student linked to your account. Please contact the school administration to link your student profile.
                </p>
            </div>
        );
    }

    const studentFullName = `${currentStudent.firstName} ${currentStudent.lastName}`;

    // Filter messages for current selected teacher
    const currentConversation = messages.filter(
        m => (selectedTeacher && (m.senderId === selectedTeacher.userId || m.receiverId === selectedTeacher.userId))
    );

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Header Panel - Clean White Background */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                                Communication Hub
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active School Link
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 text-gray-900">
                            Parent Communication Portal
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Direct teacher messaging, official school announcements, and consultation meeting requests for <strong className="text-gray-900">{studentFullName}</strong>.
                        </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl text-center shrink-0">
                        <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block">Assigned Teachers</span>
                        <span className="text-2xl sm:text-3xl font-extrabold text-[#184973]">
                            {teachers.length}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                            Available for Direct Contact
                        </span>
                    </div>
                </div>
            </div>

            {/* Child Switcher (if multiple children) */}
            {children.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Select Child:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {children.map((rel: any, idx: number) => {
                            const isSelected = idx === selectedChildIndex;
                            const ch = rel.student;
                            return (
                                <button
                                    key={ch.id || idx}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                        isSelected
                                            ? "bg-[#184973] text-white shadow-sm"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                                        {ch.firstName?.[0] || "S"}
                                    </div>
                                    <span>{ch.firstName} {ch.lastName}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({ch.studentId})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setTab("messages")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "messages"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Teacher Messages ({teachers.length})</span>
                </button>

                <button
                    onClick={() => setTab("announcements")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "announcements"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <Megaphone className="w-4 h-4" />
                    <span>School Announcements ({announcements.length})</span>
                </button>

                <button
                    onClick={() => setTab("meetings")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "meetings"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Meeting Requests & Conferences ({meetings.length})</span>
                </button>
            </div>

            {/* TAB 1: TEACHER MESSAGES (1-ON-1) */}
            {currentTab === "messages" && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
                    {/* Teachers Sidebar */}
                    <div className="border-r border-gray-200 p-4 space-y-3 bg-slate-50/50">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Assigned Teachers
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">
                                {teachers.length} Contacts
                            </span>
                        </div>

                        {msgLoading ? (
                            <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                                Loading assigned teachers...
                            </div>
                        ) : teachers.length === 0 ? (
                            <div className="py-8 text-center space-y-1">
                                <User className="w-8 h-8 text-gray-300 mx-auto" />
                                <p className="text-xs text-gray-500">No teachers assigned to section yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {teachers.map((t: any) => {
                                    const isSelected = selectedTeacher?.userId === t.userId;
                                    return (
                                        <button
                                            key={t.userId}
                                            onClick={() => setSelectedTeacher(t)}
                                            className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-start gap-3 cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#184973] text-white shadow-sm"
                                                    : "bg-white border border-gray-200 text-gray-800 hover:bg-gray-100"
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                                isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-[#184973]"
                                            }`}>
                                                {t.fullName?.[0] || "T"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold truncate">{t.fullName}</span>
                                                    {t.isHomeroom && (
                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                                            isSelected ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-800"
                                                        }`}>
                                                            Homeroom
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-[11px] truncate mt-0.5 ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                                    {t.subjects?.join(", ") || "Subject Teacher"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Chat Conversation Area */}
                    <div className="md:col-span-2 flex flex-col justify-between bg-white h-full min-h-[500px]">
                        {/* Conversation Header */}
                        {selectedTeacher ? (
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#184973] font-bold text-sm">
                                        {selectedTeacher.fullName?.[0] || "T"}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-900">{selectedTeacher.fullName}</h3>
                                        <p className="text-xs text-gray-500">
                                            {selectedTeacher.subjects?.join(", ")} • {selectedTeacher.email}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                                    Verified Teacher
                                </span>
                            </div>
                        ) : (
                            <div className="p-4 border-b border-gray-200 text-xs text-gray-500">
                                Select a teacher on the left to start a direct message.
                            </div>
                        )}

                        {/* Messages Feed */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[400px]">
                            {currentConversation.length === 0 ? (
                                <div className="py-16 text-center space-y-2">
                                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
                                    <h4 className="font-bold text-sm text-gray-900">No Messages Exchanged Yet</h4>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        Send a message directly to {selectedTeacher?.fullName || "the teacher"} regarding your child's academic or classroom progress.
                                    </p>
                                </div>
                            ) : (
                                currentConversation.map((msg: any) => {
                                    const isFromMe = msg.senderId === profile?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isFromMe ? "items-end" : "items-start"}`}
                                        >
                                            <div
                                                className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                                                    isFromMe
                                                        ? "bg-[#184973] text-white rounded-br-none"
                                                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                                                }`}
                                            >
                                                <p className="whitespace-pre-line">{msg.content}</p>
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 font-mono">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Box */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-gray-50/60 flex items-center gap-2">
                            <input
                                type="text"
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                placeholder={selectedTeacher ? `Write a message to ${selectedTeacher.fullName}...` : "Select a teacher first"}
                                disabled={!selectedTeacher || sendingMessage}
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#184973]/30 focus:border-[#184973]"
                            />
                            <button
                                type="submit"
                                disabled={!newMessageText.trim() || sendingMessage || !selectedTeacher}
                                className="bg-[#184973] hover:bg-[#1f5c91] disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>{sendingMessage ? "Sending..." : "Send"}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB 2: SCHOOL ANNOUNCEMENTS */}
            {currentTab === "announcements" && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-[#184973]" />
                                <span>Official School Announcements</span>
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">{announcements.length} announcement(s)</span>
                        </div>

                        {annLoading ? (
                            <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
                                Loading announcements...
                            </div>
                        ) : announcements.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <Megaphone className="w-10 h-10 text-gray-300 mx-auto" />
                                <h4 className="font-bold text-sm text-gray-900">No Active Announcements</h4>
                                <p className="text-xs text-gray-500">School-wide notices and event schedules will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {announcements.map((item: any) => {
                                    const isCritical = item.priority === "CRITICAL" || item.priority === "HIGH";
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-5 rounded-2xl border transition-all ${
                                                isCritical
                                                    ? "bg-rose-50/70 border-rose-200 text-rose-950"
                                                    : "bg-white border-gray-200 text-gray-900 shadow-xs"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        isCritical ? "bg-rose-600 text-white" : "bg-blue-100 text-blue-800"
                                                    }`}>
                                                        {item.priority || "NORMAL"}
                                                    </span>
                                                    <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                                                </div>
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                                </span>
                                            </div>

                                            <p className="mt-3 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                                                {item.content}
                                            </p>

                                            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                                <span>Issued by: {item.author ? `${item.author.firstName} ${item.author.lastName}` : "School Administration"}</span>
                                                {item.category && <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">{item.category}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: MEETING REQUESTS & CONFERENCES */}
            {currentTab === "meetings" && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#184973]" />
                                    <span>Parent-Teacher Conferences & PTA Meetings</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Scheduled consultations and general parent assemblies.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="bg-[#184973] hover:bg-[#1f5c91] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Request Meeting</span>
                            </button>
                        </div>

                        {meetingsLoading ? (
                            <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
                                Loading meetings...
                            </div>
                        ) : meetings.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <CalendarCheck className="w-10 h-10 text-gray-300 mx-auto" />
                                <h4 className="font-bold text-sm text-gray-900">No Meetings Scheduled Yet</h4>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                    You have no scheduled conferences. Click "Request Meeting" above to propose a consultation with your child's teachers.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {meetings.map((m: any) => (
                                    <div
                                        key={m.id}
                                        className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full inline-block">
                                                    {m.meetingType?.replace(/_/g, " ") || "CONFERENCE"}
                                                </span>
                                                <h4 className="font-bold text-sm text-gray-900 mt-1">{m.title}</h4>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                m.status === "SCHEDULED" ? "bg-emerald-100 text-emerald-800" :
                                                m.status === "COMPLETED" ? "bg-gray-100 text-gray-700" :
                                                "bg-amber-100 text-amber-800"
                                            }`}>
                                                {m.status || "SCHEDULED"}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 text-xs text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{new Date(m.scheduledDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                <span>Location: {m.location || "Conference Hall"}</span>
                                            </div>
                                            {m.agenda && (
                                                <p className="mt-2 text-gray-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed">
                                                    <strong>Agenda:</strong> {m.agenda}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Propose / Request Meeting Modal */}
                    {showRequestModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                                        <CalendarCheck className="w-5 h-5 text-[#184973]" />
                                        <span>Request Parent-Teacher Consultation</span>
                                    </h3>
                                    <button
                                        onClick={() => setShowRequestModal(false)}
                                        className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {meetingSuccessMsg && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        <span>{meetingSuccessMsg}</span>
                                    </div>
                                )}

                                <form onSubmit={handleRequestMeeting} className="space-y-3.5 text-xs">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Reason / Subject of Meeting</label>
                                        <input
                                            type="text"
                                            required
                                            value={meetingForm.title}
                                            onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                                            placeholder="e.g. Midterm Mathematics Performance Review"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#184973]/30 focus:border-[#184973]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Preferred Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={meetingForm.preferredDate}
                                            onChange={(e) => setMeetingForm({ ...meetingForm, preferredDate: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#184973]/30 focus:border-[#184973]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Preferred Location / Format</label>
                                        <select
                                            value={meetingForm.location}
                                            onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#184973]/30 focus:border-[#184973]"
                                        >
                                            <option value="School Conference Room">In-Person at School</option>
                                            <option value="Online / Video Consultation">Online / Phone Consultation</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Topics / Agenda Details</label>
                                        <textarea
                                            rows={3}
                                            value={meetingForm.agenda}
                                            onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                                            placeholder="Specify questions or topics you would like to discuss with the teacher..."
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#184973]/30 focus:border-[#184973]"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setShowRequestModal(false)}
                                            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submittingMeeting}
                                            className="px-4 py-2 bg-[#184973] hover:bg-[#1f5c91] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                                        >
                                            {submittingMeeting ? "Submitting..." : "Submit Request"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CommunicationPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-gray-500 text-xs font-medium animate-pulse">
                    Loading communication portal...
                </div>
            </div>
        }>
            <CommunicationContent />
        </Suspense>
    );
}
