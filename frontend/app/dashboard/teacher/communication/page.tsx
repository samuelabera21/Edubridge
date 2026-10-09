"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    GraduationCap,
    Users,
    Building2,
    Shield,
    Send,
    Search,
    MessageSquare,
    UserCheck,
    Clock,
    CheckCircle2,
    AlertCircle,
    Inbox,
    Sparkles,
    Calendar,
    Phone,
    Mail,
    Filter,
    RefreshCw,
    User,
    ChevronRight,
    ArrowUpRight,
    MessageCircle,
    FileText,
    Bookmark
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

type CommunicationCategory = "STUDENT" | "PARENT" | "DEPARTMENT" | "STAFF";

interface ContactItem {
    id: string;
    studentId?: string;
    enrollmentId?: string;
    parentUserId?: string;
    name: string;
    subtitle: string;
    phone?: string;
    roleName?: string;
    type: CommunicationCategory;
    raw: any;
}

export default function TeacherCommunicationPage() {
    const { authData } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentUserId = authData?.user?.id;

    // Resolve active category from URL params (e.g. ?channel=STUDENT or ?tab=student)
    const channelParam = (searchParams?.get("channel") || searchParams?.get("tab") || "").toUpperCase();
    const [activeCategory, setActiveCategory] = useState<CommunicationCategory>("STUDENT");

    useEffect(() => {
        if (channelParam === "STUDENT" || channelParam === "STUDENTS") {
            setActiveCategory("STUDENT");
        } else if (channelParam === "PARENT" || channelParam === "PARENTS") {
            setActiveCategory("PARENT");
        } else if (channelParam === "DEPARTMENT" || channelParam === "DEPT") {
            setActiveCategory("DEPARTMENT");
        } else if (channelParam === "STAFF" || channelParam === "SCHOOL") {
            setActiveCategory("STAFF");
        }
    }, [channelParam]);

    // Data states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Contact lists
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [parentContacts, setParentContacts] = useState<any[]>([]);
    const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
    const [messagesHistory, setMessagesHistory] = useState<any[]>([]);

    // Active conversation selection
    const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);

    // Form states
    const [messageText, setMessageText] = useState("");
    const [messageSubject, setMessageSubject] = useState("");
    const [messageType, setMessageType] = useState("Academic Update");
    const [messagePriority, setMessagePriority] = useState<"NORMAL" | "HIGH" | "URGENT">("NORMAL");
    const [sending, setSending] = useState(false);
    const [statusBanner, setStatusBanner] = useState<string | null>(null);

    // Parent specific selection
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");

    // Load all data
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [myStudentsRes, parentRes, usersRes, msgRes] = await Promise.all([
                fetchApi("/teacher/my-students").catch(() => null),
                fetchApi("/communication/teacher/parent-contacts").catch(() => null),
                fetchApi("/communication/users").catch(() => null),
                fetchApi("/communication/messages").catch(() => null)
            ]);

            // 1. Students list
            if (myStudentsRes && myStudentsRes.ok) {
                const sData = await myStudentsRes.json();
                const list = Array.isArray(sData) ? sData : sData.students || [];
                setStudentsList(list);
            }

            // 2. Parent contacts list
            if (parentRes && parentRes.ok) {
                const pData = await parentRes.json();
                const pList = Array.isArray(pData) ? pData : [];
                setParentContacts(pList);
            }

            // 3. School staff & department users
            if (usersRes && usersRes.ok) {
                const uData = await usersRes.json();
                setSchoolUsers(Array.isArray(uData) ? uData : []);
            }

            // 4. Message History
            if (msgRes && msgRes.ok) {
                const mData = await msgRes.json();
                setMessagesHistory(Array.isArray(mData) ? mData : []);
            }
        } catch (err) {
            console.error("Failed to load communication contacts:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Switch Category Handler
    const handleCategoryChange = (cat: CommunicationCategory) => {
        setActiveCategory(cat);
        setSelectedContact(null);
        setSearchQuery("");
        setMessageText("");
        setMessageSubject("");
        router.push(`/dashboard/teacher/communication?channel=${cat}`);
    };

    // Filtered lists for the 4 categories
    const currentCategoryContacts: ContactItem[] = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        if (activeCategory === "STUDENT") {
            return studentsList
                .map((item: any): ContactItem => {
                    const st = item.student || item;
                    const firstName = (st.firstName || "").trim();
                    const fatherName = (st.fatherName || "").trim();
                    const grandfatherOrLastName = (st.grandfatherName || st.lastName || "").trim();
                    const fullName = [firstName, fatherName, grandfatherOrLastName].filter(Boolean).join(" ").trim() || st.name || "Enrolled Student";
                    const studentId = st.studentId || item.studentId || "";
                    const sectionName = item.section?.name || st.section?.name || "";
                    const gradeName = item.schoolGrade?.grade?.name || item.schoolGrade?.name || st.gradeName || "";
                    const subtitle = [
                        gradeName ? `Grade: ${gradeName}` : null,
                        sectionName ? `Section: ${sectionName}` : null
                    ].filter(Boolean).join(" • ") || "Assigned Student";

                    return {
                        id: st.id || item.id || studentId,
                        studentId,
                        enrollmentId: item.id !== st.id ? item.id : undefined,
                        name: fullName,
                        subtitle,
                        type: "STUDENT",
                        raw: item
                    };
                })
                .filter(c => !q || c.name.toLowerCase().includes(q) || c.studentId?.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        if (activeCategory === "PARENT") {
            // Group or format parent contacts
            return parentContacts
                .map((p: any): ContactItem => ({
                    id: `parent-${p.enrollmentId}`,
                    enrollmentId: p.enrollmentId,
                    parentUserId: p.parentUserId,
                    name: `${p.parentName} (${p.studentName}'s Guardian)`,
                    subtitle: `Student: ${p.studentName} • Grade: ${p.gradeName}${p.sectionName ? ` (${p.sectionName})` : ""}`,
                    phone: p.parentPhone,
                    type: "PARENT",
                    raw: p
                }))
                .filter(c => !q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        if (activeCategory === "DEPARTMENT") {
            // Filter school users for department peers & teachers
            return schoolUsers
                .filter((u: any) => {
                    const role = (u.role?.name || u.roleName || "").toUpperCase();
                    return role.includes("TEACHER") || role.includes("DEPARTMENT") || role.includes("HEAD") || role.includes("FACULTY");
                })
                .map((u: any): ContactItem => ({
                    id: u.id,
                    name: u.name || u.email,
                    subtitle: u.department || u.email || "Faculty Peer",
                    roleName: u.role?.description || u.role?.name || "Teacher / Department Peer",
                    type: "DEPARTMENT",
                    raw: u
                }))
                .filter(c => !q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q));
        }

        if (activeCategory === "STAFF") {
            // Filter school users for leadership, principal, admin, office
            return schoolUsers
                .filter((u: any) => {
                    const role = (u.role?.name || u.roleName || "").toUpperCase();
                    return !role.includes("STUDENT") && !role.includes("PARENT");
                })
                .map((u: any): ContactItem => ({
                    id: u.id,
                    name: u.name || u.email,
                    subtitle: u.role?.description || u.email || "School Staff",
                    roleName: u.role?.description || u.role?.name || "Staff Member",
                    type: "STAFF",
                    raw: u
                }))
                .filter(c => !q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q));
        }

        return [];
    }, [activeCategory, studentsList, parentContacts, schoolUsers, searchQuery]);

    // Conversation messages for active contact
    const activeMessages = useMemo(() => {
        if (!selectedContact) {
            return messagesHistory.slice(0, 10);
        }
        return messagesHistory.filter((m: any) => 
            (m.senderId === selectedContact.id && m.recipientId === currentUserId) ||
            (m.senderId === currentUserId && m.recipientId === selectedContact.id) ||
            (m.recipient?.name?.includes(selectedContact.name)) ||
            (selectedContact.name && m.content?.includes(selectedContact.name))
        );
    }, [messagesHistory, selectedContact, currentUserId]);

    // Send Message Handler
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        try {
            setSending(true);

            if (activeCategory === "PARENT" && selectedContact?.enrollmentId) {
                // Send Parent Message API
                const res = await fetchApi("/communication/teacher/parent-message", {
                    method: "POST",
                    body: JSON.stringify({
                        enrollmentId: selectedContact.enrollmentId,
                        content: messageText
                    })
                });

                if (res.ok) {
                    const sentItem = {
                        id: `temp-${Date.now()}`,
                        senderId: currentUserId,
                        sender: { name: authData?.user?.name || "Teacher" },
                        recipient: { name: selectedContact.name },
                        content: messageText,
                        createdAt: new Date().toISOString()
                    };
                    setMessagesHistory(prev => [sentItem, ...prev]);
                    setMessageText("");
                    setStatusBanner(`Message successfully sent to ${selectedContact.name}!`);
                    setTimeout(() => setStatusBanner(null), 4000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "Failed to send message to parent.");
                }
            } else if (selectedContact?.id) {
                // Direct User Message API
                const res = await fetchApi("/communication/messages", {
                    method: "POST",
                    body: JSON.stringify({
                        recipientId: selectedContact.id,
                        subject: messageSubject || `${messageType} (${activeCategory})`,
                        content: messageText,
                        priority: messagePriority
                    })
                });

                if (res.ok) {
                    const newMsg = await res.json();
                    setMessagesHistory(prev => [newMsg, ...prev]);
                    setMessageText("");
                    setMessageSubject("");
                    setStatusBanner(`Message successfully sent to ${selectedContact.name}!`);
                    setTimeout(() => setStatusBanner(null), 4000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "Failed to send direct message.");
                }
            } else {
                // Simulated log for student direct feedback
                const sentItem = {
                    id: `temp-${Date.now()}`,
                    senderId: currentUserId,
                    sender: { name: authData?.user?.name || "Teacher" },
                    recipient: { name: selectedContact?.name || "Student" },
                    content: messageText,
                    createdAt: new Date().toISOString()
                };
                setMessagesHistory(prev => [sentItem, ...prev]);
                setMessageText("");
                setStatusBanner(`Academic message dispatched to ${selectedContact?.name || 'recipient'}!`);
                setTimeout(() => setStatusBanner(null), 4000);
            }
        } catch (err: any) {
            alert(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    // Quick Templates per category
    const categoryTemplates = useMemo(() => {
        switch (activeCategory) {
            case "STUDENT":
                return [
                    "Great work on today's classroom exercise! Keep up the effort.",
                    "Please review Chapter 4 exercises before tomorrow's lesson.",
                    "Reminder: Assignment submission deadline is approaching.",
                    "Please see me during office hours regarding your practice questions."
                ];
            case "PARENT":
                return [
                    "Attendance Notification: Your student was absent today.",
                    "Progress Update: Commendable performance in recent evaluations.",
                    "Meeting Request: Would like to schedule a brief 10-minute check-in.",
                    "Homework Reminder: Please ensure assigned learning tasks are completed."
                ];
            case "DEPARTMENT":
                return [
                    "Department Meeting: Lesson coordination and curriculum pacing review.",
                    "Exam Moderation: Practice quiz drafts shared for review.",
                    "Resource Sharing: New reference material added for our subject.",
                    "Schedule Coordination: Reviewing weekly section coverage."
                ];
            case "STAFF":
                return [
                    "Administrative Inquiry regarding classroom resources.",
                    "Student Support follow-up with academic director.",
                    "Weekly teaching workload and timetable confirmation.",
                    "Official notice regarding upcoming academic activity."
                ];
        }
    }, [activeCategory]);

    // Auto-select first contact if none selected
    useEffect(() => {
        if (!selectedContact && currentCategoryContacts.length > 0) {
            setSelectedContact(currentCategoryContacts[0]);
            if (currentCategoryContacts[0].enrollmentId) {
                setSelectedEnrollmentId(currentCategoryContacts[0].enrollmentId);
            }
        }
    }, [currentCategoryContacts, selectedContact]);

    if (loading) {
        return <LoadingState message="Loading communication channels..." />;
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-4 pb-12 font-sans text-slate-800">
            {/* 4 Main Category Tabs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                {[
                    { id: "STUDENT", label: "Student Communication", icon: GraduationCap, count: studentsList.length, desc: "Assigned Students" },
                    { id: "PARENT", label: "Parent Communication", icon: Users, count: parentContacts.length, desc: "Guardians & Contacts" },
                    { id: "DEPARTMENT", label: "Department Communication", icon: Building2, count: schoolUsers.filter(u => (u.role?.name || "").includes("TEACHER")).length, desc: "Faculty & Peers" },
                    { id: "STAFF", label: "School Communication", icon: Shield, count: schoolUsers.length, desc: "Admin & Leadership" }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeCategory === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleCategoryChange(tab.id as CommunicationCategory)}
                            className={`p-3 rounded-xl text-left transition-all border flex items-start space-x-3 ${
                                isActive
                                    ? "bg-[#143e66] text-white border-[#143e66] shadow-xs"
                                    : "bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 border-slate-200/80"
                            }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 ${
                                isActive ? "bg-white/10 text-amber-300" : "bg-white text-slate-600 shadow-2xs"
                            }`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                                <div className="flex items-center space-x-1.5">
                                    <h3 className={`text-xs font-extrabold truncate ${isActive ? "text-amber-200" : "text-slate-900"}`}>
                                        {tab.label}
                                    </h3>
                                </div>
                                <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                                    {tab.desc} ({tab.count})
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Status Alert Banner */}
            {statusBanner && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-2xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{statusBanner}</span>
                </div>
            )}

            {/* Main Interactive Workspace (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Contact Directory (4 Cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[560px]">
                    <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800">
                                {activeCategory === "STUDENT" && "Assigned Students"}
                                {activeCategory === "PARENT" && "Student Guardians"}
                                {activeCategory === "DEPARTMENT" && "Department Faculty"}
                                {activeCategory === "STAFF" && "School Staff & Leadership"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                {currentCategoryContacts.length} Total
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search by name, ID or details...`}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
                        {currentCategoryContacts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 space-y-2">
                                <Inbox className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                <p className="text-xs font-semibold">No contacts found.</p>
                                <p className="text-[11px] text-slate-400">
                                    {searchQuery ? "Try a different search query." : "No registered contacts in this group."}
                                </p>
                            </div>
                        ) : (
                            currentCategoryContacts.map((contact, idx) => {
                                const isSelected = selectedContact?.id === contact.id;
                                return (
                                    <button
                                        key={contact.id || idx}
                                        onClick={() => {
                                            setSelectedContact(contact);
                                            if (contact.enrollmentId) {
                                                setSelectedEnrollmentId(contact.enrollmentId);
                                            }
                                        }}
                                        className={`w-full p-3.5 text-left flex items-center justify-between transition-colors ${
                                            isSelected
                                                ? "bg-blue-50/90 border-l-4 border-[#143e66] text-blue-900 shadow-2xs"
                                                : "hover:bg-slate-50 text-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-start space-x-3 overflow-hidden">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs ${
                                                activeCategory === "STUDENT"
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200/80"
                                                    : activeCategory === "PARENT"
                                                    ? "bg-amber-100 text-amber-800 border border-amber-200/80"
                                                    : activeCategory === "DEPARTMENT"
                                                    ? "bg-purple-100 text-purple-800 border border-purple-200/80"
                                                    : "bg-blue-100 text-blue-800 border border-blue-200/80"
                                            }`}>
                                                {activeCategory === "STUDENT" ? (
                                                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                                                ) : (
                                                    contact.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="space-y-1 overflow-hidden">
                                                <p className="text-xs font-extrabold text-slate-900 truncate">{contact.name}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{contact.subtitle}</p>
                                                {contact.studentId && (
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200/80">
                                                            {contact.studentId}
                                                        </span>
                                                        <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/60">
                                                            Assigned
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 ml-1" />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Message & Conversation Panel (8 Cols) */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-[560px] overflow-hidden">
                    {/* Active Target Banner */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-2xs ${
                                activeCategory === "STUDENT"
                                    ? "bg-emerald-600"
                                    : activeCategory === "PARENT"
                                    ? "bg-amber-600"
                                    : activeCategory === "DEPARTMENT"
                                    ? "bg-purple-600"
                                    : "bg-[#143e66]"
                            }`}>
                                {activeCategory === "STUDENT" ? <GraduationCap className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                    <h2 className="text-sm font-extrabold text-slate-900">
                                        {selectedContact ? selectedContact.name : `Select a contact from the ${activeCategory.toLowerCase()} directory`}
                                    </h2>
                                    {selectedContact?.studentId && (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-mono font-bold">
                                            {selectedContact.studentId}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedContact ? (selectedContact.subtitle || selectedContact.roleName) : "Click any contact on the left to view records and communicate"}
                                </p>
                            </div>
                        </div>

                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            {activeCategory} Channel
                        </span>
                    </div>

                    {/* Messages Thread / History */}
                    <div className="flex-1 p-4 overflow-y-auto max-h-[260px] space-y-3 bg-slate-50/40">
                        {activeMessages.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 space-y-1">
                                <MessageCircle className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                <p className="text-xs font-semibold">No recent messages in this session.</p>
                                <p className="text-[11px] text-slate-400">Use the form below to compose and send a message.</p>
                            </div>
                        ) : (
                            activeMessages.map((msg: any, idx: number) => {
                                const isMe = msg.senderId === currentUserId || msg.sender?.name?.includes("Teacher");
                                return (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                                    >
                                        <div className={`max-w-lg p-3.5 rounded-2xl text-xs space-y-1 shadow-2xs ${
                                            isMe
                                                ? "bg-[#143e66] text-white rounded-br-xs"
                                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                                        }`}>
                                            <div className="flex items-center justify-between space-x-3 text-[10px] opacity-75 font-semibold">
                                                <span>{isMe ? "You" : (msg.sender?.name || "Recipient")}</span>
                                                <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Composer Form */}
                    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                        {/* Topic / Priority options */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Subject / Communication topic..."
                                value={messageSubject}
                                onChange={(e) => setMessageSubject(e.target.value)}
                                className="sm:col-span-2 p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                            />
                            <select
                                value={messagePriority}
                                onChange={(e) => setMessagePriority(e.target.value as any)}
                                className="p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold"
                            >
                                <option value="NORMAL">Normal Priority</option>
                                <option value="HIGH">High Priority</option>
                                <option value="URGENT">Urgent Alert</option>
                            </select>
                        </div>

                        {/* Quick Templates */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Templates:
                            </span>
                            {categoryTemplates.map((tpl, i) => (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => setMessageText(tpl)}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors"
                                >
                                    {tpl}
                                </button>
                            ))}
                        </div>

                        {/* Textarea and Send */}
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder={
                                    selectedContact 
                                        ? `Write your message to ${selectedContact.name}...` 
                                        : `Type your message for this ${activeCategory.toLowerCase()} communication...`
                                }
                                className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-20"
                                required
                            />
                            <button
                                type="submit"
                                disabled={sending || !messageText.trim()}
                                className="px-5 bg-[#143e66] hover:bg-[#1a4f82] text-amber-300 font-bold rounded-xl disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1 shadow-xs shrink-0 active:scale-95"
                            >
                                <Send className="w-4 h-4" />
                                <span className="text-[11px]">{sending ? "Sending..." : "Send"}</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
