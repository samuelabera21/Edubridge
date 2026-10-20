"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  UserRound,
  Search,
  Clock,
  CheckCheck,
  Check,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Volume2,
  VolumeX,
  BookOpen,
  Mail,
  GraduationCap,
  Calendar,
  AlertCircle,
  HelpCircle,
  X,
  Smile,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getSocket, emitTyping, emitMarkRead } from "@/lib/socket";
import CommunicationHeader from "../CommunicationHeader";

export type Teacher = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  email?: string | null;
  assignments: { subject: { name: string } }[];
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string | null };
  receiver: { id: string; name: string | null };
};

// Quick reply templates for instant student-teacher interaction
const QUICK_TEMPLATES = [
  "👋 Good morning teacher!",
  "❓ I have a question regarding today's assignment.",
  "✅ I have completed and uploaded the worksheet.",
  "🙏 Thank you so much for the helpful explanation!",
  "📅 Could you clarify the deadline for our next project?",
];

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio permission or context errors
  }
}

export default function StudentTeacherMessagesPage() {
  const { authData } = useAuth();
  const currentUserId = authData?.user?.id;

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter controls
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");
  const [searchMsgQuery, setSearchMsgQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // Real-time WebSocket states
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isTeacherTyping, setIsTeacherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMsgCountRef = useRef<number>(0);

  const selectedTeacher =
    teachers.find((t) => t.userId === selectedTeacherId) ?? teachers[0] ?? null;

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // 1. Initial Load: Teachers list
  useEffect(() => {
    async function loadTeachers() {
      try {
        const response = await fetchApi("/student/communication/teachers");
        if (!response.ok) throw new Error("Unable to load assigned teachers");
        const data = await response.json();
        const assigned = Array.isArray(data) ? (data as Teacher[]) : [];
        const validTeachers = assigned.filter((t) => t.userId);
        setTeachers(validTeachers);

        if (validTeachers.length > 0) {
          setSelectedTeacherId((prev) => prev ?? validTeachers[0].userId);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load teachers");
      } finally {
        setLoading(false);
      }
    }
    void loadTeachers();
  }, []);

  // 2. Fetch all messages overview to compute unread badges per teacher
  const refreshUnreadCounts = useCallback(async () => {
    try {
      const res = await fetchApi("/student/communication/messages");
      if (res.ok) {
        const allMsgs: Message[] = await res.json();
        if (Array.isArray(allMsgs)) {
          const map: Record<string, number> = {};
          allMsgs.forEach((m) => {
            if (m.receiverId === currentUserId && !m.isRead) {
              map[m.senderId] = (map[m.senderId] || 0) + 1;
            }
          });
          setUnreadMap(map);
        }
      }
    } catch {
      // Ignore background sync errors
    }
  }, [currentUserId]);

  // 3. Load active conversation messages
  const loadMessages = useCallback(
    async (isSilentSync = false) => {
      if (!selectedTeacher?.userId) return;
      try {
        if (!isSilentSync) setSyncing(true);
        const response = await fetchApi(
          `/student/communication/messages?otherUserId=${encodeURIComponent(
            selectedTeacher.userId
          )}`
        );
        if (response.ok) {
          const data: Message[] = await response.json();
          const valid = Array.isArray(data) ? data : [];

          // Detect new incoming message from teacher
          if (
            isSilentSync &&
            valid.length > lastMsgCountRef.current &&
            valid[valid.length - 1]?.senderId === selectedTeacher.userId
          ) {
            if (soundEnabled) playNotificationChime();
            setTimeout(() => scrollToBottom(true), 100);
          }

          lastMsgCountRef.current = valid.length;
          setMessages(valid);
          setLastSyncTime(new Date());

          // Clear unread badge for selected teacher
          setUnreadMap((prev) => ({ ...prev, [selectedTeacher.userId!]: 0 }));
        }
      } catch (err) {
        if (!isSilentSync) {
          console.error("Failed to load conversation messages", err);
        }
      } finally {
        if (!isSilentSync) setSyncing(false);
      }
    },
    [selectedTeacher, soundEnabled, scrollToBottom]
  );

  // Initial load on teacher switch
  useEffect(() => {
    if (selectedTeacher?.userId) {
      void loadMessages(false).then(() => {
        setTimeout(() => scrollToBottom(false), 80);
      });
      void refreshUnreadCounts();
    }
  }, [selectedTeacher?.userId, loadMessages, refreshUnreadCounts, scrollToBottom]);

  // 4. WebSocket Real-Time Gateway Connection
  useEffect(() => {
    if (!currentUserId) return;
    const socket = getSocket(currentUserId);
    if (!socket) return;

    const onConnect = () => {
      setSocketConnected(true);
      // Fetch online status of current teachers
      const teacherIds = teachers.map((t) => t.userId).filter(Boolean) as string[];
      if (teacherIds.length > 0) {
        socket.emit("get_online_status", teacherIds, (statuses: Record<string, boolean>) => {
          if (statuses) {
            const online = Object.keys(statuses).filter((id) => statuses[id]);
            setOnlineUserIds(new Set(online));
          }
        });
      }
    };

    const onDisconnect = () => setSocketConnected(false);

    const onOnlineUsers = (users: string[]) => {
      if (Array.isArray(users)) {
        setOnlineUserIds(new Set(users));
      }
    };

    const onUserPresence = ({ userId, status }: { userId: string; status: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (status === "online") next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const onNewMessage = (msg: Message) => {
      if (!msg) return;

      const isCurrentThread =
        selectedTeacher?.userId &&
        ((msg.senderId === selectedTeacher.userId && msg.receiverId === currentUserId) ||
          (msg.senderId === currentUserId && msg.receiverId === selectedTeacher.userId));

      if (isCurrentThread) {
        setMessages((prev) => {
          // If message already exists by id, do not add again
          if (prev.some((m) => m.id === msg.id)) return prev;

          // If this message was sent by the current user, reconcile with any pending optimistic temp message
          if (msg.senderId === currentUserId) {
            const tempIndex = prev.findIndex(
              (m) =>
                m.id.startsWith("temp_") &&
                m.content.trim() === msg.content.trim() &&
                m.receiverId === msg.receiverId
            );
            if (tempIndex !== -1) {
              const next = [...prev];
              next[tempIndex] = msg;
              return next;
            }
          }

          return [...prev, msg];
        });

        if (msg.senderId === selectedTeacher?.userId) {
          if (soundEnabled) playNotificationChime();
          emitMarkRead(selectedTeacher.userId);
          setTimeout(() => scrollToBottom(true), 60);
        }
      } else if (msg.senderId !== currentUserId) {
        setUnreadMap((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
        if (soundEnabled) playNotificationChime();
      }
    };

    const onTypingStatus = (data: { fromUserId: string; isTyping: boolean }) => {
      if (selectedTeacher?.userId && data.fromUserId === selectedTeacher.userId) {
        setIsTeacherTyping(Boolean(data.isTyping));
      }
    };

    const onMessagesRead = (data: { byUserId: string }) => {
      if (selectedTeacher?.userId && data.byUserId === selectedTeacher.userId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true } : m))
        );
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("online_users_list", onOnlineUsers);
    socket.on("user_presence", onUserPresence);
    socket.on("new_message", onNewMessage);
    socket.on("typing_status", onTypingStatus);
    socket.on("messages_read", onMessagesRead);

    if (socket.connected) {
      setSocketConnected(true);
      const teacherIds = teachers.map((t) => t.userId).filter(Boolean) as string[];
      if (teacherIds.length > 0) {
        socket.emit("get_online_status", teacherIds, (statuses: Record<string, boolean>) => {
          if (statuses) {
            const online = Object.keys(statuses).filter((id) => statuses[id]);
            setOnlineUserIds(new Set(online));
          }
        });
      }
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("online_users_list", onOnlineUsers);
      socket.off("user_presence", onUserPresence);
      socket.off("new_message", onNewMessage);
      socket.off("typing_status", onTypingStatus);
      socket.off("messages_read", onMessagesRead);
    };
  }, [currentUserId, selectedTeacher?.userId, soundEnabled, scrollToBottom, teachers]);

  // 5. Intelligent Fallback Sync (Throttled when WebSocket is connected)
  useEffect(() => {
    if (!selectedTeacher?.userId) return;

    const pollInterval = socketConnected ? 12000 : 3000;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadMessages(true);
        void refreshUnreadCounts();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [selectedTeacher?.userId, socketConnected, loadMessages, refreshUnreadCounts]);

  // Handle typing status from student
  const handleContentChange = (val: string) => {
    setContent(val);
    if (selectedTeacher?.userId) {
      emitTyping(selectedTeacher.userId, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedTeacher?.userId) emitTyping(selectedTeacher.userId, false);
      }, 1500);
    }
  };

  // 6. Send message action with optimistic update
  async function sendMessage(event?: React.FormEvent, customText?: string) {
    if (event) event.preventDefault();
    const messageToSend = (customText ?? content).trim();
    if (!selectedTeacher?.userId || !messageToSend || sending) return;

    if (selectedTeacher?.userId) {
      emitTyping(selectedTeacher.userId, false);
    }

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: currentUserId || "me",
      receiverId: selectedTeacher.userId,
      content: messageToSend,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId || "me", name: "You" },
      receiver: {
        id: selectedTeacher.userId,
        name: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
      },
    };

    setMessages((current) => [...current, optimisticMessage]);
    setContent("");
    setSending(true);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const response = await fetchApi("/student/communication/messages", {
        method: "POST",
        body: JSON.stringify({
          receiverId: selectedTeacher.userId,
          content: messageToSend,
        }),
      });

      if (response.ok) {
        const sentMessage = (await response.json()) as Message;
        setMessages((current) => {
          // If onNewMessage already added or reconciled the message:
          const alreadyExists = current.some((m) => m.id === sentMessage.id);
          if (alreadyExists) {
            // Remove the temporary placeholder
            return current.filter((m) => m.id !== tempId);
          }
          // Otherwise, replace the temporary placeholder with the persisted message
          return current.map((m) => (m.id === tempId ? sentMessage : m));
        });
        lastMsgCountRef.current += 1;
        setLastSyncTime(new Date());
      } else {
        throw new Error("Failed to deliver message");
      }
    } catch (err) {
      console.error(err);
      // Remove failed optimistic message and restore text
      setMessages((current) => current.filter((m) => m.id !== tempId));
      setContent(messageToSend);
      alert("Could not send message. Please check your connection and retry.");
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom(true), 80);
    }
  }

  // Filtered teachers list by search query
  const filteredTeachers = useMemo(() => {
    const q = searchTeacherQuery.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
      const subjects = t.assignments
        .map((a) => a.subject.name.toLowerCase())
        .join(" ");
      return fullName.includes(q) || subjects.includes(q);
    });
  }, [teachers, searchTeacherQuery]);

  // Filtered conversation messages by in-chat search query (guaranteed deduplicated)
  const filteredConversation = useMemo(() => {
    const q = searchMsgQuery.toLowerCase().trim();

    // Deduplicate by message ID so duplicate elements are never rendered
    const seenIds = new Set<string>();
    const uniqueMessages = messages.filter((m) => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

    if (!q) return uniqueMessages;
    return uniqueMessages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchMsgQuery]);

  // Format message time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Group messages by Date for chronological chat dividers
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: Message[] }[] = [];
    filteredConversation.forEach((m) => {
      const date = new Date(m.createdAt);
      const isToday = new Date().toDateString() === date.toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.toDateString() === date.toDateString();

      const label = isToday
        ? "Today"
        : isYesterday
        ? "Yesterday"
        : date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

      const existing = groups.find((g) => g.dateLabel === label);
      if (existing) {
        existing.items.push(m);
      } else {
        groups.push({ dateLabel: label, items: [m] });
      }
    });
    return groups;
  }, [filteredConversation]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center text-sm text-slate-500">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#184973]" />
        Loading your assigned faculty and message channels...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-rose-600" />
          <div>
            <h2 className="font-bold text-rose-900">Communication Service Notice</h2>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      {/* ─── Page Header with Unified Sub-Nav ──────────────────────────── */}
      <CommunicationHeader
        title="Teacher Messages"
        subtitle="Live two-way interactive messaging with instructors assigned to your current section."
        isLive={true}
        onRefresh={() => void loadMessages(false)}
        refreshing={syncing}
      />

      {/* ─── Two-Column Interactive Communicator ─── */}
      <div className="grid min-h-[620px] grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Sidebar: Teachers Roster */}
        <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Your Teachers
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#184973]">
                {teachers.length} Assigned
              </span>
            </div>

            {/* Teacher Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher or subject..."
                value={searchTeacherQuery}
                onChange={(e) => setSearchTeacherQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8.5 pr-3 text-xs outline-none focus:border-[#184973] focus:ring-1 focus:ring-[#184973] transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredTeachers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <UserRound className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                No teachers match your search.
              </div>
            ) : (
              filteredTeachers.map((teacher) => {
                const isSelected = selectedTeacher?.userId === teacher.userId;
                const unreadCount = teacher.userId ? unreadMap[teacher.userId] || 0 : 0;
                const isOnline = teacher.userId ? onlineUserIds.has(teacher.userId) : false;
                const subjectList = teacher.assignments
                  .map((a) => a.subject.name)
                  .join(" · ");

                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => {
                      setSelectedTeacherId(teacher.userId);
                      setSearchMsgQuery("");
                    }}
                    className={`w-full rounded-xl p-3 text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 text-[#184973] shadow-xs"
                        : "hover:bg-slate-50 text-slate-800 border border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? "bg-[#184973] text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {teacher.firstName.charAt(0).toUpperCase()}
                        {teacher.lastName.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                          isOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={isOnline ? "Active Now" : "Offline"}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white shrink-0 animate-pulse">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-500 mt-0.5">
                        {subjectList || "Faculty Instructor"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isOnline ? "text-emerald-700" : "text-slate-400"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
                          {isOnline ? "Active Now" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Panel: Live Interactive Chat */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {selectedTeacher ? (
            <>
              {/* Chat Top Banner */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#184973] to-[#2563eb] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {selectedTeacher.firstName.charAt(0).toUpperCase()}
                      {selectedTeacher.lastName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        selectedTeacher.userId && onlineUserIds.has(selectedTeacher.userId)
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        {selectedTeacher.firstName} {selectedTeacher.lastName}
                      </h2>
                      {selectedTeacher.userId && onlineUserIds.has(selectedTeacher.userId) ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          Active Now
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Offline
                        </span>
                      )}
                      {socketConnected && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 hidden sm:inline-block">
                          ⚡ Socket Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {selectedTeacher.assignments.map((a) => a.subject.name).join(" · ")} · Assigned Instructor
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* In-chat message search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchMsgQuery}
                      onChange={(e) => setSearchMsgQuery(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white py-1 pl-8 pr-2 text-xs outline-none focus:border-[#184973] focus:ring-1 focus:ring-[#184973] w-36 sm:w-48 transition"
                    />
                    {searchMsgQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchMsgQuery("")}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sound alert toggle */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((v) => !v)}
                    title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
                    className={`rounded-xl border p-2 text-xs transition cursor-pointer ${
                      soundEnabled
                        ? "border-blue-200 bg-blue-50 text-[#184973]"
                        : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Message Stream Area */}
              <div
                ref={chatContainerRef}
                className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 sm:p-5"
                style={{ minHeight: "380px", maxHeight: "480px" }}
              >
                {filteredConversation.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-center text-slate-400">
                    <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80 mb-3">
                      <Sparkles className="h-7 w-7 text-amber-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No messages yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Direct messages with Teacher {selectedTeacher.firstName} will update here in real time.
                      Use the quick reply templates below or type a message to begin.
                    </p>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.dateLabel} className="space-y-3">
                      {/* Date Divider */}
                      <div className="flex items-center justify-center my-2">
                        <span className="rounded-full bg-slate-200/80 px-3 py-0.5 text-[10px] font-bold text-slate-600">
                          {group.dateLabel}
                        </span>
                      </div>

                      {group.items.map((msg) => {
                        const isStudent = msg.senderId === currentUserId || msg.senderId === "me";

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isStudent ? "justify-end" : "justify-start"} items-end gap-2`}
                          >
                            {!isStudent && (
                              <div className="h-7 w-7 rounded-full bg-[#184973] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs mb-1">
                                {selectedTeacher.firstName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div
                              className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs transition-all shadow-xs ${
                                isStudent
                                  ? "bg-[#184973] text-white rounded-br-xs"
                                  : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs"
                              }`}
                            >
                              {!isStudent && (
                                <p className="text-[10px] font-bold text-[#184973] mb-1">
                                  {selectedTeacher.firstName} {selectedTeacher.lastName}
                                </p>
                              )}

                              <p className="whitespace-pre-wrap leading-relaxed text-inherit font-normal">
                                {msg.content}
                              </p>

                              <div
                                className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
                                  isStudent ? "text-blue-200" : "text-slate-400"
                                }`}
                              >
                                <span>{formatTime(msg.createdAt)}</span>
                                {isStudent && (
                                  <span className="inline-flex items-center" title={msg.isRead ? "Read by teacher" : "Delivered"}>
                                    {msg.isRead ? (
                                      <span className="inline-flex items-center text-amber-300 font-bold">
                                        <CheckCheck className="h-3 w-3" />
                                        <span className="ml-0.5 text-[9px]">Read</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-blue-200">
                                        <Check className="h-3 w-3" />
                                        <span className="ml-0.5 text-[9px]">Sent</span>
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                {/* Real-time typing bubble */}
                {isTeacherTyping && (
                  <div className="flex items-end gap-2 text-xs">
                    <div className="h-7 w-7 rounded-full bg-[#184973] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs mb-1">
                      {selectedTeacher.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="rounded-2xl rounded-bl-xs bg-white border border-slate-200/90 px-3.5 py-2.5 text-slate-600 shadow-xs flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500">
                        {selectedTeacher.firstName} is typing
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#184973] animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#184973] animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#184973] animate-bounce"></span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Template Chips */}
              <div className="border-t border-slate-100 bg-white px-4 py-2.5 overflow-x-auto flex items-center gap-1.5" style={{ scrollbarWidth: "none" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                  Quick:
                </span>
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => void sendMessage(undefined, tmpl)}
                    disabled={sending}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-[#184973] hover:bg-blue-50 hover:text-[#184973] transition disabled:opacity-50 cursor-pointer"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>

              {/* Interactive Message Input Form */}
              <form
                onSubmit={(e) => void sendMessage(e)}
                className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={`Write a message to Teacher ${selectedTeacher.firstName}...`}
                    disabled={sending}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-3.5 pr-10 text-xs outline-none focus:border-[#184973] focus:bg-white focus:ring-1 focus:ring-[#184973] transition disabled:opacity-50"
                  />
                  {content && (
                    <button
                      type="button"
                      onClick={() => setContent("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#184973] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#123655] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {sending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-500">
              Select an assigned instructor to begin communication.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
