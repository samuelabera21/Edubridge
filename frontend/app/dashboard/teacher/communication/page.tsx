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
    Calendar,
    Phone,
    Mail,
    Filter,
    RefreshCw,
    User,
    ChevronRight,
    ChevronDown,
    ArrowUpRight,
    MessageCircle,
    FileText,
    Bookmark,
    BookOpen,
    Megaphone,
    X
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
    isBroadcast?: boolean;
    targetCount?: number;
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
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
    const [studentTargetMode, setStudentTargetMode] = useState<"STUDENT" | "SECTION" | "ALL">("STUDENT");
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

            const [myStudentsRes, myClassesRes, parentRes, usersRes, msgRes] = await Promise.all([
                fetchApi("/teacher/my-students").catch(() => null),
                fetchApi("/teacher/my-classes").catch(() => null),
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

            // 1b. Classes list
            if (myClassesRes && myClassesRes.ok) {
                const cData = await myClassesRes.json();
                setMyClasses(Array.isArray(cData) ? cData : []);
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

    // Helper to normalize section strings
    const normalizeSection = (val: string) => {
        return (val || "").toLowerCase().replace(/^(section|sec)\s*/, "").trim();
    };

    // Assigned Classes for Class Dropdown
    const assignedClasses = useMemo(() => {
        const map = new Map<string, {
            id: string;
            gradeName: string;
            sectionName: string;
            displayName: string;
            sectionId?: string;
            schoolGradeId?: string;
            studentCount: number;
        }>();

        // 1. From studentsList (enrollments of assigned students)
        studentsList.forEach((item: any) => {
            const gradeName = (item.schoolGrade?.grade?.name || item.schoolGrade?.name || (item.schoolGrade?.grade?.level ? `Grade ${item.schoolGrade.grade.level}` : "")).trim();
            const sectionName = (item.section?.name || "").trim();
            const sectionId = (item.section?.id || item.sectionId || "").trim();
            const schoolGradeId = (item.schoolGrade?.id || item.schoolGradeId || "").trim();
            const key = sectionId || (schoolGradeId && sectionName ? `${schoolGradeId}-${sectionName}` : `${gradeName}-${sectionName}`);

            if (key && (gradeName || sectionName)) {
                const displayName = [gradeName, sectionName ? `Section ${sectionName}` : ""].filter(Boolean).join(" - ");
                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        gradeName,
                        sectionName,
                        displayName,
                        sectionId,
                        schoolGradeId,
                        studentCount: 0
                    });
                }
            }
        });

        // 2. From myClasses (teaching assignments)
        myClasses.forEach((item: any) => {
            const a = item.assignment || item;
            const gradeName = (a.schoolGrade?.grade?.name || a.schoolGrade?.name || (a.schoolGrade?.grade?.level ? `Grade ${a.schoolGrade.grade.level}` : "")).trim();
            const sectionName = (a.section?.name || "").trim();
            const sectionId = (a.section?.id || a.sectionId || "").trim();
            const schoolGradeId = (a.schoolGrade?.id || a.schoolGradeId || "").trim();
            const key = sectionId || (schoolGradeId && sectionName ? `${schoolGradeId}-${sectionName}` : `${gradeName}-${sectionName}`);

            if (key && (gradeName || sectionName)) {
                const displayName = [gradeName, sectionName ? `Section ${sectionName}` : ""].filter(Boolean).join(" - ");
                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        gradeName,
                        sectionName,
                        displayName,
                        sectionId,
                        schoolGradeId,
                        studentCount: 0
                    });
                }
            }
        });

        // 3. Compute exact student count for each class
        return Array.from(map.values()).map(cls => {
            const count = studentsList.filter((item: any) => {
                const sSecId = (item.section?.id || item.sectionId || "").trim();
                const sSecName = normalizeSection(item.section?.name || "");
                const targetSecId = (cls.sectionId || "").trim();
                const targetSecName = normalizeSection(cls.sectionName || "");

                if (targetSecId || targetSecName) {
                    const idMatch = targetSecId && sSecId && targetSecId === sSecId;
                    const nameMatch = targetSecName && sSecName && targetSecName === sSecName;
                    if (!idMatch && !nameMatch) return false;
                }

                const sGradeId = (item.schoolGrade?.id || item.schoolGradeId || "").trim();
                const sGradeName = (item.schoolGrade?.grade?.name || "").toLowerCase().trim();
                const targetGradeId = (cls.schoolGradeId || "").trim();
                const targetGradeName = (cls.gradeName || "").toLowerCase().trim();

                if (targetGradeId || targetGradeName) {
                    const gIdMatch = targetGradeId && sGradeId && targetGradeId === sGradeId;
                    const gNameMatch = targetGradeName && sGradeName && targetGradeName === sGradeName;
                    if (!gIdMatch && !gNameMatch) return false;
                }

                return true;
            }).length;

            return {
                ...cls,
                studentCount: count
            };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [myClasses, studentsList]);

    // Switch Category Handler
    const handleCategoryChange = (cat: CommunicationCategory) => {
        setActiveCategory(cat);
        setSelectedContact(null);
        setSelectedClassId("ALL");
        setStudentTargetMode("STUDENT");
        setSearchQuery("");
        setMessageText("");
        setMessageSubject("");
        router.push(`/dashboard/teacher/communication?channel=${cat}`);
    };

    // Active assigned class object
    const activeClassObj = useMemo(() => {
        return selectedClassId !== "ALL" ? assignedClasses.find(c => c.id === selectedClassId) : null;
    }, [selectedClassId, assignedClasses]);

    // Handle target mode change between 1 Student, 1 Section, All Students
    const handleTargetModeChange = (mode: "STUDENT" | "SECTION" | "ALL") => {
        setStudentTargetMode(mode);
        setMessageText("");
        setMessageSubject("");

        if (mode === "STUDENT") {
            setSelectedClassId("ALL");
            setSelectedContact(null);
        } else if (mode === "SECTION") {
            const firstClass = (selectedClassId !== "ALL" && assignedClasses.find(c => c.id === selectedClassId))
                ? assignedClasses.find(c => c.id === selectedClassId)!
                : assignedClasses[0] || null;

            if (firstClass) {
                setSelectedClassId(firstClass.id);
                setSelectedContact({
                    id: `section-${firstClass.id}`,
                    name: `Section: ${firstClass.displayName}`,
                    subtitle: `Broadcast to all ${firstClass.studentCount} students in ${firstClass.displayName}`,
                    type: "STUDENT",
                    isBroadcast: true,
                    targetCount: firstClass.studentCount,
                    raw: { targetType: "SPECIFIC_SECTION", sectionId: firstClass.sectionId, classId: firstClass.id }
                });
            }
        } else if (mode === "ALL") {
            setSelectedClassId("ALL");
            setSelectedContact({
                id: "broadcast-all-students",
                name: "All Assigned Students",
                subtitle: `Group broadcast to all ${studentsList.length} students across all your classes`,
                type: "STUDENT",
                isBroadcast: true,
                targetCount: studentsList.length,
                raw: { targetType: "ALL_STUDENTS" }
            });
        }
    };

    // Handle section change in SECTION broadcast mode
    const handleSectionChange = (clsId: string) => {
        setSelectedClassId(clsId);
        const cls = assignedClasses.find(c => c.id === clsId);
        if (cls) {
            setSelectedContact({
                id: `section-${cls.id}`,
                name: `Section: ${cls.displayName}`,
                subtitle: `Broadcast to all ${cls.studentCount} students in ${cls.displayName}`,
                type: "STUDENT",
                isBroadcast: true,
                targetCount: cls.studentCount,
                raw: { targetType: "SPECIFIC_SECTION", sectionId: cls.sectionId, classId: cls.id }
            });
        }
    };

    // Filtered lists for the 4 categories
    const currentCategoryContacts: ContactItem[] = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        if (activeCategory === "STUDENT") {
            return studentsList
                .filter((item: any) => {
                    if (!activeClassObj) return true;

                    const sSecId = (item.section?.id || item.sectionId || "").trim();
                    const sSecName = normalizeSection(item.section?.name || "");
                    const targetSecId = (activeClassObj.sectionId || "").trim();
                    const targetSecName = normalizeSection(activeClassObj.sectionName || "");

                    // Strict Section Match: If target class has a section, student MUST match it
                    if (targetSecId || targetSecName) {
                        const secIdMatch = Boolean(targetSecId && sSecId && targetSecId === sSecId);
                        const secNameMatch = Boolean(targetSecName && sSecName && targetSecName === sSecName);
                        if (!secIdMatch && !secNameMatch) {
                            return false;
                        }
                    }

                    // Strict Grade Match: If target class has a grade, student MUST match it
                    const sGradeId = (item.schoolGrade?.id || item.schoolGradeId || "").trim();
                    const sGradeName = (item.schoolGrade?.grade?.name || "").toLowerCase().trim();
                    const targetGradeId = (activeClassObj.schoolGradeId || "").trim();
                    const targetGradeName = (activeClassObj.gradeName || "").toLowerCase().trim();

                    if (targetGradeId || targetGradeName) {
                        const gradeIdMatch = Boolean(targetGradeId && sGradeId && targetGradeId === sGradeId);
                        const gradeNameMatch = Boolean(targetGradeName && sGradeName && targetGradeName === sGradeName);
                        if (!gradeIdMatch && !gradeNameMatch) {
                            return false;
                        }
                    }

                    return true;
                })
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
    }, [activeCategory, studentsList, parentContacts, schoolUsers, searchQuery, activeClassObj]);

    // Conversation messages for active contact
    const activeMessages = useMemo(() => {
        if (!selectedContact) {
            return messagesHistory.slice(0, 10);
        }
        if (selectedContact.isBroadcast) {
            return messagesHistory.filter((m: any) =>
                m.recipient?.name?.includes("Broadcast") ||
                m.recipient?.name?.includes("Section") ||
                (selectedContact.name && m.recipient?.name?.includes(selectedContact.name)) ||
                m.id?.startsWith("broadcast-")
            );
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

            if (activeCategory === "STUDENT") {
                const targetType = studentTargetMode === "SECTION"
                    ? "SPECIFIC_SECTION"
                    : studentTargetMode === "ALL"
                    ? "ALL_STUDENTS"
                    : "SPECIFIC_STUDENT";

                const targetUserId = selectedContact?.raw?.student?.userId || selectedContact?.raw?.userId || selectedContact?.id;

                const payload: any = {
                    targetType,
                    subject: messageSubject || `${selectedContact?.name || 'Class'} Update`,
                    content: messageText,
                    priority: messagePriority
                };

                if (targetType === "SPECIFIC_STUDENT") {
                    if (!targetUserId) {
                        alert("Please select a student from the list first.");
                        setSending(false);
                        return;
                    }
                    payload.receiverId = targetUserId;
                    payload.studentId = selectedContact?.studentId || selectedContact?.id;
                } else if (targetType === "SPECIFIC_SECTION") {
                    const secId = activeClassObj?.sectionId || (selectedClassId !== "ALL" ? selectedClassId : assignedClasses[0]?.sectionId);
                    if (!secId) {
                        alert("Please select a section to broadcast to.");
                        setSending(false);
                        return;
                    }
                    payload.sectionId = secId;
                }

                // Call backend teacher student broadcast endpoint
                const res = await fetchApi("/communication/teacher/student-broadcast", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    const sentItem = {
                        id: `broadcast-${Date.now()}`,
                        senderId: currentUserId,
                        sender: { name: authData?.user?.name || "Teacher" },
                        recipient: { name: selectedContact?.name || (targetType === "ALL_STUDENTS" ? "All Students" : "Section") },
                        content: messageText,
                        subject: messageSubject,
                        createdAt: new Date().toISOString()
                    };
                    setMessagesHistory(prev => [sentItem, ...prev]);
                    setMessageText("");
                    setMessageSubject("");

                    const recipientCount = data.sentCount || selectedContact?.targetCount || 1;
                    setStatusBanner(`Successfully sent message to ${recipientCount} student${recipientCount === 1 ? '' : 's'}!`);
                    setTimeout(() => setStatusBanner(null), 5000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "Failed to dispatch message to student(s).");
                }
            } else if (activeCategory === "PARENT" && selectedContact?.enrollmentId) {
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
                const targetUserId = selectedContact.raw?.userId || selectedContact.id;
                const res = await fetchApi("/communication/messages", {
                    method: "POST",
                    body: JSON.stringify({
                        recipientId: targetUserId,
                        receiverId: targetUserId,
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
            }
        } catch (err: any) {
            alert(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    // Auto-select contact matching current filtered list
    useEffect(() => {
        if (activeCategory !== "STUDENT") {
            if (currentCategoryContacts.length > 0) {
                const isCurrentInList = selectedContact && currentCategoryContacts.some(c => c.id === selectedContact.id);
                if (!isCurrentInList) {
                    setSelectedContact(currentCategoryContacts[0]);
                    if (currentCategoryContacts[0].enrollmentId) {
                        setSelectedEnrollmentId(currentCategoryContacts[0].enrollmentId);
                    }
                }
            } else {
                setSelectedContact(null);
            }
            return;
        }

        // Active category is STUDENT
        if (studentTargetMode === "ALL") {
            setSelectedContact({
                id: "broadcast-all-students",
                name: "All Assigned Students",
                subtitle: `Group broadcast to all ${studentsList.length} students across all your classes`,
                type: "STUDENT",
                isBroadcast: true,
                targetCount: studentsList.length,
                raw: { targetType: "ALL_STUDENTS" }
            });
        } else if (studentTargetMode === "SECTION") {
            const firstClass = (selectedClassId !== "ALL" && assignedClasses.find(c => c.id === selectedClassId))
                ? assignedClasses.find(c => c.id === selectedClassId)!
                : assignedClasses[0] || null;

            if (firstClass) {
                setSelectedContact({
                    id: `section-${firstClass.id}`,
                    name: `Section: ${firstClass.displayName}`,
                    subtitle: `Broadcast to all ${firstClass.studentCount} students in ${firstClass.displayName}`,
                    type: "STUDENT",
                    isBroadcast: true,
                    targetCount: firstClass.studentCount,
                    raw: { targetType: "SPECIFIC_SECTION", sectionId: firstClass.sectionId, classId: firstClass.id }
                });
            }
        } else {
            // studentTargetMode === "STUDENT"
            if (currentCategoryContacts.length > 0) {
                const isCurrentInList = selectedContact && !selectedContact.isBroadcast && currentCategoryContacts.some(c => c.id === selectedContact.id);
                if (!isCurrentInList) {
                    setSelectedContact(currentCategoryContacts[0]);
                }
            } else {
                setSelectedContact(null);
            }
        }
    }, [activeCategory, studentTargetMode, currentCategoryContacts, assignedClasses, studentsList.length, selectedClassId]);

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
                            className={`p-3 rounded-xl text-left transition-all border flex items-start space-x-3 ${isActive
                                    ? "bg-[#143e66] text-white border-[#143e66] shadow-xs"
                                    : "bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 border-slate-200/80"
                                }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 ${isActive ? "bg-white/10 text-amber-300" : "bg-white text-slate-600 shadow-2xs"
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
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[580px]">
                    <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
                        {/* Header for Non-Student Categories */}
                        {activeCategory !== "STUDENT" && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                    {activeCategory === "PARENT" && "Student Guardians"}
                                    {activeCategory === "DEPARTMENT" && "Department Faculty"}
                                    {activeCategory === "STAFF" && "School Staff & Leadership"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                    {currentCategoryContacts.length} Available
                                </span>
                            </div>
                        )}

                        {/* Target Selection Dropdowns for Student Communication */}
                        {activeCategory === "STUDENT" && (
                            <div className="space-y-2.5">
                                {/* Dropdown 1: Main Target Mode (Requested by user) */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3 text-[#143e66]" />
                                            Recipient Mode / የመልእክት አይነት:
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={studentTargetMode}
                                            onChange={(e) => handleTargetModeChange(e.target.value as any)}
                                            className="w-full pl-2.5 pr-8 py-2 text-xs font-extrabold text-slate-900 bg-white border border-blue-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer appearance-none"
                                        >
                                            <option value="STUDENT">👤 Specific Student (ለአንድ ተማሪ)</option>
                                            <option value="SECTION">🏫 Specific Section (ለአንድ ሴክሽን)</option>
                                            <option value="ALL">📢 All My Students (ለሁሉም ተማሪዎቼ)</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Dropdown 2: Appears when Specific Student is chosen (Class Filter) */}
                                {studentTargetMode === "STUDENT" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3 h-3 text-[#143e66]" />
                                                Filter by Class / ክፍል ይምረጡ:
                                            </span>
                                            {assignedClasses.length > 0 && (
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {assignedClasses.length} {assignedClasses.length === 1 ? "class" : "classes"}
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedClassId}
                                                onChange={(e) => {
                                                    setSelectedClassId(e.target.value);
                                                    setSelectedContact(null);
                                                }}
                                                className="w-full pl-2.5 pr-8 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer appearance-none"
                                            >
                                                <option value="ALL">
                                                    All Assigned Classes ({studentsList.length} Students)
                                                </option>
                                                {assignedClasses.map((cls) => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.displayName} ({cls.studentCount} {cls.studentCount === 1 ? "Student" : "Students"})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {/* Dropdown 2: Appears when Specific Section is chosen */}
                                {studentTargetMode === "SECTION" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3 h-3 text-[#143e66]" />
                                                Select Section / ክፍል ይምረጡ:
                                            </span>
                                            <span className="text-[10px] font-extrabold text-amber-600">
                                                Section Target
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedClassId}
                                                onChange={(e) => handleSectionChange(e.target.value)}
                                                className="w-full pl-2.5 pr-8 py-2 text-xs font-bold text-slate-900 bg-amber-50/60 border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs cursor-pointer appearance-none"
                                            >
                                                {assignedClasses.map((cls) => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.displayName} ({cls.studentCount} {cls.studentCount === 1 ? "Student" : "Students"})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {/* Summary Card when All Students mode is active */}
                                {studentTargetMode === "ALL" && (
                                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/90 rounded-xl text-left space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-[#143e66] flex items-center gap-1.5">
                                                <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                                                Target: All Assigned Classes
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                                {studentsList.length} Students
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-tight">
                                            Message will be sent to all enrolled students across all your classes.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search Bar (For Guardians, Faculty & Staff) */}
                        {activeCategory !== "STUDENT" && (
                            <div className="space-y-1">
                                <div className="relative w-full">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or details..."
                                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                                            title="Clear search"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Left Panel Body: Contacts or Section/All Info */}
                    {activeCategory === "STUDENT" && studentTargetMode === "SECTION" ? (
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Section Roster ({currentCategoryContacts.length} students):
                                </span>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50 max-h-80 overflow-y-auto">
                                    {currentCategoryContacts.map((st) => (
                                        <div key={st.id} className="p-2.5 text-xs flex items-center justify-between text-slate-700">
                                            <span className="font-extrabold text-slate-800">{st.name}</span>
                                            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                                                {st.studentId}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeCategory === "STUDENT" && studentTargetMode === "ALL" ? (
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Assigned Classes Breakdown:
                                </span>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                                    {assignedClasses.map((cls) => (
                                        <div key={cls.id} className="p-2.5 text-xs flex items-center justify-between text-slate-700">
                                            <span className="font-bold text-slate-800">{cls.displayName}</span>
                                            <span className="text-[11px] font-semibold text-blue-700">
                                                {cls.studentCount} {cls.studentCount === 1 ? "student" : "students"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Subheader for 1-on-1 Student Selection */}
                            {activeCategory === "STUDENT" && currentCategoryContacts.length > 0 && (
                                <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Select a Student ({currentCategoryContacts.length})</span>
                                    <span className="text-[9px] text-slate-400 font-normal lowercase">1-on-1 private chat</span>
                                </div>
                            )}

                            {/* Contacts List */}
                            <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
                                {currentCategoryContacts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 space-y-2">
                                        <Inbox className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                        <p className="text-xs font-semibold">No students found.</p>
                                        <p className="text-[11px] text-slate-400">
                                            {searchQuery
                                                ? "No students match your search query."
                                                : selectedClassId !== "ALL"
                                                    ? "No enrolled students in this specific class."
                                                    : "No registered contacts in this group."}
                                        </p>
                                        {(searchQuery || selectedClassId !== "ALL") && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setSelectedClassId("ALL");
                                                }}
                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                            >
                                                Reset filters
                                            </button>
                                        )}
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
                        </>
                    )}
                </div>

                {/* Right: Message & Conversation Panel (8 Cols) */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-[560px] overflow-hidden">
                    {/* Active Target Banner */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-2xs ${
                                activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                    ? "bg-blue-600 shadow-blue-600/20"
                                    : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                    ? "bg-amber-600 shadow-amber-600/20"
                                    : activeCategory === "STUDENT"
                                    ? "bg-emerald-600 shadow-emerald-600/20"
                                    : activeCategory === "PARENT"
                                    ? "bg-amber-600"
                                    : activeCategory === "DEPARTMENT"
                                    ? "bg-purple-600"
                                    : "bg-[#143e66]"
                            }`}>
                                {activeCategory === "STUDENT" && studentTargetMode !== "STUDENT" ? (
                                    <Megaphone className="w-4 h-4" />
                                ) : activeCategory === "STUDENT" ? (
                                    <GraduationCap className="w-4 h-4" />
                                ) : (
                                    <User className="w-4 h-4" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                    <h2 className="text-sm font-extrabold text-slate-900">
                                        {activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                            ? "📢 Broadcast to All Students"
                                            : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                            ? `📢 Section Broadcast: ${activeClassObj?.displayName || "Section"}`
                                            : selectedContact
                                            ? selectedContact.name
                                            : `Select a contact from the ${activeCategory.toLowerCase()} directory`}
                                    </h2>
                                    {activeCategory === "STUDENT" && studentTargetMode === "ALL" && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {studentsList.length} Students (All Classes)
                                        </span>
                                    )}
                                    {activeCategory === "STUDENT" && studentTargetMode === "SECTION" && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                                            <Megaphone className="w-3 h-3" />
                                            {activeClassObj?.studentCount || 0} Students in Section
                                        </span>
                                    )}
                                    {activeCategory === "STUDENT" && studentTargetMode === "STUDENT" && selectedContact?.studentId && (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-mono font-bold">
                                            {selectedContact.studentId}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                        ? `Message will be delivered to all ${studentsList.length} students across all your classes.`
                                        : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                        ? `Message will be delivered directly to all students in ${activeClassObj?.displayName || 'this section'}.`
                                        : selectedContact
                                        ? (selectedContact.subtitle || selectedContact.roleName)
                                        : "Click any contact on the left to view records and communicate"}
                                </p>
                            </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            activeCategory === "STUDENT" && studentTargetMode !== "STUDENT"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                        }`}>
                            {activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                ? "All Students Broadcast"
                                : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                ? "Section Broadcast"
                                : `${activeCategory} Channel`}
                        </span>
                    </div>

                    {/* Messages Thread / History */}
                    <div className="flex-1 p-4 overflow-y-auto max-h-[260px] space-y-3 bg-slate-50/40">
                        {activeMessages.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 space-y-1">
                                {activeCategory === "STUDENT" && studentTargetMode === "ALL" ? (
                                    <>
                                        <Megaphone className="w-8 h-8 mx-auto stroke-1 text-blue-500/80" />
                                        <p className="text-xs font-bold text-slate-700">All Students Broadcast Mode</p>
                                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                            Type your announcement below. It will be dispatched directly to all {studentsList.length} students across all your classes.
                                        </p>
                                    </>
                                ) : activeCategory === "STUDENT" && studentTargetMode === "SECTION" ? (
                                    <>
                                        <Megaphone className="w-8 h-8 mx-auto stroke-1 text-amber-500/80" />
                                        <p className="text-xs font-bold text-slate-700">Section Broadcast Mode</p>
                                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                            Type your announcement below. It will be dispatched directly to all {activeClassObj?.studentCount ?? 0} students in {activeClassObj?.displayName || "this section"}.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                        <p className="text-xs font-semibold">No recent messages in this session.</p>
                                        <p className="text-[11px] text-slate-400">Use the form below to compose and send a message.</p>
                                    </>
                                )}
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
                                placeholder={
                                    activeCategory === "STUDENT" && studentTargetMode !== "STUDENT"
                                        ? "Announcement Topic / Subject..."
                                        : "Subject / Communication topic..."
                                }
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

                        {/* Textarea and Send */}
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder={
                                    activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                        ? `Write announcement to all ${studentsList.length} students across all your classes...`
                                        : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                        ? `Write announcement for ${activeClassObj?.displayName || 'this section'}...`
                                        : selectedContact
                                        ? `Write your message to ${selectedContact.name}...`
                                        : `Type your message for this ${activeCategory.toLowerCase()} communication...`
                                }
                                className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-20"
                                required
                            />
                            <button
                                type="submit"
                                disabled={sending || !messageText.trim()}
                                className={`px-5 font-bold rounded-xl disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1 shadow-xs shrink-0 active:scale-95 cursor-pointer ${
                                    activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                                        : "bg-[#143e66] hover:bg-[#1a4f82] text-amber-300"
                                }`}
                            >
                                {activeCategory === "STUDENT" && studentTargetMode !== "STUDENT" ? (
                                    <Megaphone className="w-4 h-4" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                <span className="text-[11px]">
                                    {sending
                                        ? "Sending..."
                                        : activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                        ? "Broadcast All"
                                        : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                        ? "Broadcast Section"
                                        : "Send"}
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
