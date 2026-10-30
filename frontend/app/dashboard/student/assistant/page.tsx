"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Flame,
  Gamepad2,
  HelpCircle,
  History,
  ImageIcon,
  Lightbulb,
  MessageSquare,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Smile,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  User,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";
import { useAuth } from "@/hooks/useAuth";
import AssistantHeader from "./AssistantHeader";

type StudentSubject = {
  id: string;
  name: string;
  code?: string;
  teacherName?: string;
};

type AttachedFileInfo = {
  name: string;
  size: number;
  mimeType: string;
  data: string; // base64
};

type SharedResourceItem = {
  id: string;
  title: string;
  category: "teacher" | "school" | "recommended";
  subjectName?: string;
  description?: string;
  source?: string;
  recommendationNote?: string;
  resourceType?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  file?: AttachedFileInfo;
  resource?: SharedResourceItem;
  suggestedFollowUps?: string[];
};

type PracticeQuestion = {
  id?: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
  explanation: string;
  difficulty?: string;
  resourceGrounding?: string;
};

type StudyPlanSubjectBlock = {
  name: string;
  duration: string;
  focus: string;
};

type StudyPlanHomeworkSlot = {
  duration: string;
  description: string;
};

type StudyPlanExtracurricular = {
  name: string;
  duration: string;
  benefit: string;
};

type StudyPlanItem = {
  day: string;
  isWeekend?: boolean;
  theme?: string;
  totalDuration?: string;
  subject?: string;
  duration?: string;
  subjects?: StudyPlanSubjectBlock[];
  homeworkSlot?: StudyPlanHomeworkSlot;
  tasks: string[];
  extracurricular?: StudyPlanExtracurricular;
  funTip?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  summary?: string;
};

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "m_welcome",
  role: "assistant",
  text: "Hello! I am EduBridge AI, your personal curriculum-grounded academic tutor. Ask me any concept, paste a tricky homework problem, or upload a photo of a textbook diagram or past exam paper. What would you like to master today?",
  timestamp: "Just now",
  suggestedFollowUps: [
    "Explain a difficult concept using a real-world analogy",
    "Help me solve a step-by-step problem from my homework",
    "What are common exam traps in this subject?",
  ],
};

function StudentAssistantPageContent() {
  const { authData } = useAuth();
  const currentUserId = authData?.user?.id;
  const currentUserName = authData?.user?.name || "Student";

  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as "explain" | "practice" | "plan") || "explain";

  const [mode, setMode] = useState<"explain" | "practice" | "plan">(initialMode);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [gradeName, setGradeName] = useState<string>("Grade");
  const [sectionName, setSectionName] = useState<string>("Section");
  const [loading, setLoading] = useState(true);

  // Persistent Conversation Sessions Memory (ChatGPT-style)
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [historySidebarCollapsed, setHistorySidebarCollapsed] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");

  // User Message Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>("");

  // AI Tutor Chatbot state (Mode 1: "explain" / Chatbot)
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [customSubjectExplain, setCustomSubjectExplain] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const [chatAttachedFile, setChatAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Guided Practice state
  const [practiceSubject, setPracticeSubject] = useState<string>("");
  const [customSubjectPractice, setCustomSubjectPractice] = useState<string>("");
  const [practiceWritingSpace, setPracticeWritingSpace] = useState<string>("");
  const [practiceCount, setPracticeCount] = useState<number | string>(5);
  const [practiceDifficulty, setPracticeDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [practiceAttachedFile, setPracticeAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const practiceFileInputRef = useRef<HTMLInputElement>(null);

  // Shared Curriculum Resources (Teacher, School, Recommended)
  const [sharedResources, setSharedResources] = useState<SharedResourceItem[]>([]);
  const [practiceSharedResource, setPracticeSharedResource] = useState<SharedResourceItem | null>(null);
  const [chatSharedResource, setChatSharedResource] = useState<SharedResourceItem | null>(null);
  const [practiceAttachmentTab, setPracticeAttachmentTab] = useState<"upload" | "teacher" | "school" | "recommended">("upload");
  const [resourceFilterQuery, setResourceFilterQuery] = useState<string>("");
  const [showResourcePickerChat, setShowResourcePickerChat] = useState(false);

  // Active Quiz Runner state
  const [quizQuestions, setQuizQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Study Plan Interactive Coaching & Chat state
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(2);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlanItem[] | null>(null);
  const [planPrompt, setPlanPrompt] = useState<string>("");
  const [planStyle, setPlanStyle] = useState<"fun" | "balanced" | "exam" | "homework">("balanced");
  const [coachMessage, setCoachMessage] = useState<string>("");
  const [suggestedAdjustments, setSuggestedAdjustments] = useState<string[]>([]);
  const [planFilterTab, setPlanFilterTab] = useState<"all" | "weekdays" | "weekend">("all");
  const [planChatHistory, setPlanChatHistory] = useState<Array<{ role: "user" | "coach"; text: string; timestamp: string }>>([]);

  // Attractive Modals & Toast State
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  const [showResetChatModal, setShowResetChatModal] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    id: number;
    type: "error" | "info" | "success";
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "error" | "info" | "success" = "error") => {
    const id = Date.now();
    setToastNotification({ id, type, message });
    setTimeout(() => {
      setToastNotification((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  useEffect(() => {
    async function loadStudentData() {
      try {
        const [res, resourcesRes, activitiesRes] = await Promise.all([
          fetchApi("/student/dashboard"),
          fetchApi("/student/resources").catch(() => null),
          fetchApi("/student/learning/activities").catch(() => null),
        ]);

        if (res && res.ok) {
          const data = await res.json();
          const enrolledGrade = data.enrollment?.schoolGrade?.grade?.name || "Grade 10";
          const enrolledSection = data.enrollment?.section?.name ? `Section ${data.enrollment.section.name}` : "Section A";
          setGradeName(enrolledGrade);
          setSectionName(enrolledSection);

          const list: StudentSubject[] = [];
          if (Array.isArray(data.subjects) && data.subjects.length > 0) {
            data.subjects.forEach((s: any) => {
              list.push({
                id: s.id || s.subject.name,
                name: s.subject.name,
                code: s.subject.code,
                teacherName: s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : undefined,
              });
            });
          } else if (Array.isArray(data.weeklyClasses)) {
            const seen = new Set<string>();
            data.weeklyClasses.forEach((c: any) => {
              const name = c.teachingAssignment?.subject?.name;
              if (name && !seen.has(name)) {
                seen.add(name);
                list.push({
                  id: c.id,
                  name,
                  code: c.teachingAssignment?.subject?.code,
                  teacherName: c.teachingAssignment?.teacher
                    ? `${c.teachingAssignment.teacher.firstName} ${c.teachingAssignment.teacher.lastName}`
                    : undefined,
                });
              }
            });
          }

          setSubjects(list);
          if (list.length > 0) {
            setSelectedSubject(list[0].name);
            setPracticeSubject(list[0].name);
          }
        }

        // Process Shared Curriculum Resources (Teacher, School, Recommended)
        const combinedShared: SharedResourceItem[] = [];

        if (resourcesRes && resourcesRes.ok) {
          const apiResources = await resourcesRes.json().catch(() => []);
          if (Array.isArray(apiResources)) {
            apiResources.forEach((r: any) => {
              const hasRec = Array.isArray(r.recommendations) && r.recommendations.length > 0;
              const recNote = hasRec ? r.recommendations[0]?.note : null;
              const teacherFromRec = hasRec && r.recommendations[0]?.teacher
                ? `${r.recommendations[0].teacher.firstName} ${r.recommendations[0].teacher.lastName}`
                : null;
              const isTeacher = Boolean(
                r.isTeacherMaterial ||
                (r.source && r.source.toLowerCase().includes("teacher")) ||
                (r.source && r.source.toLowerCase().includes("unit:")) ||
                (r.authorName && r.authorName.toLowerCase().includes("teacher"))
              );

              const category: "teacher" | "school" | "recommended" = hasRec
                ? "recommended"
                : isTeacher
                ? "teacher"
                : "school";

              combinedShared.push({
                id: r.id || `res_${Math.random()}`,
                title: r.title || "Curriculum Document",
                category,
                subjectName: r.subjectName || "General",
                description: r.description || "Core syllabus material",
                source: r.source || (teacherFromRec ? `Teacher: ${teacherFromRec}` : category === "teacher" ? "Subject Teacher" : "School Repository"),
                recommendationNote: recNote ? `Guidance: "${recNote}"` : undefined,
                resourceType: r.resourceType || "DOCUMENT",
              });
            });
          }
        }

        if (activitiesRes && activitiesRes.ok) {
          const acts = await activitiesRes.json().catch(() => []);
          if (Array.isArray(acts)) {
            acts.forEach((act: any) => {
              const teacherName = act.teachingAssignment?.teacher
                ? `${act.teachingAssignment.teacher.firstName} ${act.teachingAssignment.teacher.lastName}`
                : "Subject Teacher";
              const subName = act.teachingAssignment?.subject?.name || "General";

              combinedShared.push({
                id: `act_${act.id}`,
                title: act.title,
                category: "teacher",
                subjectName: subName,
                description: act.description || `Classroom activity for ${subName}`,
                source: `Assigned by ${teacherName}`,
                recommendationNote: `Class activity assigned by ${teacherName}`,
                resourceType: act.type || "ACTIVITY",
              });
            });
          }
        }

        // Baseline shared resources across all 3 categories (Teacher, School, Recommended)
        const defaultBaselines: SharedResourceItem[] = [
          {
            id: "base_moe_curriculum",
            title: "MoE National Secondary Curriculum Guide & Learning Outcomes",
            category: "school",
            subjectName: "General Curriculum",
            description: "Federal Democratic Republic of Ethiopia Ministry of Education secondary competencies, scientific standards, and evaluation frameworks.",
            source: "Official School Digital Repository",
            resourceType: "SYLLABUS",
          },
          {
            id: "base_school_stem_archive",
            title: "Secondary STEM Laboratory & Formula Handbook",
            category: "school",
            subjectName: "Physics & Chemistry",
            description: "Standard physical constants, SI units, periodic tables, thermodynamic formulas, and laboratory safety protocols.",
            source: "School Academic Repository",
            resourceType: "HANDBOOK",
          },
          {
            id: "base_teacher_diagnostic_handout",
            title: "Teacher Class Notes & Problem-Solving Strategies",
            category: "teacher",
            subjectName: "Mathematics",
            description: "Step-by-step analytical methods, common distractor traps in algebra and calculus, and verified worked examples.",
            source: "Subject Department Head",
            recommendationNote: "Review worked steps and trap avoidance before attempting quizzes.",
            resourceType: "NOTES",
          },
          {
            id: "base_recommended_exam_prep",
            title: "High-Yield Exam Review & Misconception Breakdown",
            category: "recommended",
            subjectName: "Science",
            description: "Critical distinction between everyday intuitive fallacies and rigorous academic laws across science and math.",
            source: "Recommended by Academic Advisory",
            recommendationNote: "Recommended reading to build 2-step logical deduction for Medium and Hard questions.",
            resourceType: "STUDY_GUIDE",
          },
          {
            id: "base_biology_curriculum",
            title: "Cellular Biology & Genetics Reference Document",
            category: "school",
            subjectName: "Biology",
            description: "Detailed molecular diagrams, cellular respiration cycles, DNA replication steps, and ecological food chains.",
            source: "National Digital Library",
            resourceType: "TEXTBOOK",
          },
          {
            id: "base_english_humanities",
            title: "Secondary English & Literature Analytical Guide",
            category: "recommended",
            subjectName: "English",
            description: "Critical reading comprehension strategies, rhetorical devices, and contextual analytical frameworks.",
            source: "English Department Faculty",
            recommendationNote: "Key material for honing textual precision and analysis.",
            resourceType: "READING",
          },
        ];

        const existingIds = new Set(combinedShared.map((c) => c.id));
        for (const base of defaultBaselines) {
          if (!existingIds.has(base.id)) {
            combinedShared.push(base);
          }
        }

        setSharedResources(combinedShared);
      } catch (err) {
        console.error("Failed to load student assistant subjects", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, []);

  // Strict student isolation: when student changes or logs out, immediately reset in-flight state
  useEffect(() => {
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCheckedQuestions({});
    setQuizCompleted(false);
    setPracticeWritingSpace("");
    setPracticeAttachedFile(null);
    setPracticeSharedResource(null);
    setGeneratedPlan(null);
  }, [currentUserId]);

  // Load past conversation sessions strictly scoped to the authenticated student
  useEffect(() => {
    // Purge legacy unscoped storage to prevent any cross-student chat leakage on shared devices
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("edubridge_ai_tutor_sessions");
      } catch (_) {}
    }

    if (!currentUserId) {
      setChatSessions([]);
      setChatMessages([DEFAULT_WELCOME_MESSAGE]);
      setCurrentSessionId(`sess_${Date.now()}`);
      return;
    }

    const scopedKey = `edubridge_ai_tutor_sessions_${currentUserId}`;

    async function loadPastSessions() {
      try {
        let loadedSessions: ChatSession[] = [];

        // 1. Load strictly from student's scoped localStorage key
        if (typeof window !== "undefined") {
          const localRaw = localStorage.getItem(scopedKey);
          if (localRaw) {
            try {
              const parsed = JSON.parse(localRaw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedSessions = parsed;
              }
            } catch (_) {}
          }
        }

        // 2. Fetch from backend to ensure cross-device sync strictly for this student
        const res = await fetchApi("/student/ai/sessions").catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          if (Array.isArray(data.sessions) && data.sessions.length > 0) {
            const map = new Map<string, ChatSession>();
            for (const s of loadedSessions) map.set(s.id, s);
            for (const s of data.sessions) {
              const existing = map.get(s.id);
              if (!existing || new Date(s.updatedAt) > new Date(existing.updatedAt)) {
                map.set(s.id, s);
              }
            }
            loadedSessions = Array.from(map.values()).sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          }
        }

        if (loadedSessions.length > 0) {
          setChatSessions(loadedSessions);
          // Restore the most recently active session for THIS student
          const mostRecent = loadedSessions[0];
          if (mostRecent && Array.isArray(mostRecent.messages) && mostRecent.messages.length > 0) {
            setCurrentSessionId(mostRecent.id);
            setChatMessages(mostRecent.messages);
            if (mostRecent.subject) setSelectedSubject(mostRecent.subject);
          }
        } else {
          setChatSessions([]);
          setChatMessages([DEFAULT_WELCOME_MESSAGE]);
          setCurrentSessionId(`sess_${Date.now()}`);
        }
      } catch (err) {
        console.warn("Could not load past sessions:", err);
      }
    }

    loadPastSessions();
  }, [currentUserId]);

  const persistSession = (
    sessionId: string,
    messages: ChatMessage[],
    subjectToSave?: string,
    titleOverride?: string
  ) => {
    if (!currentUserId) return;
    const scopedKey = `edubridge_ai_tutor_sessions_${currentUserId}`;

    setChatSessions((prev) => {
      const existing = prev.find((s) => s.id === sessionId);
      const sub = subjectToSave || selectedSubject || "General Academic Inquiry";

      let title = titleOverride || existing?.title;
      if (!title || title === "New Conversation" || title === "Academic Session") {
        const firstUser = messages.find((m) => m.role === "user");
        if (firstUser && firstUser.text) {
          title = firstUser.text.slice(0, 36) + (firstUser.text.length > 36 ? "..." : "");
        } else {
          title = `${sub} Tutoring Session`;
        }
      }

      const updatedSession: ChatSession = {
        id: sessionId,
        title,
        subject: sub,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages,
      };

      const others = prev.filter((s) => s.id !== sessionId);
      const newSessions = [updatedSession, ...others].slice(0, 50);

      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(scopedKey, JSON.stringify(newSessions));
        }
      } catch (_) {}

      fetchApi("/student/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: updatedSession }),
      }).catch(() => {});

      return newSessions;
    });
  };

  const handleStartNewChat = () => {
    const newId = `sess_${Date.now()}`;
    setCurrentSessionId(newId);
    setChatMessages([DEFAULT_WELCOME_MESSAGE]);
    setChatInput("");
    setChatAttachedFile(null);
    setChatSharedResource(null);
    setShowHistoryDrawer(false);
    setEditingMessageId(null);
    setEditingMessageText("");
    showToast("Started a fresh conversation session with EduBridge AI.", "info");
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setChatMessages(session.messages || [DEFAULT_WELCOME_MESSAGE]);
    if (session.subject) setSelectedSubject(session.subject);
    setChatInput("");
    setChatAttachedFile(null);
    setChatSharedResource(null);
    setShowHistoryDrawer(false);
    showToast(`Loaded conversation: "${session.title}"`, "info");
  };

  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const scopedKey = currentUserId ? `edubridge_ai_tutor_sessions_${currentUserId}` : null;

    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (scopedKey) {
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(scopedKey, JSON.stringify(filtered));
          }
        } catch (_) {}
      }
      return filtered;
    });

    fetchApi(`/student/ai/sessions/${sessionId}`, { method: "DELETE" }).catch(() => {});

    if (currentSessionId === sessionId) {
      handleStartNewChat();
    }
    showToast("Conversation deleted from history.", "info");
  };

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (mode === "explain") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatSending, mode]);

  // File Upload Handler (Chat or Practice)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "chat" | "practice") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast("File size exceeds 20MB limit. Please choose a smaller image or document.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const info: AttachedFileInfo = {
        name: file.name,
        size: file.size,
        mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        data: base64,
      };
      if (target === "chat") {
        setChatAttachedFile(info);
      } else {
        setPracticeAttachedFile(info);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Send message to AI Tutor Chatbot
  const handleSendChatMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : chatInput).trim();
    if (!query && !chatAttachedFile && !chatSharedResource) return;

    const activeSub =
      selectedSubject === "Other"
        ? (customSubjectExplain.trim() || "General Academic Inquiry")
        : (selectedSubject || subjects[0]?.name || "General Science");

    const userMsgId = `usr_${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: query || (chatSharedResource ? `Please explain and review "${chatSharedResource.title}" (${chatSharedResource.category} material).` : "Please review the attached file."),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      file: chatAttachedFile || undefined,
      resource: chatSharedResource || undefined,
    };

    const updatedWithUser = [...chatMessages, newUserMsg];
    setChatMessages(updatedWithUser);
    persistSession(currentSessionId, updatedWithUser, activeSub);
    setChatInput("");
    const fileToSend = chatAttachedFile;
    const resourceToSend = chatSharedResource;
    setChatAttachedFile(null);
    setChatSharedResource(null);
    setChatSending(true);

    try {
      // Build history for backend (last 10 turns)
      const history = chatMessages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.text,
      }));

      const res = await fetchApi("/student/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSub,
          sessionId: currentSessionId,
          isOther: selectedSubject === "Other",
          enrolledSubjects: subjects.map((s) => s.name),
          history,
          message: query || (resourceToSend ? `Review and explain "${resourceToSend.title}"` : "Please review the attached material."),
          file: fileToSend && fileToSend.data ? fileToSend : undefined,
          attachedResource: resourceToSend ? {
            id: resourceToSend.id,
            title: resourceToSend.title,
            category: resourceToSend.category,
            description: resourceToSend.description,
            authorOrSource: resourceToSend.source,
            recommendationNote: resourceToSend.recommendationNote,
          } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newBotMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: "assistant",
          text: data.reply || "I analyzed your question and here is what you need to know.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedFollowUps: data.suggestedFollowUps || [],
        };
        const updatedWithBot = [...updatedWithUser, newBotMsg];
        setChatMessages(updatedWithBot);
        persistSession(currentSessionId, updatedWithBot, activeSub);
      } else {
        const err = await res.json().catch(() => ({}));
        const fallbackText = "I have reviewed your inquiry. Core curriculum principles emphasize isolating independent variables, verifying fundamental SI units, and evaluating governing conservation laws. What specific calculation or worked example would you like to explore next?";
        const fallbackBotMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: "assistant",
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedFollowUps: [
            "Can you explain the main rule step-by-step?",
            "What is a common exam trap in this topic?",
            "Test me with a practice quiz question"
          ],
        };
        const updatedWithBot = [...updatedWithUser, fallbackBotMsg];
        setChatMessages(updatedWithBot);
        persistSession(currentSessionId, updatedWithBot, activeSub);
        showToast(err.error || "EduBridge AI synthesized a curriculum response.", "info");
      }
    } catch (err) {
      console.error("Chat error:", err);
      const networkBotMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: "assistant",
        text: "I am having trouble connecting to the network right now. Please check your internet connection and try sending your message again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedFollowUps: ["Try sending again"],
      };
      const updatedWithBot = [...updatedWithUser, networkBotMsg];
      setChatMessages(updatedWithBot);
      showToast("Network connection issue. Please check your connection.", "error");
    } finally {
      setChatSending(false);
    }
  };

  // Edit user message and re-generate AI response from that point (like ChatGPT)
  const handleSaveAndSubmitEditedMessage = async (msgId: string) => {
    const trimmed = editingMessageText.trim();
    if (!trimmed) return;

    const msgIndex = chatMessages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const activeSub =
      selectedSubject === "Other"
        ? (customSubjectExplain.trim() || "General Academic Inquiry")
        : (selectedSubject || subjects[0]?.name || "General Science");

    const targetMsg = chatMessages[msgIndex];
    const updatedUserMsg: ChatMessage = {
      ...targetMsg,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Keep history strictly prior to the edited message
    const previousHistory = chatMessages.slice(0, msgIndex);
    const updatedMessages = [...previousHistory, updatedUserMsg];

    setChatMessages(updatedMessages);
    setEditingMessageId(null);
    setEditingMessageText("");
    persistSession(currentSessionId, updatedMessages, activeSub);
    setChatSending(true);

    try {
      const historyForBackend = previousHistory.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.text,
      }));

      const res = await fetchApi("/student/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSub,
          sessionId: currentSessionId,
          isOther: selectedSubject === "Other",
          enrolledSubjects: subjects.map((s) => s.name),
          history: historyForBackend,
          message: trimmed,
          file: targetMsg.file && targetMsg.file.data ? targetMsg.file : undefined,
          attachedResource: targetMsg.resource ? {
            id: targetMsg.resource.id,
            title: targetMsg.resource.title,
            category: targetMsg.resource.category,
            description: targetMsg.resource.description,
            authorOrSource: targetMsg.resource.source,
            recommendationNote: targetMsg.resource.recommendationNote,
          } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newBotMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: "assistant",
          text: data.reply || "I re-evaluated your question and here is the refined insight.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedFollowUps: data.suggestedFollowUps || [],
        };
        const finalMessages = [...updatedMessages, newBotMsg];
        setChatMessages(finalMessages);
        persistSession(currentSessionId, finalMessages, activeSub);
      } else {
        const err = await res.json().catch(() => ({}));
        const fallbackBotMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: "assistant",
          text: `I re-evaluated your edited question for **${activeSub}**. The essential academic takeaway is to state the known variables, verify SI base units, and apply the governing formula before numerical calculations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedFollowUps: ["Show a worked example", "What is an exam distractor here?", "Test me with a quiz question"],
        };
        const finalMessages = [...updatedMessages, fallbackBotMsg];
        setChatMessages(finalMessages);
        persistSession(currentSessionId, finalMessages, activeSub);
        showToast(err.error || "Updated explanation synthesized.", "info");
      }
    } catch (err) {
      console.error("Chat edit error:", err);
      showToast("Network error connecting to EduBridge AI Tutor.", "error");
    } finally {
      setChatSending(false);
    }
  };

  // Generate Guided Practice Quiz
  const handleGeneratePractice = async (
    overridePrompt?: string,
    overrideDiff?: "Easy" | "Medium" | "Hard",
    overrideCount?: number | string
  ) => {
    const activeSub =
      practiceSubject === "Other"
        ? (customSubjectPractice.trim() || "General Academic Inquiry")
        : (practiceSubject || subjects[0]?.name || "General Science");

    const countNum = Number(overrideCount !== undefined ? overrideCount : practiceCount);
    const countToUse = Math.min(Math.max(countNum || 5, 1), 10);
    const diffToUse = overrideDiff !== undefined ? overrideDiff : practiceDifficulty;
    const promptToUse = overridePrompt !== undefined ? overridePrompt : practiceWritingSpace.trim();

    setGeneratingPractice(true);
    setShowHint(false);

    try {
      const res = await fetchApi("/student/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSub,
          topic: activeSub,
          customPrompt: promptToUse || undefined,
          count: countToUse,
          difficulty: diffToUse,
          isOther: practiceSubject === "Other",
          enrolledSubjects: subjects.map((s) => s.name),
          file: practiceAttachedFile && practiceAttachedFile.data ? practiceAttachedFile : undefined,
          attachedResource: practiceSharedResource ? {
            id: practiceSharedResource.id,
            title: practiceSharedResource.title,
            category: practiceSharedResource.category,
            description: practiceSharedResource.description,
            authorOrSource: practiceSharedResource.source,
            recommendationNote: practiceSharedResource.recommendationNote,
          } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const questionsList: PracticeQuestion[] = Array.isArray(data.questions)
          ? data.questions
          : Array.isArray(data)
          ? data
          : data.question
          ? [data]
          : [];

        if (questionsList.length > 0) {
          setQuizQuestions(questionsList);
          setCurrentQuestionIndex(0);
          setUserAnswers({});
          setCheckedQuestions({});
          setQuizCompleted(false);
          if (overrideDiff) setPracticeDifficulty(overrideDiff);
          if (overrideCount) setPracticeCount(overrideCount);
          if (overridePrompt !== undefined) setPracticeWritingSpace(overridePrompt);
        } else {
          showToast("Could not generate questions. Please try again.", "error");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to generate practice quiz.", "error");
      }
    } catch (err) {
      console.error("Failed to generate quiz questions:", err);
      showToast("Network error while generating quiz. Please check connection.", "error");
    } finally {
      setGeneratingPractice(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (checkedQuestions[currentQuestionIndex]) return;
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const handleCheckCurrentAnswer = () => {
    if (userAnswers[currentQuestionIndex] === undefined) return;
    setCheckedQuestions((prev) => ({ ...prev, [currentQuestionIndex]: true }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowHint(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCheckedQuestions({});
    setShowHint(false);
  };

  const totalQuestions = quizQuestions.length;
  const correctCount = quizQuestions.reduce((acc, q, idx) => {
    return acc + (userAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const missedQuestions = quizQuestions
    .map((q, idx) => ({ ...q, studentAnswer: userAnswers[idx], index: idx }))
    .filter((q) => q.studentAnswer !== q.correctIndex);

  const getRankInfo = (pct: number) => {
    if (pct === 100) {
      return {
        badge: "Diamond Scholar",
        icon: "🏆",
        tier: "Mastery Level",
        headerClass: "bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 text-white",
        badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
        message: "Flawless Performance! You demonstrated complete conceptual mastery and avoided every distractor trap.",
      };
    }
    if (pct >= 80) {
      return {
        badge: "Gold Scholar",
        icon: "🥇",
        tier: "Advanced Level",
        headerClass: "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
        message: "Outstanding Accuracy! You show deep curriculum comprehension with sharp analytical reasoning.",
      };
    }
    if (pct >= 60) {
      return {
        badge: "Silver Scholar",
        icon: "🥈",
        tier: "Proficient Level",
        headerClass: "bg-gradient-to-r from-slate-700 via-blue-800 to-slate-800 text-white",
        badgeClass: "bg-blue-100 text-blue-900 border-blue-200",
        message: "Solid Foundation! You understand core principles well. Review the subtle traps below to unlock Gold rank.",
      };
    }
    if (pct >= 40) {
      return {
        badge: "Bronze Scholar",
        icon: "🥉",
        tier: "Developing Level",
        headerClass: "bg-gradient-to-r from-orange-800 via-amber-800 to-orange-900 text-white",
        badgeClass: "bg-orange-100 text-orange-900 border-orange-200",
        message: "Good Effort! A few tricky distractors caught you off guard. Deeply read the explanations below to master the rules.",
      };
    }
    return {
      badge: "Apprentice Scholar",
      icon: "📚",
      tier: "Review Needed",
      headerClass: "bg-gradient-to-r from-rose-700 via-red-800 to-rose-900 text-white",
      badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
      message: "Every expert starts here! These questions test common traps. Review each missed concept below to build your strength.",
    };
  };

  // Generate & Adapt Study Plan with AI Coach
  const handleGeneratePlan = async (
    overridePrompt?: string,
    overrideStyle?: "fun" | "balanced" | "exam" | "homework"
  ) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : planPrompt.trim();
    const styleToSend = overrideStyle || planStyle;

    setGeneratingPlan(true);

    if (promptToSend) {
      setPlanChatHistory((prev) => [
        ...prev,
        {
          role: "user",
          text: promptToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }

    try {
      const res = await fetchApi("/student/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoursPerDay: studyHoursPerDay,
          weekendHours: 3.5,
          customPrompt: promptToSend || undefined,
          style: styleToSend,
          enrolledSubjects: subjects.map((s) => s.name),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const incomingPlan: StudyPlanItem[] = Array.isArray(data.plan) ? data.plan : [];
        setGeneratedPlan(incomingPlan);
        const coachMsg =
          data.coachMessage ||
          `Here is your personalized 7-day schedule! I scheduled 2 subjects per day with dedicated homework blocks on weekdays, and kept your Saturday and Sunday studies to 3.5 hours max so you have plenty of time for sports and hobbies.`;
        setCoachMessage(coachMsg);
        setSuggestedAdjustments(Array.isArray(data.suggestedAdjustments) ? data.suggestedAdjustments : []);
        setPlanChatHistory((prev) => [
          ...prev,
          {
            role: "coach",
            text: coachMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setPlanPrompt("");
        showToast("Personalized weekly study roadmap updated!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to build study schedule.", "error");
      }
    } catch (err) {
      console.error("Failed to generate study plan:", err);
      showToast("Network error while generating study plan.", "error");
    } finally {
      setGeneratingPlan(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <AssistantHeader
        activeMode={mode}
        onSelectMode={(m) => setMode(m)}
        subjectsCount={subjects.length}
      />

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#184973] mx-auto" />
          <p className="text-sm font-medium">Syncing curriculum context from database...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mode 1: Interactive AI Tutor Chatbot with ChatGPT Layout */}
          {mode === "explain" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[620px]">
              {/* Left Column: ChatGPT-Style Conversations History Sidebar */}
              {!historySidebarCollapsed && (
                <aside className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0 h-[420px] md:h-[680px]">
                  {/* Sidebar Header with New Chat & Collapse toggle */}
                  <div className="p-3 border-b border-slate-200 bg-white/80 space-y-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleStartNewChat}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#184973] hover:bg-[#123654] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>New Chat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistorySidebarCollapsed(true)}
                        title="Collapse history sidebar"
                        className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quick Search across past conversations */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Conversations List with Scroll Area */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 overscroll-contain">
                    {chatSessions.length === 0 ? (
                      <div className="text-center py-8 px-4 text-xs text-slate-400 space-y-2">
                        <MessageSquare className="h-6 w-6 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-600">No past conversations</p>
                        <p className="text-[11px]">Chat with EduBridge AI to save your academic dialogues here.</p>
                      </div>
                    ) : (
                      (() => {
                        const filtered = chatSessions.filter((s) =>
                          !historySearchQuery ||
                          s.title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                          s.subject.toLowerCase().includes(historySearchQuery.toLowerCase())
                        );

                        if (filtered.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 text-center py-6">
                              No conversations match &quot;{historySearchQuery}&quot;
                            </p>
                          );
                        }

                        return filtered.map((sess) => {
                          const isActive = sess.id === currentSessionId;
                          const dateStr = new Date(sess.updatedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          });

                          return (
                            <div
                              key={sess.id}
                              onClick={() => handleSelectSession(sess)}
                              className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-left text-xs ${
                                isActive
                                  ? "bg-blue-50 text-[#184973] font-bold border-l-4 border-[#184973] shadow-2xs"
                                  : "text-slate-700 hover:bg-white hover:shadow-2xs"
                              }`}
                            >
                              <div className="min-w-0 pr-2 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <MessageSquare className={`h-3 w-3 shrink-0 ${isActive ? "text-[#184973]" : "text-slate-400"}`} />
                                  <span className="truncate block font-semibold text-slate-900">
                                    {sess.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span className="truncate max-w-[110px] bg-slate-200/60 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                    {sess.subject}
                                  </span>
                                  <span>•</span>
                                  <span>{dateStr}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteSession(sess.id, e)}
                                title="Delete conversation"
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>

                  {/* Sidebar Footer */}
                  <div className="p-2.5 border-t border-slate-200 bg-white/70 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                    <span className="font-semibold">{chatSessions.length} saved chat{chatSessions.length === 1 ? "" : "s"}</span>
                    {chatSessions.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium">↕ Scroll to view all</span>
                    )}
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Synced</span>
                  </div>
                </aside>
              )}

              {/* Right Column: Active Chat Area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Chat Header */}
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {historySidebarCollapsed && (
                      <button
                        type="button"
                        onClick={() => setHistorySidebarCollapsed(false)}
                        title="Show past conversations"
                        className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4 text-[#184973]" />
                        <span>Chats</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowHistoryDrawer(true)}
                      className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <History className="h-3.5 w-3.5 text-[#184973]" />
                      <span>Chats</span>
                    </button>

                    <div className="relative">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#184973] to-blue-600 flex items-center justify-center text-white shadow-sm">
                        <Bot className="h-5 w-5" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">EduBridge AI Study Tutor</h2>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                          Live 1-on-1
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 hidden sm:block">
                        Grounded in your school syllabus • Ask questions, upload homework photos, or explore concepts.
                      </p>
                    </div>
                  </div>

                  {/* Subject Selector & Tools */}
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Subject:</span>
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                      >
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name} {sub.code ? `(${sub.code})` : ""}
                          </option>
                        ))}
                        <option value="Other">➕ Other (Custom Subject)...</option>
                      </select>
                    </div>

                    {selectedSubject === "Other" && (
                      <input
                        type="text"
                        placeholder="Type custom subject..."
                        value={customSubjectExplain}
                        onChange={(e) => setCustomSubjectExplain(e.target.value)}
                        className="rounded-xl border border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white w-36 sm:w-44"
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#184973] hover:bg-[#123654] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResetChatModal(true)}
                      title="Clear Conversation"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Thread */}
                <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[520px] min-h-[420px] bg-slate-50/30">
                  {chatMessages.map((msg) => {
                    const isUser = msg.role === "user";
                    const isEditing = editingMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                          isUser ? "bg-[#184973]" : "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xs"
                        }`}>
                          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>

                        <div className={`space-y-1.5 ${isUser ? "items-end text-right" : "items-start text-left"}`}>
                          {isEditing ? (
                            <div className="space-y-2 w-full min-w-[280px] sm:min-w-[420px] max-w-2xl bg-white border-2 border-blue-400 rounded-2xl p-3 shadow-md text-left">
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#184973]">
                                <span className="flex items-center gap-1.5">
                                  <PenLine className="h-3.5 w-3.5 text-[#184973]" />
                                  <span>Edit Message</span>
                                </span>
                                <span className="text-slate-400 font-normal text-[10px]">EduBridge AI will re-generate from here</span>
                              </div>
                              <textarea
                                value={editingMessageText}
                                onChange={(e) => setEditingMessageText(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[72px] resize-y font-sans"
                                placeholder="Edit your prompt..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingMessageText("");
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveAndSubmitEditedMessage(msg.id)}
                                  disabled={!editingMessageText.trim() || chatSending}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#184973] hover:bg-[#123654] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Save &amp; Submit</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                                isUser
                                  ? "bg-[#184973] text-white rounded-tr-xs"
                                  : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                              }`}>
                                {/* If message has attached file/image */}
                                {msg.file && (
                                  <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-200/40 bg-black/5 p-1.5 inline-block text-left">
                                    {msg.file.mimeType.startsWith("image/") ? (
                                      <img
                                        src={msg.file.data}
                                        alt="Attachment"
                                        className="max-h-56 max-w-full rounded-lg object-contain"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 text-xs font-semibold">
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <span>{msg.file.name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* If message has attached shared curriculum resource */}
                                {msg.resource && (
                                  <div className="mb-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-left text-slate-900">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                                      <BookOpen className="h-3 w-3" />
                                      <span>{msg.resource.category === "teacher" ? "Teacher Resource" : msg.resource.category === "recommended" ? "Recommended" : "School Resource"}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{msg.resource.title}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{msg.resource.recommendationNote || msg.resource.source || msg.resource.description}</p>
                                  </div>
                                )}

                                {/* Message Text with preserved whitespace and formatting */}
                                <div className="whitespace-pre-wrap font-sans text-left">
                                  {msg.text}
                                </div>
                              </div>

                              <div className={`flex items-center gap-2 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
                                <span className="text-[10px] text-slate-400">
                                  {msg.timestamp}
                                </span>
                                {isUser && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingMessageText(msg.text);
                                    }}
                                    title="Edit your question"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-[#184973] hover:underline cursor-pointer"
                                  >
                                    <PenLine className="h-2.5 w-2.5" />
                                    <span>Edit</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}

                          {/* Suggested Follow-Up Prompt Chips for AI messages */}
                          {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              {msg.suggestedFollowUps.map((chip, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleSendChatMessage(chip)}
                                  className="rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 px-2.5 py-1 text-[11px] font-semibold text-blue-900 transition cursor-pointer text-left flex items-center gap-1"
                                >
                                  <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span>{chip}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {chatSending && (
                    <div className="flex items-center gap-3 max-w-md mr-auto">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-slate-500">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#184973]" />
                        <span className="font-medium">EduBridge AI is analyzing curriculum and thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <div className="border-t border-slate-200 bg-white p-3 sm:p-4 space-y-2.5">
                  {/* File Attachment Preview */}
                  {chatAttachedFile && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {chatAttachedFile.mimeType.startsWith("image/") ? (
                          <img
                            src={chatAttachedFile.data}
                            alt="Thumbnail"
                            className="h-8 w-8 rounded-lg object-cover border border-blue-200 shrink-0"
                          />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 truncate">
                          {chatAttachedFile.name} ({(chatAttachedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChatAttachedFile(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Shared Curriculum Resource Preview */}
                  {chatSharedResource && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                          chatSharedResource.category === "teacher"
                            ? "bg-indigo-100 text-indigo-800"
                            : chatSharedResource.category === "recommended"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {chatSharedResource.category === "teacher" ? "Teacher Resource" : chatSharedResource.category === "recommended" ? "Recommended" : "School Resource"}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">
                          {chatSharedResource.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChatSharedResource(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Textarea & Controls */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="flex items-end gap-2"
                  >
                    <input
                      type="file"
                      ref={chatFileInputRef}
                      onChange={(e) => handleFileUpload(e, "chat")}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      title="Upload photo or document"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition cursor-pointer shrink-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResourcePickerChat(true)}
                      title="Attach Teacher, School, or Recommended Material"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition cursor-pointer shrink-0"
                    >
                      <BookOpen className="h-4 w-4" />
                    </button>

                    <textarea
                      rows={2}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      placeholder={`Ask EduBridge AI a question about ${selectedSubject === "Other" ? (customSubjectExplain || "your topic") : selectedSubject}, paste a homework problem, or upload a picture...`}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white resize-none"
                    />

                    <button
                      type="submit"
                      disabled={chatSending || (!chatInput.trim() && !chatAttachedFile && !chatSharedResource)}
                      className="p-2.5 rounded-xl bg-[#184973] hover:bg-[#123654] text-white transition disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Guided Practice */}
          {mode === "practice" && (
            <div className="space-y-6">
              {/* If Quiz is in Progress or Completed */}
              {quizQuestions.length > 0 ? (
                quizCompleted ? (
                  /* ─── QUIZ COMPLETION: SCORE, RANK BADGE, DEEP REVIEW & FOLLOW-UPS ─── */
                  <div className="space-y-6">
                    {/* Rank & Summary Card */}
                    {(() => {
                      const rank = getRankInfo(scorePercentage);
                      return (
                        <div className={`rounded-2xl p-6 sm:p-8 shadow-md ${rank.headerClass} transition-all`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${rank.badgeClass}`}>
                                  {rank.tier}
                                </span>
                                <span className="text-xs text-white/80 font-medium">
                                  {practiceSubject} • {practiceDifficulty} Mode
                                </span>
                              </div>
                              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                                <span>{rank.icon}</span>
                                <span>{rank.badge}</span>
                              </h2>
                              <p className="text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed">
                                {rank.message}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 text-center min-w-[160px] shrink-0">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Final Score</p>
                              <p className="text-3xl sm:text-4xl font-black text-white mt-0.5">
                                {scorePercentage}%
                              </p>
                              <p className="text-xs font-semibold text-white/80 mt-1">
                                {correctCount} of {totalQuestions} Correct
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Missed Questions Deep Breakdown */}
                    {missedQuestions.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2.5 text-[#184973]">
                            <Target className="h-5 w-5 text-rose-600" />
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                Deep Review: What You Missed & Why
                              </h3>
                              <p className="text-xs text-slate-500">
                                Step-by-step breakdown of distractor traps and the underlying academic rules.
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            {missedQuestions.length} to Review
                          </span>
                        </div>

                        <div className="space-y-5">
                          {missedQuestions.map((q, mIdx) => (
                            <div
                              key={mIdx}
                              className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 space-y-4 hover:border-rose-200 transition"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-black text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full shrink-0">
                                  Question {q.index + 1}
                                </span>
                                {q.resourceGrounding && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    {q.resourceGrounding}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-bold text-slate-900 leading-snug">
                                {q.question}
                              </p>

                              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
                                  <div className="flex items-center gap-1.5 font-bold mb-1">
                                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                    <span>Your Selection (Trap):</span>
                                  </div>
                                  <p className="font-medium">
                                    {q.studentAnswer !== undefined && q.options[q.studentAnswer]
                                      ? q.options[q.studentAnswer]
                                      : "No answer selected"}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                                  <div className="flex items-center gap-1.5 font-bold mb-1">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>Correct Principle:</span>
                                  </div>
                                  <p className="font-medium">
                                    {q.options[q.correctIndex]}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                  <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
                                  <span>Deep Explanation & Misconception Breakdown:</span>
                                </div>
                                <p className="leading-relaxed text-slate-700 pt-0.5">
                                  {q.explanation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-3">
                        <div className="inline-flex rounded-full bg-emerald-100 p-3 text-emerald-700">
                          <Trophy className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-emerald-950">
                            Zero Mistakes! Perfect Accuracy
                          </h3>
                          <p className="text-xs text-emerald-800 max-w-md mx-auto mt-1">
                            You navigated every scenario and distractor with complete precision. You are ready for higher-level exam challenges!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Follow-Up Options (Ask if they want more questions) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 text-[#184973]">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h3 className="text-base font-bold text-slate-900">
                          What would you like to do next?
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        Choose your next learning step to reinforce your memory and expand your skills.
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                        {missedQuestions.length > 0 && (
                          <button
                            type="button"
                            disabled={generatingPractice}
                            onClick={() => {
                              const missedSummary = missedQuestions
                                .map((m) => m.question)
                                .slice(0, 3)
                                .join("; ");
                              handleGeneratePractice(
                                `Targeted reinforcement on missed concepts: ${missedSummary}`,
                                practiceDifficulty,
                                5
                              );
                            }}
                            className="flex flex-col items-start justify-between rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-left transition hover:bg-rose-100 hover:border-rose-300 cursor-pointer disabled:opacity-50"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                                <Target className="h-4 w-4 text-rose-600" />
                                <span>Practice Missed Topics</span>
                              </div>
                              <p className="text-[11px] text-rose-700 leading-snug">
                                Generate 5 new questions specifically targeting the traps you missed.
                              </p>
                            </div>
                            <span className="mt-3 text-xs font-bold text-rose-700 flex items-center gap-1">
                              Practice 5 More <ArrowRight className="h-3 w-3" />
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={generatingPractice}
                          onClick={() => {
                            const nextDiff: "Easy" | "Medium" | "Hard" =
                              practiceDifficulty === "Easy"
                                ? "Medium"
                                : practiceDifficulty === "Medium"
                                ? "Hard"
                                : "Hard";
                            handleGeneratePractice(practiceWritingSpace, nextDiff, practiceCount);
                          }}
                          className="flex flex-col items-start justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-left transition hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer disabled:opacity-50"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                              <TrendingUp className="h-4 w-4 text-indigo-600" />
                              <span>Level Up Difficulty</span>
                            </div>
                            <p className="text-[11px] text-indigo-700 leading-snug">
                              Advance to {practiceDifficulty === "Easy" ? "Medium" : "Hard"} mode for deeper problem solving.
                            </p>
                          </div>
                          <span className="mt-3 text-xs font-bold text-indigo-700 flex items-center gap-1">
                            Level Up <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={generatingPractice}
                          onClick={() => handleGeneratePractice(practiceWritingSpace, practiceDifficulty, practiceCount)}
                          className="flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-blue-50 hover:border-blue-200 cursor-pointer disabled:opacity-50"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                              <span>New Questions</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">
                              Generate a fresh set of {practiceCount} questions in {practiceSubject}.
                            </p>
                          </div>
                          <span className="mt-3 text-xs font-bold text-blue-700 flex items-center gap-1">
                            Retake Quiz <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>

                        {missedQuestions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubject(practiceSubject);
                              setChatInput(`Can you explain this concept and why I might have missed it: "${missedQuestions[0]?.question}"?`);
                              setMode("explain");
                            }}
                            className="flex flex-col items-start justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left transition hover:bg-amber-100 hover:border-amber-300 cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                                <Lightbulb className="h-4 w-4 text-amber-600" />
                                <span>Tutor Explanation</span>
                              </div>
                              <p className="text-[11px] text-amber-800 leading-snug">
                                Have EduBridge AI explain the core principles of missed questions in depth.
                              </p>
                            </div>
                            <span className="mt-3 text-xs font-bold text-amber-800 flex items-center gap-1">
                              Ask Tutor <ArrowRight className="h-3 w-3" />
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setQuizQuestions([]);
                            setQuizCompleted(false);
                          }}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer py-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Configure New Session</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── ACTIVE MULTI-QUESTION QUIZ RUNNER ─── */
                  <div className="space-y-4">
                    {/* Top Navigation Bar with Back to Setup */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setShowBackConfirmModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-3.5 py-2 text-xs font-bold transition cursor-pointer self-start sm:self-auto group"
                      >
                        <ArrowLeft className="h-4 w-4 text-[#184973] group-hover:-translate-x-0.5 transition-transform" />
                        <span>Back to Setup & Topic Selection</span>
                      </button>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-800">
                          {practiceSubject === "Other" ? (customSubjectPractice || "Custom Subject") : practiceSubject}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-500">{practiceDifficulty} Mode</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Question {currentQuestionIndex + 1} of {quizQuestions.length}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-12">
                      {/* Left Mini Overview / Navigation */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#184973] px-2.5 py-0.5 rounded-full border border-blue-200">
                              {practiceSubject}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 mt-1">Quiz Progress</h3>
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {currentQuestionIndex + 1} / {quizQuestions.length}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                            <span>Completion</span>
                            <span>{Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#184973] transition-all duration-300 rounded-full"
                              style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Question Navigation Chips */}
                        <div className="space-y-2 pt-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Question Navigation
                          </p>
                          <div className="grid grid-cols-5 gap-2">
                            {quizQuestions.map((_, idx) => {
                              const isCurrent = idx === currentQuestionIndex;
                              const isChecked = checkedQuestions[idx];
                              const isCorrect = isChecked && userAnswers[idx] === quizQuestions[idx].correctIndex;
                              const isWrong = isChecked && userAnswers[idx] !== quizQuestions[idx].correctIndex;

                              let chipStyle = "bg-slate-50 text-slate-600 border-slate-200";
                              if (isCurrent) {
                                chipStyle = "bg-[#184973] text-white border-[#184973] ring-2 ring-blue-300";
                              } else if (isCorrect) {
                                chipStyle = "bg-emerald-50 text-emerald-700 border-emerald-300";
                              } else if (isWrong) {
                                chipStyle = "bg-rose-50 text-rose-700 border-rose-300";
                              } else if (userAnswers[idx] !== undefined) {
                                chipStyle = "bg-blue-50 text-blue-800 border-blue-200";
                              }

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setCurrentQuestionIndex(idx);
                                    setShowHint(false);
                                  }}
                                  className={`rounded-xl py-2 text-xs font-bold border transition cursor-pointer text-center ${chipStyle}`}
                                >
                                  {idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Target className="h-3.5 w-3.5 text-blue-600" />
                            <span>Session Settings</span>
                          </div>
                          <p>Difficulty: <strong className="text-slate-800">{practiceDifficulty}</strong></p>
                          <p>Subject: <strong className="text-slate-800">{practiceSubject === "Other" ? (customSubjectPractice || "Custom") : practiceSubject}</strong></p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <button
                            type="button"
                            onClick={handleRestartQuiz}
                            className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 py-1.5 cursor-pointer transition"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Restart this Quiz</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowBackConfirmModal(true)}
                            className="w-full text-xs font-bold text-[#184973] hover:text-[#123654] bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-xl py-2 flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs group"
                          >
                            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            <span>Back to Selection & Setup</span>
                          </button>
                        </div>
                      </div>

                      {/* Right Question Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8 space-y-5">
                        {(() => {
                          const q = quizQuestions[currentQuestionIndex];
                          if (!q) return null;
                          const isChecked = !!checkedQuestions[currentQuestionIndex];
                          const selectedOpt = userAnswers[currentQuestionIndex];

                          return (
                            <div className="space-y-5">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#184973] px-2.5 py-0.5 rounded-full border border-blue-200">
                                    Question {currentQuestionIndex + 1} of {quizQuestions.length}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    {practiceDifficulty}
                                  </span>
                                </div>

                                {q.hint && (
                                  <button
                                    type="button"
                                    onClick={() => setShowHint(!showHint)}
                                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>{showHint ? "Hide Hint" : "Show Hint"}</span>
                                  </button>
                                )}
                              </div>

                              {showHint && q.hint && (
                                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 animate-in fade-in space-y-1">
                                  <span className="font-bold flex items-center gap-1 text-amber-900">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Guiding Clue:</span>
                                  </span>
                                  <p className="leading-relaxed text-amber-800">{q.hint}</p>
                                </div>
                              )}

                              <div>
                                <h3 className="text-base font-bold text-slate-900 leading-snug">
                                  {q.question}
                                </h3>
                                {q.resourceGrounding && (
                                  <p className="text-[11px] font-semibold text-blue-700 mt-1 flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    <span>{q.resourceGrounding}</span>
                                  </p>
                                )}
                              </div>

                              {/* 4 Options */}
                              <div className="space-y-2.5">
                                {q.options.map((opt, optIdx) => {
                                  const isSelected = selectedOpt === optIdx;
                                  const isCorrect = optIdx === q.correctIndex;
                                  const optionLetter = String.fromCharCode(65 + optIdx);

                                  let style = "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800";

                                  if (isChecked) {
                                    if (isCorrect) {
                                      style = "border-emerald-300 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40";
                                    } else if (isSelected && !isCorrect) {
                                      style = "border-rose-300 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-400/40";
                                    } else {
                                      style = "border-slate-200 bg-slate-50/60 text-slate-400 opacity-60";
                                    }
                                  } else if (isSelected) {
                                    style = "border-blue-400 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-300";
                                  }

                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() => handleSelectOption(optIdx)}
                                      disabled={isChecked}
                                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs transition cursor-pointer ${style}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-lg text-[11px] font-black shrink-0 ${
                                          isChecked && isCorrect
                                            ? "bg-emerald-600 text-white"
                                            : isChecked && isSelected && !isCorrect
                                            ? "bg-rose-600 text-white"
                                            : isSelected
                                            ? "bg-[#184973] text-white"
                                            : "bg-white text-slate-600 border border-slate-200"
                                        }`}>
                                          {optionLetter}
                                        </span>
                                        <span className="leading-relaxed">{opt}</span>
                                      </div>

                                      {isChecked && isCorrect && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
                                      )}
                                      {isChecked && isSelected && !isCorrect && (
                                        <XCircle className="h-4 w-4 text-rose-600 shrink-0 ml-2" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Answer Feedback & Actions */}
                              <div className="pt-3 border-t border-slate-100">
                                {!isChecked ? (
                                  <button
                                    type="button"
                                    onClick={handleCheckCurrentAnswer}
                                    disabled={selectedOpt === undefined}
                                    className="rounded-xl bg-[#184973] hover:bg-[#123654] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                                  >
                                    Check Answer
                                  </button>
                                ) : (
                                  <div className="space-y-4">
                                    <div className={`p-4 rounded-xl text-xs space-y-1.5 ${
                                      selectedOpt === q.correctIndex
                                        ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                                        : "bg-amber-50 text-amber-950 border border-amber-200"
                                    }`}>
                                      <p className="font-bold flex items-center gap-1.5">
                                        {selectedOpt === q.correctIndex ? (
                                          <>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <span>🎉 Correct Answer!</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                            <span>In-Depth Explanation & Distractor Trap:</span>
                                          </>
                                        )}
                                      </p>
                                      <p className="leading-relaxed text-slate-700 pt-1">
                                        {q.explanation}
                                      </p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-slate-500 font-medium">
                                        {currentQuestionIndex + 1 < quizQuestions.length
                                          ? `${quizQuestions.length - (currentQuestionIndex + 1)} question(s) remaining`
                                          : "Final question completed"}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={handleNextQuestion}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#184973] hover:bg-[#123654] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                                      >
                                        {currentQuestionIndex < quizQuestions.length - 1 ? (
                                          <>
                                            <span>Next Question</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                          </>
                                        ) : (
                                          <>
                                            <Trophy className="h-3.5 w-3.5 text-amber-300" />
                                            <span>Finish & View Rank</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* ─── QUIZ CONFIGURATION / SETUP SCREEN ─── */
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-2 text-[#184973]">
                      <BrainCircuit className="h-5 w-5" />
                      <h2 className="text-base font-bold text-slate-900">Custom Practice Session</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Configure your subject, specific inquiry focus, number of questions, and difficulty mode.
                    </p>

                    <div className="space-y-4 pt-1">
                      {/* Subject Selection (Strictly Isolated or Custom) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Select Enrolled Subject (or Custom)
                        </label>
                        <select
                          value={practiceSubject}
                          onChange={(e) => setPracticeSubject(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                        >
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.name}>
                              {sub.name} {sub.code ? `(${sub.code})` : ""} {sub.teacherName ? `• ${sub.teacherName}` : ""}
                            </option>
                          ))}
                          <option value="Other">➕ Other (Custom Subject)...</option>
                        </select>

                        {practiceSubject === "Other" && (
                          <div className="mt-2 space-y-2">
                            <input
                              type="text"
                              placeholder="Type custom subject (e.g. Computer Science, Economics, Astronomy...)"
                              value={customSubjectPractice}
                              onChange={(e) => setCustomSubjectPractice(e.target.value)}
                              className="w-full rounded-xl border border-blue-300 bg-blue-50/30 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                            />
                            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 text-[11px] text-[#184973] flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <p className="leading-relaxed">
                                <strong className="font-bold">Interdisciplinary Learning:</strong> When you explore a custom topic, EduBridge AI connects related concepts with your school subjects ({subjects.map((s) => s.name).slice(0, 4).join(", ") || "School curriculum"}) so you can see how real-world subjects connect!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reference Material & File Selection (Upload, Teacher, School, Recommended) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-[#184973]" />
                            <span>Reference Material & Attachment</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                        </div>

                        {/* Active Attached Preview (File or Shared Resource) */}
                        {practiceAttachedFile ? (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/70 shadow-2xs">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {practiceAttachedFile.mimeType.startsWith("image/") ? (
                                <img
                                  src={practiceAttachedFile.data}
                                  alt="Preview"
                                  className="h-10 w-10 object-cover rounded-lg border border-blue-200 shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                                  <FileText className="h-5 w-5" />
                                </div>
                              )}
                              <div className="overflow-hidden text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded">
                                    Device Upload
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 truncate">
                                    {practiceAttachedFile.name}
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {(practiceAttachedFile.size / 1024).toFixed(1)} KB • Attached for AI multimodal question generation
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPracticeAttachedFile(null)}
                              title="Remove attached file"
                              className="h-7 w-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : practiceSharedResource ? (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/70 shadow-2xs">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                                practiceSharedResource.category === "teacher"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : practiceSharedResource.category === "recommended"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {practiceSharedResource.category === "teacher" ? (
                                  <User className="h-5 w-5" />
                                ) : practiceSharedResource.category === "recommended" ? (
                                  <Sparkles className="h-5 w-5" />
                                ) : (
                                  <BookOpen className="h-5 w-5" />
                                )}
                              </div>
                              <div className="overflow-hidden text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    practiceSharedResource.category === "teacher"
                                      ? "bg-indigo-100 text-indigo-800"
                                      : practiceSharedResource.category === "recommended"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-blue-100 text-blue-800"
                                  }`}>
                                    {practiceSharedResource.category === "teacher" ? "Teacher Resource" : practiceSharedResource.category === "recommended" ? "Recommended" : "School Resource"}
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 truncate">
                                    {practiceSharedResource.title}
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {practiceSharedResource.recommendationNote || practiceSharedResource.description || practiceSharedResource.source || "Curriculum material"}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPracticeSharedResource(null)}
                              title="Remove attached resource"
                              className="h-7 w-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Segmented Category Buttons */}
                            {(() => {
                              const activeSubFilter = practiceSubject === "Other" ? "" : practiceSubject.toLowerCase();
                              const qFilter = resourceFilterQuery.trim().toLowerCase();

                              const filterByCategory = (cat: "teacher" | "school" | "recommended") => {
                                return sharedResources.filter((r) => {
                                  if (r.category !== cat) return false;
                                  if (!qFilter) return true;
                                  return (
                                    r.title.toLowerCase().includes(qFilter) ||
                                    (r.description && r.description.toLowerCase().includes(qFilter)) ||
                                    (r.subjectName && r.subjectName.toLowerCase().includes(qFilter)) ||
                                    (r.source && r.source.toLowerCase().includes(qFilter)) ||
                                    (r.recommendationNote && r.recommendationNote.toLowerCase().includes(qFilter))
                                  );
                                });
                              };

                              const teacherList = filterByCategory("teacher");
                              const schoolList = filterByCategory("school");
                              const recList = filterByCategory("recommended");

                              return (
                                <>
                                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-xl text-center">
                                    <button
                                      type="button"
                                      onClick={() => setPracticeAttachmentTab("upload")}
                                      className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                                        practiceAttachmentTab === "upload"
                                          ? "bg-white text-slate-900 shadow-2xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      <Upload className="h-3 w-3" />
                                      <span>Upload</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPracticeAttachmentTab("teacher")}
                                      className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                                        practiceAttachmentTab === "teacher"
                                          ? "bg-white text-[#184973] shadow-2xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      <User className="h-3 w-3" />
                                      <span>Teacher</span>
                                      {teacherList.length > 0 && (
                                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded-full font-black">
                                          {teacherList.length}
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPracticeAttachmentTab("school")}
                                      className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                                        practiceAttachmentTab === "school"
                                          ? "bg-white text-[#184973] shadow-2xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      <BookOpen className="h-3 w-3" />
                                      <span>School</span>
                                      {schoolList.length > 0 && (
                                        <span className="text-[9px] bg-slate-200 text-slate-800 px-1 rounded-full font-black">
                                          {schoolList.length}
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPracticeAttachmentTab("recommended")}
                                      className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                                        practiceAttachmentTab === "recommended"
                                          ? "bg-white text-amber-900 shadow-2xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      <Sparkles className="h-3 w-3 text-amber-500" />
                                      <span>Recs</span>
                                      {recList.length > 0 && (
                                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded-full font-black">
                                          {recList.length}
                                        </span>
                                      )}
                                    </button>
                                  </div>

                                  {practiceAttachmentTab !== "upload" && (
                                    <div className="relative mt-2">
                                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder={`Filter ${practiceAttachmentTab} materials...`}
                                        value={resourceFilterQuery}
                                        onChange={(e) => setResourceFilterQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 focus:bg-white"
                                      />
                                    </div>
                                  )}

                                  {practiceAttachmentTab === "upload" && (
                                    <>
                                      <input
                                        type="file"
                                        ref={practiceFileInputRef}
                                        onChange={(e) => handleFileUpload(e, "practice")}
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => practiceFileInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 text-xs font-semibold text-slate-600 hover:text-blue-700 transition cursor-pointer"
                                      >
                                        <ImageIcon className="h-4 w-4 text-slate-400" />
                                        <span>Upload diagram, homework photo, or past paper</span>
                                      </button>
                                    </>
                                  )}

                                  {practiceAttachmentTab === "teacher" && (
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/50">
                                      {teacherList.length > 0 ? (
                                        teacherList.map((res) => {
                                          const isMatch = activeSubFilter && (res.subjectName?.toLowerCase().includes(activeSubFilter) || activeSubFilter.includes(res.subjectName?.toLowerCase() || ""));

                                          return (
                                            <div
                                              key={res.id}
                                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-[#4085b3] hover:shadow-2xs hover:bg-blue-50/20 transition text-left"
                                            >
                                              <div className="overflow-hidden pr-2">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                                                    {res.subjectName || "Subject Material"}
                                                  </span>
                                                  {isMatch && (
                                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                      Subject Match
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 truncate">{res.title}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{res.recommendationNote || res.source || res.description}</p>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setPracticeSharedResource(res)}
                                                className="px-3 py-1.5 text-[11px] font-bold text-[#184973] hover:text-white bg-blue-50 hover:bg-[#184973] border border-blue-200 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                                              >
                                                Attach
                                              </button>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <p className="text-[11px] text-slate-400 text-center py-4">
                                          {resourceFilterQuery ? "No teacher materials match search." : "No teacher materials available."}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {practiceAttachmentTab === "school" && (
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/50">
                                      {schoolList.length > 0 ? (
                                        schoolList.map((res) => {
                                          const isMatch = activeSubFilter && (res.subjectName?.toLowerCase().includes(activeSubFilter) || activeSubFilter.includes(res.subjectName?.toLowerCase() || ""));

                                          return (
                                            <div
                                              key={res.id}
                                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-[#4085b3] hover:shadow-2xs hover:bg-blue-50/20 transition text-left"
                                            >
                                              <div className="overflow-hidden pr-2">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                                                    {res.subjectName || "School Repository"}
                                                  </span>
                                                  {isMatch && (
                                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                      Subject Match
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 truncate">{res.title}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{res.description || res.source || "Official School Material"}</p>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setPracticeSharedResource(res)}
                                                className="px-3 py-1.5 text-[11px] font-bold text-[#184973] hover:text-white bg-blue-50 hover:bg-[#184973] border border-blue-200 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                                              >
                                                Attach
                                              </button>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <p className="text-[11px] text-slate-400 text-center py-4">
                                          {resourceFilterQuery ? "No school digital resources match search." : "No school digital resources available."}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {practiceAttachmentTab === "recommended" && (
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/50">
                                      {recList.length > 0 ? (
                                        recList.map((res) => {
                                          const isMatch = activeSubFilter && (res.subjectName?.toLowerCase().includes(activeSubFilter) || activeSubFilter.includes(res.subjectName?.toLowerCase() || ""));

                                          return (
                                            <div
                                              key={res.id}
                                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-amber-200/90 hover:border-amber-400 hover:shadow-2xs hover:bg-amber-50/30 transition text-left"
                                            >
                                              <div className="overflow-hidden pr-2">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                                    {res.subjectName || "Recommended"}
                                                  </span>
                                                  {isMatch && (
                                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                      Subject Match
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 truncate">{res.title}</p>
                                                <p className="text-[10px] text-amber-800 truncate">{res.recommendationNote || res.description || "Teacher Recommended Material"}</p>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setPracticeSharedResource(res)}
                                                className="px-3 py-1.5 text-[11px] font-bold text-amber-900 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                                              >
                                                Attach
                                              </button>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <p className="text-[11px] text-slate-400 text-center py-4">
                                          {resourceFilterQuery ? "No recommended materials match search." : "No recommended materials available."}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Writing Space */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <PenLine className="h-3.5 w-3.5 text-[#184973]" />
                            <span>Specific Inquiry & Writing Space</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <textarea
                          rows={3}
                          placeholder={`Write whatever you specifically want to ask or test in ${practiceSubject === "Other" ? (customSubjectPractice || "your subject") : (practiceSubject || "this subject")} (e.g., "Questions on balancing redox reactions with half-cells", "Newton's third law elevator problems", "Common exam traps with fractions")...`}
                          value={practiceWritingSpace}
                          onChange={(e) => setPracticeWritingSpace(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white resize-none"
                        />
                        {/* Quick Topic Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            "Core Syllabus Concepts",
                            "Tricky Distractors & Traps",
                            "Formulas & Applied Calculations",
                            "Multi-Step Exam Problems",
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPracticeWritingSpace(chip)}
                              className="rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition cursor-pointer"
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Question Count Selector (Fully Editable Qty) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Number of Questions (1 - 10)
                        </label>
                        <div className="flex items-center gap-2">
                          {[3, 5, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setPracticeCount(num)}
                              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition cursor-pointer ${
                                Number(practiceCount) === num
                                  ? "bg-[#184973] text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {num} Questions
                            </button>
                          ))}
                          <div className="flex items-center gap-1 pl-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={practiceCount}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  setPracticeCount("");
                                  return;
                                }
                                if (/^\d+$/.test(val)) {
                                  const n = parseInt(val, 10);
                                  if (n <= 10) setPracticeCount(n);
                                }
                              }}
                              onBlur={() => {
                                const n = Number(practiceCount);
                                if (!n || n < 1) setPracticeCount(1);
                                else if (n > 10) setPracticeCount(10);
                              }}
                              className="w-14 rounded-xl border border-slate-200 bg-white py-1.5 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                            />
                            <span className="text-[11px] font-semibold text-slate-400">Qty</span>
                          </div>
                        </div>
                      </div>

                      {/* Difficulty Level */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Difficulty Mode
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "Easy", label: "Easy", desc: "Foundations" },
                            { key: "Medium", label: "Medium", desc: "Exam Standard" },
                            { key: "Hard", label: "Hard", desc: "Olympiad Level" },
                          ].map((lvl) => (
                            <button
                              key={lvl.key}
                              type="button"
                              onClick={() => setPracticeDifficulty(lvl.key as any)}
                              className={`rounded-xl p-2 text-center transition cursor-pointer ${
                                practiceDifficulty === lvl.key
                                  ? "bg-[#184973] text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <span className="block text-xs font-black">{lvl.label}</span>
                              <span className="block text-[10px] opacity-80 mt-0.5">{lvl.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Start Quiz Button */}
                      <button
                        type="button"
                        disabled={generatingPractice}
                        onClick={() => handleGeneratePractice()}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#184973] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#123654] transition cursor-pointer disabled:opacity-50"
                      >
                        {generatingPractice ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                            <span>Analyzing Resources & Generating Quiz...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 text-amber-300" />
                            <span>
                              {practiceAttachedFile
                                ? `Analyze Image & Start Quiz (${practiceCount || 5} Qs)`
                                : `Start Practice Session (${practiceCount || 5} Questions)`}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Welcome / Info Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Curriculum-Grounded AI Engine
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 leading-snug">
                        Master {practiceSubject || "Your Subject"} with Adaptive Real-World Drills
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Every question is dynamically analyzed and generated from your school&apos;s published digital resources, classroom assignments, and teacher guidance notes.
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2 pt-2">
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                            <BookOpen className="h-4 w-4 text-blue-700" />
                            <span>Shared School Resources</span>
                          </div>
                          <p className="text-[11px] text-blue-800 leading-snug">
                            Accesses digital library materials and teacher recommendations for strict syllabus alignment.
                          </p>
                        </div>

                        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                            <PenLine className="h-4 w-4 text-purple-700" />
                            <span>Custom Writing Space</span>
                          </div>
                          <p className="text-[11px] text-purple-800 leading-snug">
                            Ask about specific subtopics, formulas, or past exam problems tailored directly to your focus.
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                            <Lightbulb className="h-4 w-4 text-amber-700" />
                            <span>Trap & Misconception Insights</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-snug">
                            Smart distractors reflect common student errors, with deep explanations on why they fail.
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                            <Trophy className="h-4 w-4 text-emerald-700" />
                            <span>Academic Rank Badges</span>
                          </div>
                          <p className="text-[11px] text-emerald-800 leading-snug">
                            Earn Diamond, Gold, Silver, and Bronze badges based on your accuracy and mastery.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-[#184973]">
                        <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-medium">
                          <strong className="font-bold text-slate-800">Curriculum Synthesis Active:</strong> When concepts naturally connect across subjects you study ({subjects.map((s) => s.name).slice(0, 4).join(", ") || "Mathematics, Science"}), EduBridge AI weaves them together. Standalone topics remain focused.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: AI Study & Wellbeing Coach */}
          {mode === "plan" && (
            <div className="space-y-6">
              {/* Interactive Coach Workspace Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                {/* Header with Title & School-Free Weekend Indicator */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5 text-[#184973]">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#184973] shadow-xs shrink-0">
                        <CalendarCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">EduBridge AI Study & Life Coach</h2>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                            7-Day Roadmap
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Personalized for your {gradeName} subjects. Includes school-free weekends (3-4h max), sports, hobbies, and dedicated homework blocks.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Weekend & Target Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-600">Weekday Target:</span>
                      <select
                        value={studyHoursPerDay}
                        onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value={1}>1 hr / day</option>
                        <option value={2}>2 hrs / day</option>
                        <option value={3}>3 hrs / day</option>
                        <option value={4}>4 hrs / day</option>
                      </select>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-1.5 text-xs font-bold">
                      <Sun className="h-3.5 w-3.5 text-amber-600" />
                      <span>Weekend: 3.5h Max (School-Free)</span>
                    </div>
                  </div>
                </div>

                {/* Schedule Style Selector (Zero Boredom, Sports & Hobbies, Exam Sprint) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Choose Schedule Vibe & Need:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        id: "fun" as const,
                        icon: <Gamepad2 className="h-4 w-4 text-purple-600" />,
                        title: "Fun & Gamified",
                        desc: "Zero boredom, quests & snack breaks",
                        border: planStyle === "fun" ? "border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-500/20" : "border-slate-200 hover:border-slate-300",
                      },
                      {
                        id: "balanced" as const,
                        icon: <Activity className="h-4 w-4 text-emerald-600" />,
                        title: "Balanced + Sports",
                        desc: "Study + weekend football/hobbies",
                        border: planStyle === "balanced" ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-slate-300",
                      },
                      {
                        id: "homework" as const,
                        icon: <FileText className="h-4 w-4 text-blue-600" />,
                        title: "Homework First",
                        desc: "Finish daily class homework early",
                        border: planStyle === "homework" ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-300",
                      },
                      {
                        id: "exam" as const,
                        icon: <Flame className="h-4 w-4 text-amber-600" />,
                        title: "Exam & Test Sprint",
                        desc: "Deep recall & formula practice",
                        border: planStyle === "exam" ? "border-amber-600 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20" : "border-slate-200 hover:border-slate-300",
                      },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setPlanStyle(pill.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${pill.border}`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          {pill.icon}
                          <span>{pill.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 leading-snug">
                          {pill.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat & Custom Writing Space for Study Plan */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <PenLine className="h-3.5 w-3.5 text-[#184973]" />
                      <span>Write What Kind of Plan You Want (Tell Your Coach):</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Mention upcoming exams, homework, sports practice, or unmotivated subjects
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={2}
                      value={planPrompt}
                      onChange={(e) => setPlanPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleGeneratePlan();
                        }
                      }}
                      placeholder="e.g., I have a math test on Friday, football training on Tuesday afternoon, want to do coding on Saturday, and make Wednesday light. Make it fun so I don't get bored!"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white resize-none shadow-2xs leading-relaxed"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      {/* Example Prompt Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400">Quick ideas:</span>
                        {[
                          "Heavy homework week",
                          "Math test on Friday",
                          "Football Tuesday & Thursday",
                          "Keep Saturday afternoon free",
                          "Make tasks fun with challenges"
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              const next = planPrompt ? `${planPrompt}, ${chip.toLowerCase()}` : chip;
                              setPlanPrompt(next);
                            }}
                            className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={generatingPlan}
                        onClick={() => handleGeneratePlan()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#184973] hover:bg-[#123654] px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50 ml-auto"
                      >
                        {generatingPlan ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                            <span>AI Coach is Designing Your Plan...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-amber-300" />
                            <span>{generatedPlan ? "Update My Plan" : "Build My Custom Plan"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Coach Feedback & Quick Adjustment Dialogue */}
                {(coachMessage || planChatHistory.length > 0) && (
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 p-4 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#184973] flex items-center justify-center text-white shrink-0 shadow-2xs mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">EduBridge AI Coach Note:</span>
                          <span className="text-[10px] text-blue-700 bg-blue-100/80 px-2 py-0.2 rounded font-semibold">Active Strategy</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {coachMessage || planChatHistory[planChatHistory.length - 1]?.text}
                        </p>
                      </div>
                    </div>

                    {/* Quick AI Adjustment Chips */}
                    {suggestedAdjustments.length > 0 && (
                      <div className="border-t border-blue-100/80 pt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#184973]">Quickly refine schedule:</span>
                        {suggestedAdjustments.map((chip, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            disabled={generatingPlan}
                            onClick={() => handleGeneratePlan(chip)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white hover:bg-blue-100/60 text-[#184973] px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span>{chip}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7-Day Plan Display Area */}
              {generatedPlan && generatedPlan.length > 0 ? (
                <div className="space-y-4">
                  {/* View Controls & Copy Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPlanFilterTab("all")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          planFilterTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All 7 Days (Mon - Sun)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilterTab("weekdays")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          planFilterTab === "weekdays" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        School Days (Mon - Fri)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilterTab("weekend")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          planFilterTab === "weekend" ? "bg-white text-amber-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        🏖️ Weekend (Sat & Sun)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!generatedPlan || generatedPlan.length === 0) return;
                        const summary = generatedPlan.map((d) => {
                          const subs = d.subjects?.map((s) => `${s.name} (${s.duration}): ${s.focus}`).join(", ") || d.subject;
                          const hw = d.homeworkSlot ? `\n  - Homework: ${d.homeworkSlot.description} (${d.homeworkSlot.duration})` : "";
                          const extra = d.extracurricular ? `\n  - Extracurricular: ${d.extracurricular.name} (${d.extracurricular.duration})` : "";
                          const tasks = d.tasks.map((t) => `\n  * ${t}`).join("");
                          return `📅 ${d.day} [${d.totalDuration || d.duration}]:\n  - Subjects: ${subs}${hw}${extra}${tasks}`;
                        }).join("\n\n");
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(`EduBridge AI 7-Day Study & Life Roadmap:\n\n${summary}`);
                          showToast("Weekly schedule copied to clipboard!", "success");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy Schedule</span>
                    </button>
                  </div>

                  {/* 7-Day Grid Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {generatedPlan
                      .filter((item) => {
                        if (planFilterTab === "weekdays") return !item.isWeekend && !item.day.toLowerCase().includes("saturday") && !item.day.toLowerCase().includes("sunday");
                        if (planFilterTab === "weekend") return item.isWeekend || item.day.toLowerCase().includes("saturday") || item.day.toLowerCase().includes("sunday");
                        return true;
                      })
                      .map((item, idx) => {
                        const isWeekendDay = item.isWeekend || item.day.toLowerCase().includes("saturday") || item.day.toLowerCase().includes("sunday");

                        return (
                          <div
                            key={idx}
                            className={`group rounded-2xl border bg-white p-5 shadow-xs transition-all duration-300 flex flex-col justify-between space-y-4 ${
                              isWeekendDay
                                ? "border-amber-200 hover:border-amber-400 hover:shadow-md bg-gradient-to-b from-amber-50/20 to-white"
                                : "border-slate-200 hover:border-[#4085b3] hover:shadow-md"
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Card Header */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-sm text-slate-900 group-hover:text-[#4085b3] transition-colors">
                                      {item.day}
                                    </span>
                                    {isWeekendDay ? (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                        School-Free
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                        School Day
                                      </span>
                                    )}
                                  </div>
                                  {item.theme && (
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                      {item.theme}
                                    </p>
                                  )}
                                </div>

                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                  isWeekendDay
                                    ? "bg-amber-100 text-amber-900 border-amber-200"
                                    : "bg-blue-50 text-[#184973] border-blue-200"
                                }`}>
                                  {item.totalDuration || item.duration}
                                </span>
                              </div>

                              {/* Multi-Subject Schedule Blocks */}
                              {item.subjects && item.subjects.length > 0 ? (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Subjects Scheduled ({item.subjects.length}):
                                  </span>
                                  <div className="space-y-1.5">
                                    {item.subjects.map((s, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-xs flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                          <span className="font-bold text-slate-800 truncate">{s.name}</span>
                                          <span className="text-[10px] text-slate-500 hidden sm:inline truncate">
                                            • {s.focus}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                          {s.duration}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                  <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                                  <span>{item.subject}</span>
                                </div>
                              )}

                              {/* Dedicated Daily School Homework Slot (Weekdays) */}
                              {item.homeworkSlot && (
                                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 space-y-1">
                                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-amber-700" />
                                      <span>School Homework Slot</span>
                                    </div>
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                      {item.homeworkSlot.duration}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-amber-800 leading-snug">
                                    {item.homeworkSlot.description}
                                  </p>
                                </div>
                              )}

                              {/* Actionable Pomodoro Learning Tasks */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Action Steps:
                                </span>
                                {item.tasks.map((task, tIdx) => (
                                  <div key={tIdx} className="flex items-start gap-2 text-[11px] text-slate-600">
                                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{task}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Extracurricular & Wellbeing Activity (Sports, Hobbies, Arts) */}
                              {item.extracurricular && (
                                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-2.5 space-y-1">
                                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                    <div className="flex items-center gap-1.5">
                                      <Activity className="h-3.5 w-3.5 text-emerald-700" />
                                      <span>Extracurricular & Wellbeing</span>
                                    </div>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                      {item.extracurricular.duration}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-emerald-800 font-semibold">
                                    {item.extracurricular.name}
                                  </p>
                                  <p className="text-[10px] text-emerald-700/80">
                                    Benefit: {item.extracurricular.benefit}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Gamified Fun Tip for Unmotivated / Tired Students */}
                            {item.funTip && (
                              <div className="rounded-xl border border-purple-200/80 bg-purple-50/40 p-2.5 text-[11px] text-purple-900 flex items-start gap-2 mt-auto">
                                <Gamepad2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                                <span className="leading-snug">
                                  <strong className="font-bold">Fun Quest Tip:</strong> {item.funTip}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 space-y-4 shadow-xs">
                  <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#184973] mx-auto shadow-xs">
                    <CalendarCheck className="h-8 w-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-slate-800">
                      Build Your Custom Weekly Roadmap
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Secondary schools are free on Saturday and Sunday! Your AI coach will keep weekends light (3-4 hours max) with room for football, hobbies, and family time, while organizing 2 subjects and dedicated homework blocks on weekdays.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={generatingPlan}
                    onClick={() => handleGeneratePlan()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#184973] hover:bg-[#123654] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Generate My 7-Day Plan</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── ATTRACTIVE IN-APP MODAL: RETURN TO QUIZ SETUP ─── */}
      {showBackConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={() => setShowBackConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowBackConfirmModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#184973] shrink-0 shadow-xs">
                <ArrowLeft className="h-6 w-6" />
              </div>
              <div className="space-y-1 pr-4">
                <h3 className="text-base font-bold text-slate-900">
                  Return to Practice Setup?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your current quiz session and progress will be reset. You will return to the setup screen where you can pick another subject, adjust your question count or difficulty, or upload a new worksheet.
                </p>
              </div>
            </div>

            {/* Current Session Summary Chip */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-500">Current Subject:</span>
                <span className="font-bold text-slate-800">
                  {practiceSubject === "Other" ? (customSubjectPractice || "Custom Subject") : practiceSubject}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-500">Mode & Progress:</span>
                <span className="font-bold text-slate-800">
                  {practiceDifficulty} • Question {currentQuestionIndex + 1} of {quizQuestions.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBackConfirmModal(false)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBackConfirmModal(false);
                  setQuizQuestions([]);
                  setQuizCompleted(false);
                }}
                className="rounded-xl bg-[#184973] hover:bg-[#123654] text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Yes, Return to Setup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ATTRACTIVE IN-APP MODAL: RESET CHAT CONVERSATION ─── */}
      {showResetChatModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={() => setShowResetChatModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowResetChatModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1 pr-4">
                <h3 className="text-base font-bold text-slate-900">
                  Reset Conversation?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will clear your current message thread and start a fresh tutoring session with EduBridge AI Tutor.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetChatModal(false)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetChatModal(false);
                  setChatMessages([
                    {
                      id: "m_welcome",
                      role: "assistant",
                      text: "Conversation reset. What concept or problem would you like to explore next?",
                      timestamp: "Just now",
                      suggestedFollowUps: [
                        "Explain a difficult concept using a real-world analogy",
                        "Help me solve a step-by-step problem",
                        "What are common exam traps in this subject?",
                      ],
                    },
                  ]);
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear & Start Over</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SLIDE-OUT DRAWER: PAST CONVERSATIONS HISTORY ─── */}
      {showHistoryDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={() => setShowHistoryDrawer(false)}
        >
          <div
            className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col p-5 space-y-4 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-[#184973]">
                <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#184973]">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Past Conversations
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {chatSessions.length} saved session{chatSessions.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions: Start Fresh & Filter */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleStartNewChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#184973] hover:bg-[#123654] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Start New Conversation</span>
              </button>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search past conversations..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Sessions List with Smooth Scrolling */}
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1.5 overscroll-contain">
              {(() => {
                const filteredSessions = chatSessions.filter((s) => {
                  if (!historySearchQuery.trim()) return true;
                  const q = historySearchQuery.toLowerCase();
                  return (
                    s.title.toLowerCase().includes(q) ||
                    s.subject.toLowerCase().includes(q) ||
                    s.messages.some((m) => m.text.toLowerCase().includes(q))
                  );
                });

                if (filteredSessions.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <History className="h-8 w-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">
                        {historySearchQuery ? "No matching conversations" : "No past conversations yet"}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Ask EduBridge AI a question and your tutoring dialogues will be saved here so you can revisit them anytime!
                      </p>
                    </div>
                  );
                }

                return filteredSessions.map((session) => {
                  const isActive = session.id === currentSessionId;
                  const userMessages = session.messages.filter((m) => m.role === "user");
                  const lastUserMessage = userMessages[userMessages.length - 1]?.text;

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`group relative rounded-xl p-3 border transition cursor-pointer text-left ${
                        isActive
                          ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-400"
                          : "border-slate-200/80 bg-white hover:border-blue-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="overflow-hidden space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#184973] px-2 py-0.5 rounded-full">
                              {session.subject || "General"}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(session.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {session.title || "Academic Session"}
                          </h4>

                          {lastUserMessage && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {lastUserMessage}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{session.messages.length} message{session.messages.length === 1 ? "" : "s"}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete conversation"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ATTACH SHARED RESOURCE FOR CHAT ─── */}
      {showResourcePickerChat && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={() => setShowResourcePickerChat(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#184973]">
                <BookOpen className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Select Curriculum Material
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResourcePickerChat(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pick a teacher document, school repository textbook, or recommended material to analyze and discuss with EduBridge AI:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sharedResources.length > 0 ? (
                sharedResources.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition text-left"
                  >
                    <div className="overflow-hidden space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          res.category === "teacher"
                            ? "bg-indigo-100 text-indigo-800"
                            : res.category === "recommended"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {res.category === "teacher" ? "Teacher" : res.category === "recommended" ? "Recommended" : "School"}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {res.subjectName}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{res.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {res.recommendationNote || res.description || res.source}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChatSharedResource(res);
                        setShowResourcePickerChat(false);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-[#184973] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition shrink-0 cursor-pointer"
                    >
                      Select
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No digital resources uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ATTRACTIVE FLOATING TOAST NOTIFICATION BANNER ─── */}
      {toastNotification && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3"
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              toastNotification.type === "error"
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : toastNotification.type === "success"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-blue-50 text-[#184973] border border-blue-200"
            }`}
          >
            {toastNotification.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : toastNotification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 pr-2">
            <p className="text-xs font-bold text-slate-800">
              {toastNotification.type === "error" ? "Notice" : "Update"}
            </p>
            <p className="text-xs text-slate-600 leading-snug mt-0.5">
              {toastNotification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function StudentAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-sm font-medium">Loading AI Study Assistant...</p>
          </div>
        </div>
      }
    >
      <StudentAssistantPageContent />
    </Suspense>
  );
}
