"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
    Copy,
    Check,
    Reply,
    Edit3,
    Trash2,
    Paperclip,
    Download,
    ExternalLink,
    Image as ImageIcon,
    File,
    Target,
    CheckCheck,
    X,
    Eye
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import DirectivesRecipientView from "@/components/governance/DirectivesRecipientView";
import ProgramsRegistryView from "@/components/governance/ProgramsRegistryView";
import { getSocket, emitTyping, emitMarkRead } from "@/lib/socket";

type CommunicationCategory = "STUDENT" | "PARENT" | "DEPARTMENT" | "STAFF" | "DIRECTIVES" | "PROGRAMS";

interface ContactItem {
    id: string;
    studentId?: string;
    studentName?: string;
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
    const activeScope = authData?.access?.[0]?.scope;
    const unitName = activeScope?.name || "School";
    const organizationId = activeScope?.id;

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
        } else if (channelParam === "DIRECTIVES" || channelParam === "POLICY" || channelParam === "POLICIES") {
            setActiveCategory("DIRECTIVES");
        } else if (channelParam === "PROGRAMS" || channelParam === "INITIATIVES") {
            setActiveCategory("PROGRAMS");
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
    const [parentTargetMode, setParentTargetMode] = useState<"PARENT" | "SECTION" | "ALL">("PARENT");
    const [parentContacts, setParentContacts] = useState<any[]>([]);
    const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
    const [messagesHistory, setMessagesHistory] = useState<any[]>([]);
    const [directivesCount, setDirectivesCount] = useState<number>(0);
    const [programsCount, setProgramsCount] = useState<number>(0);

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

    // Channel selector dropdown state
    const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
    const channelDropdownRef = useRef<HTMLDivElement>(null);

    // Document preview modal state
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name?: string; type?: string } | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target as Node)) {
                setChannelDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Helper to format clean message content (removing [Subject tag] and raw attachment dumps)
    const formatCleanMessageContent = (content: string) => {
        if (!content) return "";
        return content
            .replace(/^\[[^\]]+\]\s*/, "")
            .replace(/\n*📎 Attached File:\s*[^\n]+(\([^)]+\))?/g, "")
            .trim();
    };

    // Message action states: Copy, Edit, Delete, Reply
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);

    // File attachment states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachedFile, setAttachedFile] = useState<{
        file: File;
        name: string;
        size: number;
        type: string;
    } | null>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    const handleSelectAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (max 25MB)
        if (file.size > 25 * 1024 * 1024) {
            alert("File size exceeds 25MB limit. Please select a smaller file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setAttachedFile({
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream"
        });
    };

    const handleRemoveAttachment = () => {
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadFileToStorage = async (fileItem: { file: File; name: string; type: string }): Promise<string> => {
        // 1. Get presigned URL
        const presignRes = await fetchApi("/storage/presign", {
            method: "POST",
            body: JSON.stringify({
                fileName: fileItem.name,
                contentType: fileItem.type || "application/octet-stream",
                folder: "messages"
            })
        });

        if (!presignRes.ok) {
            const err = await presignRes.json().catch(() => ({}));
            throw new Error(err.error || "Failed to generate upload URL for attachment");
        }

        const { presignedUrl, publicUrl } = await presignRes.json();

        // 2. Upload file directly to MinIO
        const uploadRes = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
                "Content-Type": fileItem.type || "application/octet-stream"
            },
            body: fileItem.file
        });

        if (!uploadRes.ok) {
            throw new Error("Failed to upload attached file to storage server.");
        }

        return publicUrl;
    };

    const handleCopyMessage = async (content: string, id: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleStartReply = (msg: any) => {
        const senderName = (msg.senderId === currentUserId || msg.sender?.name?.includes("Teacher")) ? "You" : (msg.sender?.name || "Recipient");
        setReplyingTo({
            id: msg.id,
            senderName,
            content: msg.content
        });
        if (!messageSubject) {
            setMessageSubject(`Re: ${msg.subject || 'Message'}`);
        }
    };

    const handleStartEdit = (msg: any) => {
        setEditingMessageId(msg.id);
        setEditingContent(msg.content);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent("");
    };

    const handleSaveEdit = async (msgId: string) => {
        if (!editingContent.trim()) return;
        try {
            setIsUpdatingMessage(true);
            if (!msgId.startsWith("broadcast-") && !msgId.startsWith("parent-broadcast-")) {
                const res = await fetchApi(`/communication/messages/${msgId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ content: editingContent })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    alert(errData.error || "Failed to update message");
                    return;
                }
            }
            setMessagesHistory(prev => prev.map(m => m.id === msgId ? { ...m, content: editingContent, isEdited: true } : m));
            setEditingMessageId(null);
            setEditingContent("");
        } catch (err) {
            console.error(err);
            alert("Failed to update message");
        } finally {
            setIsUpdatingMessage(false);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            setDeletingMessageId(msgId);
            if (!msgId.startsWith("broadcast-") && !msgId.startsWith("parent-broadcast-")) {
                const res = await fetchApi(`/communication/messages/${msgId}`, {
                    method: "DELETE"
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    alert(errData.error || "Failed to delete message");
                    return;
                }
            }
            setMessagesHistory(prev => prev.filter(m => m.id !== msgId));
            if (replyingTo?.id === msgId) {
                setReplyingTo(null);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to delete message");
        } finally {
            setDeletingMessageId(null);
        }
    };

    // Load all data
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [myStudentsRes, myClassesRes, parentRes, usersRes, msgRes, directivesRes, programsRes] = await Promise.all([
                fetchApi("/teacher/my-students").catch(() => null),
                fetchApi("/teacher/my-classes").catch(() => null),
                fetchApi("/communication/teacher/parent-contacts").catch(() => null),
                fetchApi("/communication/users").catch(() => null),
                fetchApi("/communication/messages").catch(() => null),
                fetchApi("/directives").catch(() => null),
                fetchApi("/programs").catch(() => null)
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

            // 5. Directives count
            if (directivesRes && directivesRes.ok) {
                const dData = await directivesRes.json();
                const count = Array.isArray(dData?.data) ? dData.data.length : Array.isArray(dData) ? dData.length : 0;
                setDirectivesCount(count);
            }

            // 6. Programs count
            if (programsRes && programsRes.ok) {
                const prData = await programsRes.json();
                const count = Array.isArray(prData?.data) ? prData.data.length : Array.isArray(prData) ? prData.length : 0;
                setProgramsCount(count);
            }
        } catch (err) {
            console.error("Failed to load communication contacts:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Real-time WebSocket states
    const [socketConnected, setSocketConnected] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const [isStudentTyping, setIsStudentTyping] = useState(false);
    const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Selected Contact Target User ID
    const selectedTargetUserId = useMemo(() => {
        if (!selectedContact || selectedContact.isBroadcast) return null;
        return (
            selectedContact.parentUserId ||
            selectedContact.raw?.parentUserId ||
            selectedContact.raw?.parent?.userId ||
            selectedContact.raw?.student?.userId ||
            selectedContact.raw?.userId ||
            (selectedContact.id?.startsWith("parent-") || selectedContact.id?.startsWith("section-") || selectedContact.id?.startsWith("broadcast-") ? null : selectedContact.id)
        );
    }, [selectedContact]);

    // WebSocket Gateway Integration for Teacher
    useEffect(() => {
        if (!currentUserId) return;
        const socket = getSocket(currentUserId);
        if (!socket) return;

        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);

        const onOnlineUsers = (users: string[]) => {
            if (Array.isArray(users)) setOnlineUserIds(new Set(users));
        };

        const onUserPresence = ({ userId, status }: { userId: string; status: string }) => {
            setOnlineUserIds(prev => {
                const next = new Set(prev);
                if (status === "online") next.add(userId);
                else next.delete(userId);
                return next;
            });
        };

        const onNewMessage = (msg: any) => {
            if (!msg) return;
            setMessagesHistory(prev => {
                if (prev.some((m: any) => m.id === msg.id)) return prev;
                return [msg, ...prev];
            });

            if (selectedTargetUserId && msg.senderId === selectedTargetUserId) {
                emitMarkRead(selectedTargetUserId);
            }
        };

        const onTypingStatus = (data: { fromUserId: string; isTyping: boolean }) => {
            if (selectedTargetUserId && data.fromUserId === selectedTargetUserId) {
                setIsStudentTyping(Boolean(data.isTyping));
            }
        };

        const onMessagesRead = (data: { byUserId: string }) => {
            setMessagesHistory(prev =>
                prev.map((m: any) =>
                    (m.senderId === currentUserId && (m.receiverId === data.byUserId || m.recipientId === data.byUserId))
                        ? { ...m, isRead: true }
                        : m
                )
            );
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("online_users_list", onOnlineUsers);
        socket.on("user_presence", onUserPresence);
        socket.on("new_message", onNewMessage);
        socket.on("typing_status", onTypingStatus);
        socket.on("messages_read", onMessagesRead);

        if (socket.connected) setSocketConnected(true);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("online_users_list", onOnlineUsers);
            socket.off("user_presence", onUserPresence);
            socket.off("new_message", onNewMessage);
            socket.off("typing_status", onTypingStatus);
            socket.off("messages_read", onMessagesRead);
        };
    }, [currentUserId, selectedTargetUserId]);

    useEffect(() => {
        loadData();
        const pollInterval = socketConnected ? 12000 : 4000;
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                fetchApi("/communication/messages")
                    .then(res => res.ok ? res.json() : null)
                    .then(mData => {
                        if (Array.isArray(mData)) {
                            setMessagesHistory(mData);
                        }
                    })
                    .catch(() => {});
            }
        }, pollInterval);
        return () => clearInterval(interval);
    }, [loadData, socketConnected]);

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
        setParentTargetMode("PARENT");
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

    // Handle parent target mode change between 1 Parent (via student), 1 Section Parents, All Parents
    const handleParentTargetModeChange = (mode: "PARENT" | "SECTION" | "ALL") => {
        setParentTargetMode(mode);
        setMessageText("");
        setMessageSubject("");

        if (mode === "PARENT") {
            setSelectedClassId("ALL");
            setSelectedContact(null);
        } else if (mode === "SECTION") {
            const firstClass = (selectedClassId !== "ALL" && assignedClasses.find(c => c.id === selectedClassId))
                ? assignedClasses.find(c => c.id === selectedClassId)!
                : assignedClasses[0] || null;

            if (firstClass) {
                setSelectedClassId(firstClass.id);
                setSelectedContact({
                    id: `parent-section-${firstClass.id}`,
                    name: `Section Parents: ${firstClass.displayName}`,
                    subtitle: `Broadcast to parents of all ${firstClass.studentCount} students in ${firstClass.displayName}`,
                    type: "PARENT",
                    isBroadcast: true,
                    targetCount: firstClass.studentCount,
                    raw: { targetType: "SPECIFIC_SECTION", sectionId: firstClass.sectionId, classId: firstClass.id }
                });
            }
        } else if (mode === "ALL") {
            setSelectedClassId("ALL");
            setSelectedContact({
                id: "broadcast-all-parents",
                name: "All Students' Parents",
                subtitle: `Group broadcast to parents of all ${parentContacts.length || studentsList.length} students across all your classes`,
                type: "PARENT",
                isBroadcast: true,
                targetCount: parentContacts.length,
                raw: { targetType: "ALL_PARENTS" }
            });
        }
    };

    const handleParentSectionChange = (clsId: string) => {
        setSelectedClassId(clsId);
        const cls = assignedClasses.find(c => c.id === clsId);
        if (cls) {
            setSelectedContact({
                id: `parent-section-${cls.id}`,
                name: `Section Parents: ${cls.displayName}`,
                subtitle: `Broadcast to parents of all ${cls.studentCount} students in ${cls.displayName}`,
                type: "PARENT",
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
                .filter((p: any) => {
                    if (!activeClassObj) return true;

                    const targetSecId = (activeClassObj.sectionId || "").trim();
                    const pSecId = (p.sectionId || "").trim();
                    if (targetSecId && pSecId) return targetSecId === pSecId;

                    const targetSecName = normalizeSection(activeClassObj.sectionName || "");
                    const pSecName = normalizeSection(p.sectionName || "");
                    if (targetSecName && pSecName) return targetSecName === pSecName;

                    const targetGradeId = (activeClassObj.schoolGradeId || "").trim();
                    const pGradeId = (p.schoolGradeId || "").trim();
                    if (targetGradeId && pGradeId) return targetGradeId === pGradeId;

                    return true;
                })
                .map((p: any): ContactItem => {
                    const studentDisplay = p.studentName || "Student";
                    const parentDisplay = p.parentName || "Parent";
                    const relation = p.relationship || "Guardian";
                    const studentCode = p.studentCode || p.studentId || "";

                    return {
                        id: `parent-${p.enrollmentId || p.parentUserId}`,
                        enrollmentId: p.enrollmentId,
                        parentUserId: p.parentUserId,
                        studentId: studentCode,
                        studentName: studentDisplay,
                        name: parentDisplay,
                        subtitle: `Student: ${studentDisplay} (${relation}) • Grade: ${p.gradeName || ""}${p.sectionName ? ` - ${p.sectionName}` : ""}`,
                        phone: p.parentPhone,
                        type: "PARENT",
                        raw: p
                    };
                })
                .filter(c => {
                    if (!q) return true;
                    return (
                        c.name.toLowerCase().includes(q) ||
                        c.subtitle.toLowerCase().includes(q) ||
                        (c.studentName && c.studentName.toLowerCase().includes(q)) ||
                        (c.studentId && c.studentId.toLowerCase().includes(q)) ||
                        (c.phone && c.phone.toLowerCase().includes(q))
                    );
                })
                .sort((a, b) => (a.studentName || a.name).localeCompare(b.studentName || b.name));
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
                    subtitle: u.department || u.role?.description || u.role?.name || "Faculty Peer",
                    roleName: u.role?.description || u.role?.name || "Teacher / Department Peer",
                    type: "DEPARTMENT",
                    raw: u
                }))
                .filter(c => !q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q));
        }

        if (activeCategory === "STAFF") {
            const nonTeachers = schoolUsers.filter((u: any) => {
                const role = (u.role?.name || u.roleName || "").toUpperCase();
                if (role.includes("STUDENT") || role.includes("PARENT")) return false;
                return !role.includes("TEACHER");
            });

            const candidates = nonTeachers.length > 0 ? nonTeachers : schoolUsers.filter((u: any) => {
                const role = (u.role?.name || u.roleName || "").toUpperCase();
                return !role.includes("STUDENT") && !role.includes("PARENT");
            });

            return candidates
                .map((u: any): ContactItem => ({
                    id: u.id,
                    name: u.name || u.email,
                    subtitle: u.role?.description || u.role?.name || "School Administration",
                    roleName: u.role?.description || u.role?.name || "Staff Member",
                    type: "STAFF",
                    raw: u
                }))
                .filter(c => !q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q));
        }

        return [];
    }, [activeCategory, studentsList, parentContacts, schoolUsers, searchQuery, activeClassObj]);

    // Conversation messages for active contact (strictly scoped to channel and recipient)
    const activeMessages = useMemo(() => {
        if (!selectedContact) {
            return [];
        }

        if (selectedContact.isBroadcast) {
            if (activeCategory === "STUDENT") {
                return messagesHistory.filter((m: any) =>
                    (m.id?.startsWith("broadcast-") && !m.id?.startsWith("parent-broadcast-")) ||
                    (m.recipient?.name?.includes("Student") || m.recipient?.name?.includes("Section") || m.subject?.includes("Student") || m.subject?.includes("Section"))
                );
            }
            if (activeCategory === "PARENT") {
                return messagesHistory.filter((m: any) =>
                    m.id?.startsWith("parent-broadcast-") ||
                    (m.recipient?.name?.includes("Parent") || m.recipient?.name?.includes("Guardian") || m.subject?.includes("Parent"))
                );
            }
            return [];
        }

        const targetUserId =
            selectedContact.parentUserId ||
            selectedContact.raw?.parentUserId ||
            selectedContact.raw?.parent?.userId ||
            selectedContact.raw?.student?.userId ||
            selectedContact.raw?.userId ||
            (selectedContact.id?.startsWith("parent-") || selectedContact.id?.startsWith("section-") || selectedContact.id?.startsWith("broadcast-") ? null : selectedContact.id);

        if (!targetUserId) {
            return [];
        }

        return messagesHistory.filter((m: any) => {
            const sId = m.senderId || m.sender?.id;
            const rId = m.receiverId || m.recipientId || m.receiver?.id;
            return (
                (sId === currentUserId && rId === targetUserId) ||
                (sId === targetUserId && rId === currentUserId)
            );
        });
    }, [messagesHistory, selectedContact, currentUserId, activeCategory]);

    // Send Message Handler
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() && !attachedFile) return;

        try {
            setSending(true);

            // Upload attachment if user selected a file
            let uploadedAttachmentUrl: string | null = null;
            let uploadedAttachmentName: string | null = null;
            let uploadedAttachmentType: string | null = null;

            if (attachedFile) {
                setUploadingAttachment(true);
                try {
                    uploadedAttachmentUrl = await uploadFileToStorage(attachedFile);
                    uploadedAttachmentName = attachedFile.name;
                    uploadedAttachmentType = attachedFile.type;
                } catch (uploadErr: any) {
                    alert(uploadErr.message || "Failed to upload attached file. Message was not sent.");
                    setUploadingAttachment(false);
                    setSending(false);
                    return;
                } finally {
                    setUploadingAttachment(false);
                }
            }

            const baseText = messageText.trim() || (uploadedAttachmentName ? `Sent an attachment: ${uploadedAttachmentName}` : "");
            const outgoingText = replyingTo
                ? `> In reply to ${replyingTo.senderName}: "${replyingTo.content.slice(0, 80)}${replyingTo.content.length > 80 ? '...' : ''}"\n\n${baseText}`
                : baseText;

            if (activeCategory === "STUDENT") {
                const targetType = studentTargetMode === "SECTION"
                    ? "SPECIFIC_SECTION"
                    : studentTargetMode === "ALL"
                    ? "ALL_STUDENTS"
                    : "SPECIFIC_STUDENT";

                const targetUserId = selectedContact?.raw?.student?.userId || selectedContact?.raw?.userId || (selectedContact as any)?.userId;

                const payload: any = {
                    targetType,
                    subject: messageSubject || undefined,
                    content: outgoingText,
                    priority: messagePriority,
                    attachmentUrl: uploadedAttachmentUrl,
                    attachmentName: uploadedAttachmentName,
                    attachmentType: uploadedAttachmentType
                };

                if (targetType === "SPECIFIC_STUDENT") {
                    if (!selectedContact) {
                        alert("Please select a student from the list first.");
                        setSending(false);
                        return;
                    }
                    if (targetUserId) {
                        payload.receiverId = targetUserId;
                    }
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
                        content: outgoingText,
                        subject: messageSubject,
                        attachmentUrl: uploadedAttachmentUrl,
                        attachmentName: uploadedAttachmentName,
                        attachmentType: uploadedAttachmentType,
                        createdAt: new Date().toISOString()
                    };
                    setMessagesHistory(prev => [sentItem, ...prev]);
                    setMessageText("");
                    setMessageSubject("");
                    setReplyingTo(null);
                    handleRemoveAttachment();

                    const recipientCount = data.sentCount || selectedContact?.targetCount || 1;
                    setStatusBanner(`Successfully sent message to ${recipientCount} student${recipientCount === 1 ? '' : 's'}!`);
                    setTimeout(() => setStatusBanner(null), 5000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "Failed to dispatch message to student(s).");
                }
            } else if (activeCategory === "PARENT") {
                const targetType = parentTargetMode === "ALL"
                    ? "ALL_PARENTS"
                    : parentTargetMode === "SECTION"
                    ? "SPECIFIC_SECTION"
                    : "SPECIFIC_PARENT";

                const targetParentUserId = selectedContact?.parentUserId || selectedContact?.raw?.parentUserId;

                const payload: any = {
                    targetType,
                    subject: messageSubject || undefined,
                    content: outgoingText,
                    priority: messagePriority,
                    attachmentUrl: uploadedAttachmentUrl,
                    attachmentName: uploadedAttachmentName,
                    attachmentType: uploadedAttachmentType
                };

                if (targetType === "SPECIFIC_PARENT") {
                    if (!targetParentUserId && !selectedContact?.enrollmentId && !selectedContact?.raw?.studentDbId && !selectedContact?.studentId) {
                        alert("Please select a student from the list first to message their parent.");
                        setSending(false);
                        return;
                    }
                    payload.receiverId = targetParentUserId;
                    payload.enrollmentId = selectedContact?.enrollmentId;
                    payload.studentId = selectedContact?.raw?.studentDbId || selectedContact?.studentId;
                } else if (targetType === "SPECIFIC_SECTION") {
                    const secId = activeClassObj?.sectionId || (selectedClassId !== "ALL" ? selectedClassId : assignedClasses[0]?.sectionId);
                    if (!secId) {
                        alert("Please select a section to broadcast to.");
                        setSending(false);
                        return;
                    }
                    payload.sectionId = secId;
                }

                // Call backend teacher parent broadcast endpoint
                const res = await fetchApi("/communication/teacher/parent-broadcast", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    const sentItem = {
                        id: `parent-broadcast-${Date.now()}`,
                        senderId: currentUserId,
                        sender: { name: authData?.user?.name || "Teacher" },
                        recipient: { name: selectedContact?.name || (targetType === "ALL_PARENTS" ? "All Parents" : "Section Parents") },
                        content: outgoingText,
                        subject: messageSubject,
                        attachmentUrl: uploadedAttachmentUrl,
                        attachmentName: uploadedAttachmentName,
                        attachmentType: uploadedAttachmentType,
                        createdAt: new Date().toISOString()
                    };
                    setMessagesHistory(prev => [sentItem, ...prev]);
                    setMessageText("");
                    setMessageSubject("");
                    setReplyingTo(null);
                    handleRemoveAttachment();

                    const recipientCount = data.recipientsCount || selectedContact?.targetCount || 1;
                    setStatusBanner(`Successfully sent message to ${recipientCount} parent${recipientCount === 1 ? '' : 's'}!`);
                    setTimeout(() => setStatusBanner(null), 5000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "Failed to dispatch message to parent(s).");
                }
            } else if (selectedContact?.id) {
                // Direct User Message API
                const targetUserId =
                    selectedContact.parentUserId ||
                    selectedContact.raw?.parentUserId ||
                    selectedContact.raw?.parent?.userId ||
                    selectedContact.raw?.student?.userId ||
                    selectedContact.raw?.userId ||
                    (selectedContact.id?.startsWith("parent-") || selectedContact.id?.startsWith("section-") || selectedContact.id?.startsWith("broadcast-") ? null : selectedContact.id);

                if (!targetUserId) {
                    alert("Unable to resolve recipient user account for direct messaging.");
                    setSending(false);
                    return;
                }

                const res = await fetchApi("/communication/messages", {
                    method: "POST",
                    body: JSON.stringify({
                        recipientId: targetUserId,
                        receiverId: targetUserId,
                        subject: messageSubject || undefined,
                        content: outgoingText,
                        priority: messagePriority,
                        attachmentUrl: uploadedAttachmentUrl,
                        attachmentName: uploadedAttachmentName,
                        attachmentType: uploadedAttachmentType
                    })
                });

                if (res.ok) {
                    const newMsg = await res.json();
                    const formattedMsg = {
                        ...newMsg,
                        senderId: newMsg.senderId || currentUserId,
                        receiverId: newMsg.receiverId || targetUserId,
                        sender: newMsg.sender || { id: currentUserId, name: authData?.user?.name || "Teacher" },
                        receiver: newMsg.receiver || { id: targetUserId, name: selectedContact.name },
                        attachmentUrl: newMsg.attachmentUrl || uploadedAttachmentUrl,
                        attachmentName: newMsg.attachmentName || uploadedAttachmentName,
                        attachmentType: newMsg.attachmentType || uploadedAttachmentType
                    };
                    setMessagesHistory(prev => {
                        if (prev.some((m: any) => m.id === formattedMsg.id)) return prev;
                        return [formattedMsg, ...prev];
                    });
                    setMessageText("");
                    setMessageSubject("");
                    setReplyingTo(null);
                    handleRemoveAttachment();
                    setStatusBanner(`Message successfully sent to ${selectedContact.name}!`);
                    setTimeout(() => setStatusBanner(null), 4000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "Failed to send direct message.");
                }
            } else {
                alert("Please select a recipient from the directory on the left first.");
            }
        } catch (err: any) {
            alert(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    // Auto-select contact matching current filtered list
    useEffect(() => {
        if (activeCategory === "PARENT") {
            if (parentTargetMode === "ALL") {
                setSelectedContact({
                    id: "broadcast-all-parents",
                    name: "All Students' Parents",
                    subtitle: `Group broadcast to parents of all ${parentContacts.length || studentsList.length} students across all your classes`,
                    type: "PARENT",
                    isBroadcast: true,
                    targetCount: parentContacts.length,
                    raw: { targetType: "ALL_PARENTS" }
                });
            } else if (parentTargetMode === "SECTION") {
                const firstClass = (selectedClassId !== "ALL" && assignedClasses.find(c => c.id === selectedClassId))
                    ? assignedClasses.find(c => c.id === selectedClassId)!
                    : assignedClasses[0] || null;

                if (firstClass) {
                    setSelectedContact({
                        id: `parent-section-${firstClass.id}`,
                        name: `Section Parents: ${firstClass.displayName}`,
                        subtitle: `Broadcast to parents of all ${firstClass.studentCount} students in ${firstClass.displayName}`,
                        type: "PARENT",
                        isBroadcast: true,
                        targetCount: firstClass.studentCount,
                        raw: { targetType: "SPECIFIC_SECTION", sectionId: firstClass.sectionId, classId: firstClass.id }
                    });
                }
            } else {
                // parentTargetMode === "PARENT"
                if (currentCategoryContacts.length > 0) {
                    const isCurrentInList = selectedContact && !selectedContact.isBroadcast && currentCategoryContacts.some(c => c.id === selectedContact.id);
                    if (!isCurrentInList) {
                        setSelectedContact(currentCategoryContacts[0]);
                        if (currentCategoryContacts[0].enrollmentId) {
                            setSelectedEnrollmentId(currentCategoryContacts[0].enrollmentId);
                        }
                    }
                } else {
                    setSelectedContact(null);
                }
            }
            return;
        }

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
            {/* Consolidated Communication Channel Dropdown Selector */}
            {(() => {
                const communicationChannels = [
                    { id: "STUDENT", label: "Students", sub: "የተማሪዎች ኮሚዩኒኬሽን", icon: GraduationCap, count: studentsList.length, desc: "Assigned Students" },
                    { id: "PARENT", label: "Parents", sub: "የወላጆች ኮሚዩኒኬሽን", icon: Users, count: parentContacts.length, desc: "Guardians & Contacts" },
                    { id: "DEPARTMENT", label: "Department", sub: "የትምህርት ክፍል", icon: Building2, count: schoolUsers.filter(u => (u.role?.name || "").includes("TEACHER")).length, desc: "Faculty & Peers" },
                    { id: "STAFF", label: "School Staff", sub: "የትምህርት ቤት አመራር", icon: Shield, count: schoolUsers.length, desc: "Admin & Leadership" },
                    { id: "DIRECTIVES", label: "Policies & Directives", sub: "ፖሊሲዎች እና መመሪያዎች", icon: FileText, count: directivesCount, desc: "School & Dept Policies" },
                    { id: "PROGRAMS", label: "Programs & Initiatives", sub: "ፕሮግራሞች እና ውጥኖች", icon: Target, count: programsCount, desc: "Academic Initiatives" }
                ];
                const activeChannel = communicationChannels.find(c => c.id === activeCategory) || communicationChannels[0];
                const ActiveIcon = activeChannel.icon;

                return (
                    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                Channel:
                            </span>

                            {/* Dropdown Menu Container */}
                            <div className="relative" ref={channelDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setChannelDropdownOpen(!channelDropdownOpen)}
                                    className="w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-300 hover:border-[#4085b3] rounded-xl text-xs font-bold text-slate-900 transition-all cursor-pointer shadow-2xs min-w-[260px] sm:min-w-[340px] focus:outline-hidden focus:ring-2 focus:ring-[#4085b3]/20"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[#4085b3] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                            <ActiveIcon className="w-4 h-4" />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-extrabold text-slate-900 text-xs truncate">
                                                    {activeChannel.label}
                                                </span>
                                                <span className="text-[10px] font-semibold text-[#4085b3] truncate">
                                                    ({activeChannel.sub})
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium truncate">
                                                {activeChannel.desc} • {activeChannel.count} {activeCategory === "DIRECTIVES" || activeCategory === "PROGRAMS" ? "items" : "contacts"}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${channelDropdownOpen ? "rotate-180 text-[#4085b3]" : ""}`} />
                                </button>

                                {/* Dropdown List */}
                                {channelDropdownOpen && (
                                    <div className="absolute left-0 mt-1.5 w-full sm:w-[380px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                            <span>Select Communication Channel</span>
                                            <span>ቻናል ይምረጡ</span>
                                        </div>
                                        <div className="max-h-[380px] overflow-y-auto p-1.5 space-y-1">
                                            {communicationChannels.map((ch) => {
                                                const Icon = ch.icon;
                                                const isSelected = activeCategory === ch.id;
                                                return (
                                                    <button
                                                        key={ch.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleCategoryChange(ch.id as CommunicationCategory);
                                                            setChannelDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                                            isSelected
                                                                ? "bg-[#4085b3] text-white font-bold shadow-2xs"
                                                                : "hover:bg-slate-50 text-slate-700"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                                            }`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`font-extrabold ${isSelected ? "text-white" : "text-slate-900"}`}>
                                                                        {ch.label}
                                                                    </span>
                                                                    <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#4085b3] font-medium"}`}>
                                                                        ({ch.sub})
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[10px] block truncate ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                                                    {ch.desc} • {ch.count} {ch.id === "DIRECTIVES" || ch.id === "PROGRAMS" ? "items" : "contacts"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right side status & reload */}
                        <div className="flex items-center gap-2 text-xs text-slate-600 self-end sm:self-auto">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-[#4085b3]"></span>
                                <span className="font-bold text-slate-900">{activeChannel.label}</span>
                                <span className="text-slate-400 text-[11px]">({activeChannel.count})</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => loadData(true)}
                                className="p-2 border border-slate-200 bg-slate-50 hover:bg-[#4085b3] text-slate-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Refresh conversations"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-white" : ""}`} />
                            </button>
                        </div>
                    </div>
                );
            })()}


            {/* Status Alert Banner */}
            {statusBanner && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-2xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{statusBanner}</span>
                </div>
            )}

            {/* Policies & Directives Tab Content */}
            {activeCategory === "DIRECTIVES" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 animate-in fade-in duration-150">
                    <DirectivesRecipientView
                        tierName={unitName}
                        tierType="SCHOOL"
                        organizationId={organizationId}
                    />
                </div>
            )}

            {/* Programs & Initiatives Tab Content */}
            {activeCategory === "PROGRAMS" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 animate-in fade-in duration-150">
                    <ProgramsRegistryView
                        tierName={unitName}
                        tierType="SCHOOL"
                        canCreateProgram={false}
                    />
                </div>
            )}

            {/* Main Interactive Workspace (2 Columns for Messaging) */}
            {activeCategory !== "DIRECTIVES" && activeCategory !== "PROGRAMS" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Contact Directory (4 Cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[580px]">
                    <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
                        {/* Header for Department & Staff Categories */}
                        {activeCategory !== "STUDENT" && activeCategory !== "PARENT" && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                    {activeCategory === "DEPARTMENT" && "Department Faculty"}
                                    {activeCategory === "STAFF" && "School Staff & Leadership"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-[#245f8b]">
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
                                            <Users className="w-3 h-3 text-[#4085b3]" />
                                            Recipient Mode / የመልእክት አይነት:
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {studentTargetMode === "ALL" ? (
                                                <Megaphone className="w-3.5 h-3.5 text-[#4085b3]" />
                                            ) : studentTargetMode === "SECTION" ? (
                                                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                            ) : (
                                                <User className="w-3.5 h-3.5 text-emerald-600" />
                                            )}
                                        </div>
                                        <select
                                            value={studentTargetMode}
                                            onChange={(e) => handleTargetModeChange(e.target.value as any)}
                                            className="w-full pl-8 pr-8 py-2 text-xs font-extrabold text-slate-900 bg-white border border-blue-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer appearance-none"
                                        >
                                            <option value="STUDENT">Specific Student (ለአንድ ተማሪ)</option>
                                            <option value="SECTION">Specific Section (ለአንድ ሴክሽን)</option>
                                            <option value="ALL">All My Students (ለሁሉም ተማሪዎቼ)</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Dropdown 2: Appears when Specific Student is chosen (Class Filter) */}
                                {studentTargetMode === "STUDENT" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3 h-3 text-[#4085b3]" />
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
                                                <BookOpen className="w-3 h-3 text-[#4085b3]" />
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
                                            <span className="text-xs font-extrabold text-[#4085b3] flex items-center gap-1.5">
                                                <Megaphone className="w-3.5 h-3.5 text-[#4085b3]" />
                                                Target: All Assigned Classes
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-[#245f8b]">
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

                        {/* Target Selection Dropdowns for Parent Communication */}
                        {activeCategory === "PARENT" && (
                            <div className="space-y-2.5">
                                {/* Dropdown 1: Main Target Mode for Parents */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3 text-[#4085b3]" />
                                            Recipient Mode / የመልእክት አይነት:
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {parentTargetMode === "ALL" ? (
                                                <Megaphone className="w-3.5 h-3.5 text-[#4085b3]" />
                                            ) : parentTargetMode === "SECTION" ? (
                                                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                            ) : (
                                                <User className="w-3.5 h-3.5 text-emerald-600" />
                                            )}
                                        </div>
                                        <select
                                            value={parentTargetMode}
                                            onChange={(e) => handleParentTargetModeChange(e.target.value as any)}
                                            className="w-full pl-8 pr-8 py-2 text-xs font-extrabold text-slate-900 bg-white border border-blue-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer appearance-none"
                                        >
                                            <option value="PARENT">Specific Parent (ለአንድ ወላጅ - በተማሪ ስም)</option>
                                            <option value="SECTION">Specific Section (ለአንድ ሴክሽን ወላጆች)</option>
                                            <option value="ALL">All My Parents (ለሁሉም ወላጆች)</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Dropdown 2: Appears when Specific Parent is chosen (Filter by Class) */}
                                {parentTargetMode === "PARENT" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3 h-3 text-[#4085b3]" />
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
                                                    All Assigned Classes ({assignedClasses.reduce((s, c) => s + c.studentCount, 0)} Students)
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
                                {parentTargetMode === "SECTION" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3 h-3 text-[#4085b3]" />
                                                Select Section / ክፍል ይምረጡ:
                                            </span>
                                            <span className="text-[10px] font-extrabold text-amber-600">
                                                Section Target
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedClassId}
                                                onChange={(e) => handleParentSectionChange(e.target.value)}
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

                                {/* Summary Card when All Parents mode is active */}
                                {parentTargetMode === "ALL" && (
                                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/90 rounded-xl text-left space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-[#4085b3] flex items-center gap-1.5">
                                                <Megaphone className="w-3.5 h-3.5 text-[#4085b3]" />
                                                Target: All Students' Parents
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-[#245f8b]">
                                                {parentContacts.length || studentsList.length} Parents
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-tight">
                                            Message will be sent to all parents across all your classes.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search Bar (When in 1-on-1 mode or staff/dept) */}
                        {((activeCategory === "STUDENT" && studentTargetMode === "STUDENT") ||
                          (activeCategory === "PARENT" && parentTargetMode === "PARENT") ||
                          (activeCategory !== "STUDENT" && activeCategory !== "PARENT")) && (
                            <div className="space-y-1">
                                <div className="relative w-full">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={
                                            activeCategory === "PARENT"
                                                ? "Search by student name or parent..."
                                                : "Search by name or details..."
                                        }
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
                    ) : activeCategory === "PARENT" && parentTargetMode === "SECTION" ? (
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Section Parents Roster ({currentCategoryContacts.length} parents):
                                </span>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50 max-h-80 overflow-y-auto">
                                    {currentCategoryContacts.map((p) => (
                                        <div key={p.id} className="p-2.5 text-xs flex items-center justify-between text-slate-700">
                                            <div>
                                                <span className="font-extrabold text-slate-800">{p.studentName || p.name}</span>
                                                <span className="text-[10px] text-slate-500 block">Parent: {p.name} ({p.raw?.relationship || 'Guardian'})</span>
                                            </div>
                                            {p.studentId && (
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                                                    {p.studentId}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeCategory === "PARENT" && parentTargetMode === "ALL" ? (
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Assigned Classes Breakdown:
                                </span>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                                    {assignedClasses.map((cls) => (
                                        <div key={cls.id} className="p-2.5 text-xs flex items-center justify-between text-slate-700">
                                            <span className="font-bold text-slate-800">{cls.displayName}</span>
                                            <span className="text-[11px] font-semibold text-amber-700">
                                                {cls.studentCount} {cls.studentCount === 1 ? "student's parents" : "students' parents"}
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

                            {/* Subheader for 1-on-1 Parent Selection via Student */}
                            {activeCategory === "PARENT" && currentCategoryContacts.length > 0 && (
                                <div className="px-3.5 py-2 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                                    <span>Select Student to Message Parent ({currentCategoryContacts.length})</span>
                                    <span className="text-[9px] text-amber-700 font-normal lowercase">1-on-1 parent chat</span>
                                </div>
                            )}

                            {/* Contacts List */}
                            <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
                                {currentCategoryContacts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 space-y-2">
                                        <Inbox className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                        <p className="text-xs font-semibold">No contacts found.</p>
                                        <p className="text-[11px] text-slate-400">
                                            {searchQuery
                                                ? "No contacts match your search query."
                                                : selectedClassId !== "ALL"
                                                    ? "No enrolled students/parents in this specific class."
                                                    : "No registered contacts in this group."}
                                        </p>
                                        {(searchQuery || selectedClassId !== "ALL") && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setSelectedClassId("ALL");
                                                }}
                                                className="text-[11px] font-bold text-[#4085b3] hover:text-[#245f8b] underline"
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
                                                        ? "bg-blue-50/90 border-l-4 border-[#4085b3] text-blue-900 shadow-2xs"
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
                                                            : "bg-blue-100 text-[#245f8b] border border-blue-200/80"
                                                    }`}>
                                                        {activeCategory === "STUDENT" ? (
                                                            <GraduationCap className="w-4 h-4 text-emerald-700" />
                                                        ) : (
                                                            contact.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 overflow-hidden">
                                                        {activeCategory === "PARENT" && contact.studentName ? (
                                                            <>
                                                                <p className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                                                                    <span>{contact.studentName}</span>
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200/60 uppercase">Student</span>
                                                                </p>
                                                                <p className="text-[11px] font-semibold text-amber-900 truncate">
                                                                    Parent: {contact.name} ({contact.raw?.relationship || "Guardian"})
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 truncate">
                                                                    {contact.raw?.gradeName ? `${contact.raw.gradeName}${contact.raw?.sectionName ? ` - ${contact.raw.sectionName}` : ""}` : contact.subtitle}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs font-extrabold text-slate-900 truncate">{contact.name}</p>
                                                                <p className="text-[11px] text-slate-500 truncate">{contact.subtitle}</p>
                                                            </>
                                                        )}
                                                        {contact.studentId && (
                                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                                <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200/80">
                                                                    {contact.studentId}
                                                                </span>
                                                                <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                                                    activeCategory === "PARENT"
                                                                        ? "bg-amber-50 text-amber-800 border-amber-200/60"
                                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                                                }`}>
                                                                    {activeCategory === "PARENT" ? "Linked Parent" : "Assigned"}
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
                                (activeCategory === "STUDENT" && studentTargetMode === "ALL") || (activeCategory === "PARENT" && parentTargetMode === "ALL")
                                    ? "bg-[#4085b3] shadow-[#4085b3]/20"
                                    : (activeCategory === "STUDENT" && studentTargetMode === "SECTION") || (activeCategory === "PARENT" && parentTargetMode === "SECTION")
                                    ? "bg-amber-600 shadow-amber-600/20"
                                    : activeCategory === "STUDENT"
                                    ? "bg-emerald-600 shadow-emerald-600/20"
                                    : activeCategory === "PARENT"
                                    ? "bg-amber-600 shadow-amber-600/20"
                                    : activeCategory === "DEPARTMENT"
                                    ? "bg-purple-600"
                                    : "bg-[#4085b3]"
                            }`}>
                                {(activeCategory === "STUDENT" && studentTargetMode !== "STUDENT") || (activeCategory === "PARENT" && parentTargetMode !== "PARENT") ? (
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
                                            ? "Broadcast to All Students"
                                            : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                            ? `Section Broadcast: ${activeClassObj?.displayName || "Section"}`
                                            : activeCategory === "PARENT" && parentTargetMode === "ALL"
                                            ? "Broadcast to All Parents"
                                            : activeCategory === "PARENT" && parentTargetMode === "SECTION"
                                            ? `Section Parents Broadcast: ${activeClassObj?.displayName || "Section"}`
                                            : activeCategory === "PARENT" && selectedContact
                                            ? `Parent: ${selectedContact.name} (${selectedContact.raw?.relationship || 'Guardian'})`
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
                                    {activeCategory === "PARENT" && parentTargetMode === "ALL" && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            All Students' Parents
                                        </span>
                                    )}
                                    {activeCategory === "PARENT" && parentTargetMode === "SECTION" && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                                            <Megaphone className="w-3 h-3" />
                                            Parents of {activeClassObj?.studentCount || 0} Students
                                        </span>
                                    )}
                                    {activeCategory === "STUDENT" && studentTargetMode === "STUDENT" && selectedContact?.studentId && (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-mono font-bold">
                                            {selectedContact.studentId}
                                        </span>
                                    )}
                                    {activeCategory === "PARENT" && parentTargetMode === "PARENT" && selectedContact?.studentName && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-bold">
                                            Student: {selectedContact.studentName}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                        ? `Message will be delivered to all ${studentsList.length} students across all your classes.`
                                        : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                        ? `Message will be delivered directly to all students in ${activeClassObj?.displayName || 'this section'}.`
                                        : activeCategory === "PARENT" && parentTargetMode === "ALL"
                                        ? `Message will be delivered to parents of all enrolled students across all your classes.`
                                        : activeCategory === "PARENT" && parentTargetMode === "SECTION"
                                        ? `Message will be delivered directly to parents of students in ${activeClassObj?.displayName || 'this section'}.`
                                        : activeCategory === "PARENT" && selectedContact
                                        ? `Guardian of student ${selectedContact.studentName || selectedContact.raw?.studentName || ''} • ${selectedContact.subtitle}`
                                        : selectedContact
                                        ? (selectedContact.subtitle || selectedContact.roleName)
                                        : "Click any contact on the left to view records and communicate"}
                                </p>
                            </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            (activeCategory === "STUDENT" && studentTargetMode !== "STUDENT") || (activeCategory === "PARENT" && parentTargetMode !== "PARENT")
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                        }`}>
                            {activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                ? "All Students Broadcast"
                                : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                ? "Section Broadcast"
                                : activeCategory === "PARENT" && parentTargetMode === "ALL"
                                ? "All Parents Broadcast"
                                : activeCategory === "PARENT" && parentTargetMode === "SECTION"
                                ? "Section Parents Broadcast"
                                : `${activeCategory} Channel`}
                        </span>
                    </div>

                    {/* Messages Thread / History */}
                    <div className="flex-1 p-4 overflow-y-auto max-h-[260px] space-y-3 bg-slate-50/40">
                        {activeMessages.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 space-y-1">
                                {activeCategory === "STUDENT" && studentTargetMode === "ALL" ? (
                                    <>
                                        <Megaphone className="w-8 h-8 mx-auto stroke-1 text-[#4085b3]/80" />
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
                                ) : !selectedContact ? (
                                    <>
                                        <MessageCircle className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                        <p className="text-xs font-semibold text-slate-700">No recipient selected</p>
                                        <p className="text-[11px] text-slate-400">Choose a contact from the directory on the left to view messages and communicate.</p>
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                                        <p className="text-xs font-semibold text-slate-700">No recent messages with {selectedContact.name}</p>
                                        <p className="text-[11px] text-slate-400">Use the form below to compose and send a message directly.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            activeMessages.map((msg: any, idx: number) => {
                                const isMe = msg.senderId === currentUserId || msg.sender?.name?.includes("Teacher");
                                const isEditing = editingMessageId === msg.id;
                                const isCopied = copiedMessageId === msg.id;
                                const isDeleting = deletingMessageId === msg.id;

                                return (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative mb-2.5`}
                                    >
                                        <div className={`max-w-lg p-3.5 rounded-2xl text-xs space-y-2 shadow-2xs transition-all relative ${
                                            isMe
                                                ? "bg-[#4085b3]/12 border border-[#4085b3]/30 text-slate-800 rounded-br-xs font-normal"
                                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs font-normal"
                                        }`}>
                                            <div className={`flex items-center justify-between space-x-3 text-[10px] pb-1.5 border-b ${
                                                isMe ? "text-[#245f8b] border-[#4085b3]/20" : "text-slate-500 border-slate-100"
                                            }`}>
                                                <span className="font-semibold">{isMe ? "You" : (msg.sender?.name || "Recipient")}</span>
                                                <div className="flex items-center gap-1.5 text-slate-500 font-normal">
                                                    {msg.isEdited && <span className="italic text-[9px] text-slate-400 font-normal">(edited)</span>}
                                                    <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {isMe && (
                                                        <span title={msg.isRead ? "Read by recipient" : "Delivered"}>
                                                            {msg.isRead ? (
                                                                <span className="inline-flex items-center text-[#4085b3] font-medium">
                                                                    <CheckCheck className="w-3.5 h-3.5" />
                                                                    <span className="ml-0.5 text-[9px]">Read</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center text-[#4085b3]/70 font-medium">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span className="ml-0.5 text-[9px]">Sent</span>
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="space-y-2 pt-1">
                                                    <textarea
                                                        value={editingContent}
                                                        onChange={(e) => setEditingContent(e.target.value)}
                                                        className={`w-full p-2.5 text-xs rounded-xl border resize-none focus:outline-hidden ${
                                                            isMe
                                                                ? "bg-white text-slate-900 border-[#4085b3] focus:ring-1 focus:ring-[#4085b3]/30"
                                                                : "bg-slate-50 text-slate-800 border-slate-300 focus:ring-1 focus:ring-blue-500"
                                                        }`}
                                                        rows={3}
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelEdit}
                                                            className="px-2.5 py-1 text-[11px] rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveEdit(msg.id)}
                                                            disabled={isUpdatingMessage || !editingContent.trim()}
                                                            className="px-3 py-1 bg-[#4085b3] hover:bg-[#32698e] text-white rounded-lg text-[11px] font-bold shadow-xs disabled:opacity-50 transition-colors"
                                                        >
                                                            {isUpdatingMessage ? "Saving..." : "Save"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {msg.content && (
                                                        <p className="leading-relaxed whitespace-pre-wrap break-words text-slate-800 font-normal text-xs">
                                                            {formatCleanMessageContent(msg.content)}
                                                        </p>
                                                    )}

                                                    {/* Attached File Display with Live Preview */}
                                                    {msg.attachmentUrl && (
                                                        <div className="pt-1">
                                                            {(msg.attachmentType?.startsWith("image/") || msg.attachmentUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                                                                <div
                                                                    onClick={() => setPreviewDoc({ url: msg.attachmentUrl, name: msg.attachmentName || "Attached Image", type: "image" })}
                                                                    className="rounded-xl overflow-hidden border border-[#4085b3]/30 bg-slate-50 max-w-xs mt-1 cursor-pointer group/img relative"
                                                                >
                                                                    <img
                                                                        src={msg.attachmentUrl}
                                                                        alt={msg.attachmentName || "Attached Image"}
                                                                        className="max-h-48 w-auto rounded-lg object-contain mx-auto transition-transform duration-200 group-hover/img:scale-[1.02]"
                                                                    />
                                                                    <div className="absolute inset-0 bg-[#4085b3]/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-bold gap-1.5">
                                                                        <Eye className="w-4 h-4" />
                                                                        <span>Preview Image</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-2.5 rounded-xl border border-[#4085b3]/30 bg-white/95 text-slate-800 flex items-center justify-between gap-3 text-xs mt-1 hover:border-[#4085b3] hover:shadow-xs transition-all">
                                                                    <div
                                                                        onClick={() => setPreviewDoc({ url: msg.attachmentUrl, name: msg.attachmentName || "Attached Document", type: msg.attachmentType || "document" })}
                                                                        className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer group/doc"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-[#4085b3]/10 text-[#4085b3] flex items-center justify-center shrink-0">
                                                                            <FileText className="w-4 h-4" />
                                                                        </div>
                                                                        <div className="truncate min-w-0">
                                                                            <p className="truncate font-semibold text-slate-900 group-hover/doc:text-[#4085b3] transition-colors">
                                                                                {msg.attachmentName || "Attached Document"}
                                                                            </p>
                                                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                                <span>Document</span>
                                                                                <span>•</span>
                                                                                <span className="text-[#4085b3] font-medium inline-flex items-center gap-0.5">
                                                                                    <Eye className="w-3 h-3" /> Click to Preview
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewDoc({ url: msg.attachmentUrl, name: msg.attachmentName || "Attached Document", type: msg.attachmentType || "document" })}
                                                                            className="px-2.5 py-1 rounded-md text-[10px] font-bold text-[#4085b3] hover:bg-[#4085b3]/10 border border-[#4085b3]/30 flex items-center gap-1 cursor-pointer transition-colors"
                                                                            title="Preview Document"
                                                                        >
                                                                            <Eye className="w-3 h-3" />
                                                                            <span>Preview</span>
                                                                        </button>
                                                                        <a
                                                                            href={msg.attachmentUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            download={msg.attachmentName || true}
                                                                            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                            title="Download File"
                                                                        >
                                                                            <Download className="w-3.5 h-3.5" />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Options: Copy, Edit, Delete, Reply */}
                                            {!isEditing && (
                                                <div className={`flex items-center gap-1 pt-1.5 border-t ${
                                                    isMe ? "border-[#4085b3]/20" : "border-slate-100"
                                                }`}>
                                                    {/* Copy Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyMessage(formatCleanMessageContent(msg.content), msg.id)}
                                                        className="px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                                        title="Copy text"
                                                    >
                                                        {isCopied ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-emerald-500" />
                                                                <span className="text-[9px] text-emerald-600 font-bold">Copied</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" />
                                                                <span className="text-[9px]">Copy</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Reply Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartReply(msg)}
                                                        className="px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                                        title="Reply to message"
                                                    >
                                                        <Reply className="w-3 h-3" />
                                                        <span className="text-[9px]">Reply</span>
                                                    </button>

                                                    {/* Edit Option (allowed for sender's messages) */}
                                                    {isMe && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(msg)}
                                                            className="px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                                            title="Edit message"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                            <span className="text-[9px]">Edit</span>
                                                        </button>
                                                    )}

                                                    {/* Delete Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        disabled={isDeleting}
                                                        className="px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        <span className="text-[9px]">{isDeleting ? "Deleting..." : "Delete"}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {/* Real-time typing bubble for student/recipient */}
                        {isStudentTyping && (
                            <div className="flex items-start">
                                <div className="max-w-xs p-3 rounded-2xl text-xs bg-white border border-slate-200 text-slate-600 rounded-bl-xs shadow-2xs flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-slate-500">
                                        {selectedContact?.name || "Student"} is typing
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#4085b3] animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#4085b3] animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#4085b3] animate-bounce"></span>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Composer Form */}
                    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                        {/* Hidden file input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleSelectAttachment}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        />

                        {/* Replying Banner */}
                        {replyingTo && (
                            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200/90 rounded-xl text-xs text-blue-900 shadow-2xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Reply className="w-3.5 h-3.5 text-[#4085b3] shrink-0" />
                                    <div className="truncate">
                                        <span className="font-bold">Replying to {replyingTo.senderName}: </span>
                                        <span className="text-slate-600 truncate">{replyingTo.content.slice(0, 80)}{replyingTo.content.length > 80 ? '...' : ''}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-blue-100/70 rounded-md transition-colors shrink-0 ml-2 cursor-pointer"
                                    title="Cancel reply"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Selected File Attachment Preview */}
                        {attachedFile && (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-950 shadow-2xs">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                                        {attachedFile.type.startsWith("image/") ? (
                                            <ImageIcon className="w-4 h-4 text-amber-700" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-amber-700" />
                                        )}
                                    </div>
                                    <div className="truncate">
                                        <p className="font-bold truncate text-slate-900">{attachedFile.name}</p>
                                        <p className="text-[10px] text-amber-800">
                                            {(attachedFile.size / (1024 * 1024)).toFixed(2)} MB • {attachedFile.type.startsWith("image/") ? "Image" : "Document"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveAttachment}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0 ml-2 cursor-pointer"
                                    title="Remove attachment"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Topic / Priority options */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder={
                                    (activeCategory === "STUDENT" && studentTargetMode !== "STUDENT") || (activeCategory === "PARENT" && parentTargetMode !== "PARENT")
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

                        {/* Textarea, Attachment button and Send */}
                        <form onSubmit={handleSendMessage} className="space-y-2">
                            <div className="flex gap-2">
                                <textarea
                                    value={messageText}
                                    onChange={(e) => {
                                        setMessageText(e.target.value);
                                        if (selectedTargetUserId) {
                                            emitTyping(selectedTargetUserId, true);
                                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                            typingTimeoutRef.current = setTimeout(() => {
                                                if (selectedTargetUserId) emitTyping(selectedTargetUserId, false);
                                            }, 1500);
                                        }
                                    }}
                                    placeholder={
                                        activeCategory === "STUDENT" && studentTargetMode === "ALL"
                                            ? `Write announcement to all ${studentsList.length} students across all your classes...`
                                            : activeCategory === "STUDENT" && studentTargetMode === "SECTION"
                                            ? `Write announcement for ${activeClassObj?.displayName || 'this section'}...`
                                            : activeCategory === "PARENT" && parentTargetMode === "ALL"
                                            ? `Write broadcast to all parents across all your classes...`
                                            : activeCategory === "PARENT" && parentTargetMode === "SECTION"
                                            ? `Write broadcast to parents of students in ${activeClassObj?.displayName || 'this section'}...`
                                            : activeCategory === "PARENT" && selectedContact
                                            ? `Write your message to ${selectedContact.name} (${selectedContact.studentName ? `${selectedContact.studentName}'s parent` : 'Parent'})...`
                                            : selectedContact
                                            ? `Write your message to ${selectedContact.name}...`
                                            : `Type your message for this ${activeCategory.toLowerCase()} communication...`
                                    }
                                    className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-20"
                                />
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    {/* Paperclip Attach Button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={sending || uploadingAttachment}
                                        className={`px-3 py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs ${
                                            attachedFile
                                                ? "bg-amber-100 border-amber-300 text-amber-900"
                                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                                        }`}
                                        title="Attach Image, PDF, Word, or Document"
                                    >
                                        <Paperclip className="w-4 h-4 text-[#4085b3]" />
                                        <span className="text-[11px] font-bold">{attachedFile ? "Attached" : "Attach"}</span>
                                    </button>

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        disabled={sending || uploadingAttachment || (!messageText.trim() && !attachedFile)}
                                        className={`flex-1 px-4 font-bold rounded-xl disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 cursor-pointer ${
                                            (activeCategory === "STUDENT" && studentTargetMode === "ALL") || (activeCategory === "PARENT" && parentTargetMode === "ALL")
                                                ? "bg-[#4085b3] hover:bg-[#32698e] text-white"
                                                : (activeCategory === "STUDENT" && studentTargetMode === "SECTION") || (activeCategory === "PARENT" && parentTargetMode === "SECTION")
                                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                                : "bg-[#4085b3] hover:bg-[#32698e] text-amber-300"
                                        }`}
                                    >
                                        {(activeCategory === "STUDENT" && studentTargetMode !== "STUDENT") || (activeCategory === "PARENT" && parentTargetMode !== "PARENT") ? (
                                            <Megaphone className="w-4 h-4" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        <span className="text-[11px]">
                                            {uploadingAttachment
                                                ? "Uploading..."
                                                : sending
                                                ? "Sending..."
                                                : (activeCategory === "STUDENT" && studentTargetMode === "ALL") || (activeCategory === "PARENT" && parentTargetMode === "ALL")
                                                ? "Broadcast All"
                                                : (activeCategory === "STUDENT" && studentTargetMode === "SECTION") || (activeCategory === "PARENT" && parentTargetMode === "SECTION")
                                                ? "Broadcast Section"
                                                : "Send"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            )}

            {/* Interactive Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-[#4085b3]/15 text-[#4085b3] flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-md">
                                        {previewDoc.name || "Document Preview"}
                                    </h3>
                                    <p className="text-[10px] text-slate-400">File Preview Viewer</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={previewDoc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#4085b3]" />
                                    <span>Open in New Tab</span>
                                </a>
                                <a
                                    href={previewDoc.url}
                                    download={previewDoc.name || "document"}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#4085b3] hover:bg-[#32698e] rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Close preview"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Document / Image Preview */}
                        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100/50 min-h-[400px]">
                            {(previewDoc.type === "image" || previewDoc.url.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                                <div className="max-h-[70vh] max-w-full flex items-center justify-center">
                                    <img
                                        src={previewDoc.url}
                                        alt={previewDoc.name || "Image Preview"}
                                        className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200"
                                    />
                                </div>
                            ) : (previewDoc.url.match(/\.pdf$/i) || previewDoc.type?.includes("pdf")) ? (
                                <iframe
                                    src={`${previewDoc.url}#toolbar=1`}
                                    title={previewDoc.name || "PDF Document"}
                                    className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white shadow-xs"
                                />
                            ) : (
                                <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full text-center space-y-4 shadow-sm">
                                    <div className="w-16 h-16 rounded-2xl bg-[#4085b3]/10 text-[#4085b3] flex items-center justify-center mx-auto">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">{previewDoc.name || "Document File"}</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            This document can be opened in the browser viewer or downloaded directly.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <a
                                            href={previewDoc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span>Open Viewer</span>
                                        </a>
                                        <a
                                            href={previewDoc.url}
                                            download={previewDoc.name || true}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                                        >
                                            <Download className="w-4 h-4 text-slate-600" />
                                            <span>Download</span>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
