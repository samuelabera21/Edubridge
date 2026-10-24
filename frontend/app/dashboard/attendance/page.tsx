"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { 
    ClipboardCheck, 
    Users, 
    UserCheck, 
    XCircle, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    Calendar, 
    Search, 
    Filter, 
    Check, 
    X, 
    RefreshCw, 
    ChevronRight,
    ChevronLeft,
    RotateCcw,
    Eye,
    ShieldAlert,
    MessageSquare,
    ExternalLink,
    Download,
    Send,
    Copy,
    Phone
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

type TabKey = "overview" | "students" | "alerts" | "corrections";
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface AcademicYearItem {
    id: string;
    name: string;
    status: string;
}

interface OverviewData {
    academicYearId: string | null;
    academicYearList: AcademicYearItem[];
    summary: {
        studentAttendanceRate: number;
        totalEnrolledStudents: number;
        totalStudentRecords: number;
        studentStats: { present: number; late: number; absent: number; excused: number };
    };
    todaySnapshot: {
        date: string;
        student: {
            present: number;
            late: number;
            absent: number;
            excused: number;
            totalMarked: number;
            totalEnrolled: number;
            rate: number;
        };
    };
    trends: Array<{
        date: string;
        studentPresent: number;
        studentLate: number;
        studentAbsent: number;
        studentExcused: number;
        studentTotal: number;
        studentRate: number | null;
    }>;
    gradeBreakdown: Array<{
        gradeId: string;
        gradeName: string;
        totalStudents: number;
        attendanceRate: number;
        healthStatus: "Healthy" | "Attention" | "Critical";
        sections: Array<{
            id: string;
            name: string;
            enrollmentCount: number;
            totalRecords?: number;
            attendanceRate: number;
            presentCount: number;
            lateCount?: number;
            absentCount: number;
            excusedCount?: number;
            healthStatus?: "Healthy" | "Attention" | "Critical";
        }>;
    }>;
    pendingCorrectionsCount: number;
    criticalRiskCount: number;
    warningRiskCount: number;
}

interface StudentRow {
    id: string;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
    studentId: string;
    enrollmentId: string;
    studentName: string;
    admissionNumber: string;
    gender?: string;
    gradeName: string;
    sectionName: string;
    classPeriodName: string;
}

interface StudentRosterRow {
    id: string;
    enrollmentId: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    gender?: string;
    gradeName: string;
    sectionName: string;
    timeframe: "today" | "week" | "month" | "term";
    timeframeLabel: string;
    todayStatus?: AttendanceStatus | "PENDING";
    todayRemarks?: string | null;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    excusedDays: number;
    totalSessions: number;
    attendanceRate: number;
    healthStatus: "Healthy" | "Attention" | "Critical";
}

interface RiskAlertItem {
    id: string;
    type: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    targetId: string;
    enrollmentId?: string;
    title: string;
    description: string;
    metric: string;
    suggestedAction: string;
}

interface CorrectionItem {
    id: string;
    enrollmentId: string;
    date: string;
    originalStatus: AttendanceStatus;
    requestedStatus: AttendanceStatus;
    reasonCategory: string;
    justification: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    studentName: string;
    admissionNumber: string;
    gradeName: string;
    sectionName: string;
    requestedBy?: { id: string; name: string } | null;
    createdAt: string;
}

interface StudentDetailData {
    student: {
        id?: string;
        enrollmentId?: string;
        userId?: string | null;
        name: string;
        admissionNumber: string;
        gradeName: string;
        sectionName: string;
        emergencyContactPhone?: string | null;
        emergencyContactName?: string | null;
        emergencyContactRelation?: string | null;
        parents?: Array<{
            id: string;
            userId: string | null;
            name: string;
            relationship: string;
            isPrimary: boolean;
            phoneNumber: string | null;
            email: string | null;
        }>;
    };
    stats: {
        totalSessions: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
        attendanceRate: number;
    };
    records: Array<{
        id: string;
        date: string;
        status: AttendanceStatus;
        remarks?: string;
    }>;
}

export default function AttendanceDashboardPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialTab = (searchParams?.get("tab") as TabKey) || "overview";
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    // Filter and Year state
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Data States
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [studentsData, setStudentsData] = useState<{ data: StudentRow[]; total: number }>({ data: [], total: 0 });
    const [alerts, setAlerts] = useState<RiskAlertItem[]>([]);
    const [corrections, setCorrections] = useState<CorrectionItem[]>([]);

    // Student Filter & View States
    const [studentViewMode, setStudentViewMode] = useState<"roster" | "sessions">("roster");
    const [studentTimeframe, setStudentTimeframe] = useState<"today" | "week" | "month" | "term">("today");
    const [rosterData, setRosterData] = useState<{ data: StudentRosterRow[]; total: number; timeframeLabel?: string }>({ data: [], total: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [studentGradeFilter, setStudentGradeFilter] = useState<string>("ALL");
    const [studentSectionFilter, setStudentSectionFilter] = useState<string>("ALL");
    const [drilldownLabel, setDrilldownLabel] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    // Breakdown Cascading Filters & View Mode
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("ALL");
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("ALL");
    const [hideEmptySections, setHideEmptySections] = useState<boolean>(true);
    const [overviewViewMode, setOverviewViewMode] = useState<"today" | "term">("today");
    const [showBreakdownFilter, setShowBreakdownFilter] = useState<boolean>(false);
    const [overviewPage, setOverviewPage] = useState<number>(1);
    const overviewLimit = 8;
    const [showStudentFilter, setShowStudentFilter] = useState<boolean>(false);

    // Modal / Drawer State
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
    const [studentDetail, setStudentDetail] = useState<StudentDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [drawerStatusFilter, setDrawerStatusFilter] = useState<string>("ALL");
    const [drawerTimeframeFilter, setDrawerTimeframeFilter] = useState<string>("ALL");

    // Drawer Notice Composer State
    const [showComposer, setShowComposer] = useState(false);
    const [composerRecipientType, setComposerRecipientType] = useState<"parent" | "student">("parent");
    const [composerSelectedParentId, setComposerSelectedParentId] = useState<string>("");
    const [composerTemplate, setComposerTemplate] = useState<"absence" | "late" | "general">("absence");
    const [composerMessage, setComposerMessage] = useState<string>("");
    const [sendingNotice, setSendingNotice] = useState(false);
    const [copiedNotice, setCopiedNotice] = useState(false);

    // Dynamic Cascading Options
    const availableGrades = useMemo(() => {
        if (!overview?.gradeBreakdown) return [];
        return overview.gradeBreakdown.map(g => ({
            id: g.gradeId,
            name: g.gradeName
        }));
    }, [overview]);

    const availableSections = useMemo(() => {
        if (!overview?.gradeBreakdown) return [];
        if (selectedGradeFilter === "ALL") {
            const map = new Map<string, string>();
            overview.gradeBreakdown.forEach(g => {
                g.sections.forEach(s => {
                    map.set(s.id, s.name);
                });
            });
            return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        }
        const target = overview.gradeBreakdown.find(g => g.gradeId === selectedGradeFilter);
        if (!target) return [];
        return target.sections.map(s => ({ id: s.id, name: s.name }));
    }, [overview, selectedGradeFilter]);

    // Student Records Tab Available Sections (based on studentGradeFilter)
    const studentAvailableSections = useMemo(() => {
        if (!overview?.gradeBreakdown) return [];
        if (studentGradeFilter === "ALL") {
            const map = new Map<string, string>();
            overview.gradeBreakdown.forEach(g => {
                g.sections.forEach(s => {
                    map.set(s.id, s.name);
                });
            });
            return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        }
        const target = overview.gradeBreakdown.find(g => g.gradeId === studentGradeFilter);
        if (!target) return [];
        return target.sections.map(s => ({ id: s.id, name: s.name }));
    }, [overview, studentGradeFilter]);

    const filteredSectionsList = useMemo(() => {
        if (!overview?.gradeBreakdown) return [];
        const result: Array<{
            gradeId: string;
            gradeName: string;
            sectionId: string;
            sectionName: string;
            enrollmentCount: number;
            presentCount: number;
            absentCount: number;
            lateCount: number;
            totalRecords: number;
            attendanceRate: number;
        }> = [];

        overview.gradeBreakdown.forEach(grade => {
            if (selectedGradeFilter !== "ALL" && grade.gradeId !== selectedGradeFilter) return;

            grade.sections.forEach(sec => {
                if (selectedSectionFilter !== "ALL" && sec.id !== selectedSectionFilter) return;
                if (hideEmptySections && sec.enrollmentCount === 0) return;

                result.push({
                    gradeId: grade.gradeId,
                    gradeName: grade.gradeName,
                    sectionId: sec.id,
                    sectionName: sec.name,
                    enrollmentCount: sec.enrollmentCount,
                    presentCount: sec.presentCount,
                    absentCount: sec.absentCount,
                    lateCount: sec.lateCount || 0,
                    totalRecords: sec.totalRecords || 0,
                    attendanceRate: sec.attendanceRate
                });
            });
        });

        return result;
    }, [overview, selectedGradeFilter, selectedSectionFilter, hideEmptySections]);

    const hasActiveBreakdownFilters = selectedGradeFilter !== "ALL" || selectedSectionFilter !== "ALL" || !hideEmptySections;
    const totalOverviewPages = Math.max(1, Math.ceil(filteredSectionsList.length / overviewLimit));
    const paginatedSections = useMemo(() => {
        const start = (overviewPage - 1) * overviewLimit;
        return filteredSectionsList.slice(start, start + overviewLimit);
    }, [filteredSectionsList, overviewPage, overviewLimit]);

    const studentScope = studentViewMode === "sessions" ? "sessions" : studentTimeframe;
    const handleScopeSelect = (val: string) => {
        if (val === "sessions") {
            setStudentViewMode("sessions");
            loadStudents(selectedYearId, 1, { viewMode: "sessions" });
        } else {
            const tf = val as "today" | "week" | "month" | "term";
            setStudentViewMode("roster");
            setStudentTimeframe(tf);
            loadStudents(selectedYearId, 1, { viewMode: "roster", timeframe: tf });
        }
    };

    const hasActiveStudentFilters = Boolean(
        searchQuery.trim() !== "" || 
        studentGradeFilter !== "ALL" || 
        studentSectionFilter !== "ALL" || 
        studentTimeframe !== "today" || 
        studentViewMode !== "roster" || 
        statusFilter !== "ALL" || 
        dateFilter !== ""
    );

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Load Overview & Initial Metadata
    const loadOverview = useCallback(async (yearId?: string) => {
        try {
            const query = yearId ? `?academicYearId=${yearId}` : "";
            const res = await fetchApi(`/attendance/admin/overview${query}`);
            if (res.ok) {
                const data: OverviewData = await res.json();
                setOverview(data);
                if (!yearId && data.academicYearId) {
                    setSelectedYearId(data.academicYearId);
                }
            }
        } catch (_) {}
    }, []);

    // Load Student Records (Roster 1-row-per-student or Sessions Audit)
    const loadStudents = useCallback(async (
        yearId?: string, 
        curPage = 1,
        overrideFilters?: { 
            gradeId?: string; 
            sectionId?: string; 
            search?: string; 
            status?: string; 
            date?: string;
            viewMode?: "roster" | "sessions";
            timeframe?: "today" | "week" | "month" | "term";
        }
    ) => {
        try {
            const params = new URLSearchParams();
            if (yearId) params.set("academicYearId", yearId);

            const vMode = overrideFilters?.viewMode !== undefined ? overrideFilters.viewMode : studentViewMode;
            const tFrame = overrideFilters?.timeframe !== undefined ? overrideFilters.timeframe : studentTimeframe;
            params.set("viewMode", vMode);
            params.set("timeframe", tFrame);

            const searchVal = overrideFilters?.search !== undefined ? overrideFilters.search : searchQuery;
            if (searchVal.trim()) params.set("search", searchVal.trim());

            const statusVal = overrideFilters?.status !== undefined ? overrideFilters.status : statusFilter;
            if (statusVal !== "ALL") params.set("status", statusVal);

            const dateVal = overrideFilters?.date !== undefined ? overrideFilters.date : dateFilter;
            if (dateVal) params.set("date", dateVal);

            const gId = overrideFilters?.gradeId !== undefined ? overrideFilters.gradeId : studentGradeFilter;
            const sId = overrideFilters?.sectionId !== undefined ? overrideFilters.sectionId : studentSectionFilter;
            if (gId && gId !== "ALL") params.set("gradeId", gId);
            if (sId && sId !== "ALL") params.set("sectionId", sId);

            params.set("page", String(curPage));
            params.set("limit", "25");

            const res = await fetchApi(`/attendance/admin/students?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (vMode === "roster") {
                    setRosterData({
                        data: Array.isArray(data.data) ? data.data : [],
                        total: data.pagination?.total ?? (Array.isArray(data.data) ? data.data.length : 0),
                        timeframeLabel: data.timeframeLabel
                    });
                } else {
                    setStudentsData({
                        data: Array.isArray(data.data) ? data.data : [],
                        total: data.pagination?.total ?? data.total ?? 0
                    });
                }
            }
        } catch (_) {}
    }, [searchQuery, statusFilter, dateFilter, studentGradeFilter, studentSectionFilter, studentViewMode, studentTimeframe]);

    // Handle Drill-down from Overview Table
    const handleDrilldownSection = (sec: { gradeId: string; gradeName: string; sectionId: string; sectionName: string }) => {
        setStudentGradeFilter(sec.gradeId);
        setStudentSectionFilter(sec.sectionId);
        setDrilldownLabel(`${sec.gradeName} - Section ${sec.sectionName}`);
        setStudentViewMode("roster");
        handleTabChange("students");
        loadStudents(selectedYearId, 1, { 
            gradeId: sec.gradeId, 
            sectionId: sec.sectionId, 
            viewMode: "roster",
            timeframe: studentTimeframe
        });
    };

    // Load Risk Alerts
    const loadAlerts = useCallback(async (yearId?: string) => {
        try {
            const query = yearId ? `?academicYearId=${yearId}` : "";
            const res = await fetchApi(`/attendance/admin/alerts${query}`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(Array.isArray(data) ? data : []);
            }
        } catch (_) {}
    }, []);

    // Load Corrections
    const loadCorrections = useCallback(async (yearId?: string) => {
        try {
            const query = yearId ? `?academicYearId=${yearId}` : "";
            const res = await fetchApi(`/attendance/admin/corrections${query}`);
            if (res.ok) {
                const data = await res.json();
                setCorrections(Array.isArray(data.data) ? data.data : []);
            }
        } catch (_) {}
    }, []);

    // Initial Master Load
    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.allSettled([
            loadOverview(selectedYearId),
            loadStudents(selectedYearId, 1),
            loadAlerts(selectedYearId),
            loadCorrections(selectedYearId)
        ]);
        setLoading(false);
    }, [selectedYearId, loadOverview, loadStudents, loadAlerts, loadCorrections]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
        showToast("Attendance data refreshed");
    };

    // Change Tab
    const handleTabChange = (tab: TabKey) => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set("tab", tab);
        router.replace(`/dashboard/attendance?${params.toString()}`);
    };

    // Open Student Detail Drawer
    const handleOpenStudentDetail = async (enrollmentId: string) => {
        setSelectedEnrollmentId(enrollmentId);
        setDrawerStatusFilter("ALL");
        setDrawerTimeframeFilter("ALL");
        setShowComposer(false);
        setSendingNotice(false);
        setLoadingDetail(true);
        try {
            const res = await fetchApi(`/attendance/admin/students/${enrollmentId}`);
            if (res.ok) {
                const data = await res.json();
                setStudentDetail(data);
                if (data.student?.parents && data.student.parents.length > 0) {
                    setComposerSelectedParentId(data.student.parents[0].id);
                }
            }
        } catch (_) {
            showToast("Failed to load student details");
        } finally {
            setLoadingDetail(false);
        }
    };

    // Notice Template Generator
    const getNoticeTemplate = (
        type: "absence" | "late" | "general",
        recipient: "parent" | "student",
        detail: StudentDetailData | null
    ) => {
        if (!detail) return "";
        const studentName = detail.student.name;
        const gradeSec = `${detail.student.gradeName} - Section ${detail.student.sectionName}`;
        const absentDays = detail.stats.absentCount;
        const lateDays = detail.stats.lateCount;

        if (recipient === "parent") {
            if (type === "absence") {
                return `Dear Parent/Guardian,\n\nThis is an official notice regarding ${studentName} (${gradeSec}). Our records show ${absentDays} recorded absence(s) this term. Consistent attendance is vital for learning outcomes. Please contact the school office or submit an explanation.\n\nRegards,\nSchool Administration`;
            } else if (type === "late") {
                return `Dear Parent/Guardian,\n\nThis is a punctuality notice regarding ${studentName} (${gradeSec}). Our records show ${lateDays} late arrival(s) this term. School commences promptly every morning. Your assistance in ensuring prompt arrival is appreciated.\n\nRegards,\nSchool Administration`;
            } else {
                return `Dear Parent/Guardian,\n\nRegarding ${studentName}'s attendance in ${gradeSec}, current term standing is ${detail.stats.attendanceRate}%. Please reach out if you need further details.\n\nRegards,\nSchool Administration`;
            }
        } else {
            if (type === "absence") {
                return `Dear ${studentName},\n\nThis is a reminder regarding your ${absentDays} absence(s) in ${gradeSec}. Please coordinate with your subject teachers to complete missed coursework.\n\nSchool Administration`;
            } else if (type === "late") {
                return `Dear ${studentName},\n\nThis is a punctuality reminder that you have recorded ${lateDays} late arrival(s). Please ensure timely arrival for morning roll call.\n\nSchool Administration`;
            } else {
                return `Dear ${studentName},\n\nYour current attendance rate in ${gradeSec} is ${detail.stats.attendanceRate}%.\n\nSchool Administration`;
            }
        }
    };

    // Send Attendance Notice via Communication Messages API
    const handleSendNotice = async () => {
        if (!studentDetail || !composerMessage.trim()) return;

        let targetUserId: string | null = null;
        let recipientLabel = "";

        if (composerRecipientType === "parent") {
            const parent = studentDetail.student.parents?.find(p => p.id === composerSelectedParentId) 
                || studentDetail.student.parents?.[0];
            targetUserId = parent?.userId || null;
            recipientLabel = parent ? `${parent.name} (${parent.relationship})` : "Parent/Guardian";
        } else {
            targetUserId = studentDetail.student.userId || null;
            recipientLabel = `${studentDetail.student.name} (Student)`;
        }

        if (!targetUserId) {
            showToast(`Recipient has no active portal account. Please copy notice text or contact via phone.`);
            return;
        }

        setSendingNotice(true);
        try {
            const res = await fetchApi("/communication/messages", {
                method: "POST",
                body: JSON.stringify({
                    receiverId: targetUserId,
                    content: composerMessage
                })
            });
            if (res.ok) {
                showToast(`Notice sent successfully to ${recipientLabel}`);
                setShowComposer(false);
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || "Failed to send notice");
            }
        } catch (_) {
            showToast("Failed to send notice");
        } finally {
            setSendingNotice(false);
        }
    };

    // Copy Notice Text
    const handleCopyNotice = () => {
        if (!composerMessage) return;
        navigator.clipboard.writeText(composerMessage);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 2000);
        showToast("Notice text copied to clipboard");
    };

    // Filtered Records for Drawer
    const filteredDrawerRecords = useMemo(() => {
        if (!studentDetail?.records) return [];
        return studentDetail.records.filter(r => {
            if (drawerStatusFilter !== "ALL" && r.status !== drawerStatusFilter) {
                return false;
            }
            if (drawerTimeframeFilter === "THIS_WEEK") {
                const now = new Date();
                const day = now.getDay();
                const diffToMonday = (day === 0 ? -6 : 1) - day;
                const monday = new Date(now);
                monday.setDate(now.getDate() + diffToMonday);
                monday.setHours(0, 0, 0, 0);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                const rDate = new Date(r.date);
                if (rDate < monday || rDate > sunday) return false;
            } else if (drawerTimeframeFilter === "THIS_MONTH") {
                const now = new Date();
                const rDate = new Date(r.date);
                if (rDate.getFullYear() !== now.getFullYear() || rDate.getMonth() !== now.getMonth()) {
                    return false;
                }
            }
            return true;
        });
    }, [studentDetail, drawerStatusFilter, drawerTimeframeFilter]);

    // Format Date for Drawer Display
    const formatDateDisplay = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
        } catch (_) {
            return dateStr;
        }
    };

    // Export Student History to CSV
    const handleExportStudentCSV = () => {
        if (!studentDetail || !studentDetail.records.length) return;
        const headers = ["Student Name", "Admission ID", "Grade", "Section", "Date", "Status", "Remarks"];
        const rows = filteredDrawerRecords.map(r => [
            `"${studentDetail.student.name.replace(/"/g, '""')}"`,
            `"${studentDetail.student.admissionNumber}"`,
            `"${studentDetail.student.gradeName}"`,
            `"${studentDetail.student.sectionName}"`,
            `"${r.date}"`,
            `"${r.status}"`,
            `"${(r.remarks || "").replace(/"/g, '""')}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_${studentDetail.student.admissionNumber || "student"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Student attendance exported to CSV");
    };

    // Approve / Reject Correction
    const handleProcessCorrection = async (id: string, action: "approve" | "reject") => {
        try {
            const res = await fetchApi(`/attendance/admin/corrections/${id}/${action}`, {
                method: "POST"
            });
            if (res.ok) {
                showToast(`Correction ${action === "approve" ? "approved" : "rejected"}`);
                loadCorrections(selectedYearId);
                loadOverview(selectedYearId);
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || `Failed to ${action} correction`);
            }
        } catch (_) {
            showToast(`Error processing correction`);
        }
    };

    const statusBadge = (status?: AttendanceStatus | "PENDING") => {
        switch (status) {
            case "PRESENT":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#4085b3] border border-blue-200">PRESENT</span>;
            case "ABSENT":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">ABSENT</span>;
            case "LATE":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">LATE</span>;
            case "EXCUSED":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">EXCUSED</span>;
            case "PENDING":
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">UNMARKED</span>;
        }
    };

    if (loading) return <LoadingState message="Loading attendance records..." />;

    const pendingCorrectionsCount = corrections.filter(c => c.status === "PENDING").length;

    return (
        <div className="space-y-4 text-slate-800 max-w-7xl mx-auto pb-12">
            {/* Header: Clean & Concise */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#4085b3] flex items-center justify-center font-bold">
                        <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-tight">Attendance Tracking</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Academic Year Selector */}
                    {overview?.academicYearList && overview.academicYearList.length > 0 && (
                        <select
                            value={selectedYearId}
                            onChange={(e) => {
                                setSelectedYearId(e.target.value);
                                loadAll();
                            }}
                            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                        >
                            {overview.academicYearList.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(Current)" : ""}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#4085b3]" : ""}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Global Toast */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Clean Underline Tabs */}
            <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
                <button
                    type="button"
                    onClick={() => handleTabChange("overview")}
                    className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        activeTab === "overview"
                            ? "border-[#4085b3] text-[#4085b3] font-bold"
                            : "border-transparent hover:text-slate-900"
                    }`}
                >
                    <span>Overview</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange("students")}
                    className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        activeTab === "students"
                            ? "border-[#4085b3] text-[#4085b3] font-bold"
                            : "border-transparent hover:text-slate-900"
                    }`}
                >
                    <span>Student Attendance</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {studentViewMode === "roster" ? rosterData.total : studentsData.total}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange("alerts")}
                    className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        activeTab === "alerts"
                            ? "border-[#4085b3] text-[#4085b3] font-bold"
                            : "border-transparent hover:text-slate-900"
                    }`}
                >
                    <span>Risk Alerts</span>
                    {alerts.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold">
                            {alerts.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange("corrections")}
                    className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        activeTab === "corrections"
                            ? "border-[#4085b3] text-[#4085b3] font-bold"
                            : "border-transparent hover:text-slate-900"
                    }`}
                >
                    <span>Corrections</span>
                    {pendingCorrectionsCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                            {pendingCorrectionsCount}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    {/* Executive Metric Cards: Clean, minimal, brand blue */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-medium text-slate-500">Today's Attendance</span>
                                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                                    {overview?.todaySnapshot?.student?.rate || 0}%
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-[#4085b3] border border-blue-100">
                                    Daily Roll Call
                                </span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-medium text-slate-500">Term Average Attendance</span>
                                <div className="text-2xl font-bold text-[#4085b3] mt-0.5">
                                    {overview?.summary?.studentAttendanceRate || 0}%
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                    Official Term Metric
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Grade & Section Breakdown Table */}
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">Grade & Section Attendance Breakdown</h3>
                            </div>

                            {/* High-Level Filter Link/Button */}
                            <button
                                type="button"
                                onClick={() => setShowBreakdownFilter(prev => !prev)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                    showBreakdownFilter || hasActiveBreakdownFilters
                                        ? "bg-[#4085b3] text-white border-[#4085b3] shadow-xs"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3]"
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span>Filter</span>
                                {hasActiveBreakdownFilters && !showBreakdownFilter && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                )}
                            </button>
                        </div>

                        {/* High-Level Collapsible Filter Panel */}
                        {showBreakdownFilter && (
                            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="breakdown-grade-select" className="text-xs font-medium text-slate-600">Grade:</label>
                                        <select
                                            id="breakdown-grade-select"
                                            value={selectedGradeFilter}
                                            onChange={(e) => {
                                                setSelectedGradeFilter(e.target.value);
                                                setSelectedSectionFilter("ALL");
                                                setOverviewPage(1);
                                            }}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                        >
                                            <option value="ALL">All Grades ({availableGrades.length})</option>
                                            {availableGrades.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label htmlFor="breakdown-section-select" className="text-xs font-medium text-slate-600">Section:</label>
                                        <select
                                            id="breakdown-section-select"
                                            value={selectedSectionFilter}
                                            onChange={(e) => {
                                                setSelectedSectionFilter(e.target.value);
                                                setOverviewPage(1);
                                            }}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                        >
                                            <option value="ALL">All Sections ({availableSections.length})</option>
                                            {availableSections.map(s => (
                                                <option key={s.id} value={s.id}>Section {s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none ml-1 pl-3 border-l border-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={hideEmptySections}
                                            onChange={(e) => {
                                                setHideEmptySections(e.target.checked);
                                                setOverviewPage(1);
                                            }}
                                            className="rounded border-slate-300 text-[#4085b3] focus:ring-[#4085b3] w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span>Hide empty classes</span>
                                    </label>
                                </div>

                                {hasActiveBreakdownFilters && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedGradeFilter("ALL");
                                            setSelectedSectionFilter("ALL");
                                            setHideEmptySections(true);
                                            setOverviewPage(1);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 cursor-pointer shadow-2xs"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                                    <tr>
                                        <th className="py-2.5 px-3.5">Grade Level</th>
                                        <th className="py-2.5 px-3.5">Section</th>
                                        <th className="py-2.5 px-3.5 text-center">Enrolled</th>
                                        <th className="py-2.5 px-3.5 text-center">Present Marks</th>
                                        <th className="py-2.5 px-3.5 text-center">Absent Marks</th>
                                        <th className="py-2.5 px-3.5">Attendance Rate</th>
                                        <th className="py-2.5 px-3.5 text-center">Status</th>
                                        <th className="py-2.5 px-3.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSectionsList.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400">
                                                No sections match the selected filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSections.map(sec => {
                                            const hasEnrolled = sec.enrollmentCount > 0;
                                            const hasRecords = sec.totalRecords > 0;

                                            return (
                                                <tr 
                                                    key={sec.sectionId} 
                                                    onClick={() => {
                                                        if (hasEnrolled) {
                                                            handleDrilldownSection(sec);
                                                        }
                                                    }}
                                                    className={`transition-colors ${
                                                        hasEnrolled 
                                                            ? "hover:bg-blue-50/40 cursor-pointer" 
                                                            : "hover:bg-slate-50/70"
                                                    }`}
                                                >
                                                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">{sec.gradeName}</td>
                                                    <td className="py-2.5 px-3.5 font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                if (hasEnrolled) {
                                                                    e.stopPropagation();
                                                                    handleDrilldownSection(sec);
                                                                }
                                                            }}
                                                            className={`text-left transition-colors font-medium ${
                                                                hasEnrolled ? "text-slate-800 hover:text-[#4085b3] cursor-pointer" : "text-slate-600"
                                                            }`}
                                                        >
                                                            Section {sec.sectionName}
                                                        </button>
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center text-slate-600 font-medium">
                                                        {sec.enrollmentCount}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center text-slate-800 font-semibold">
                                                        {hasRecords ? sec.presentCount : "—"}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center text-slate-600 font-semibold">
                                                        {hasRecords ? sec.absentCount : "—"}
                                                    </td>
                                                    <td className="py-2.5 px-3.5">
                                                        {hasRecords ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full ${
                                                                            sec.attendanceRate >= 90 ? "bg-[#4085b3]" :
                                                                            sec.attendanceRate >= 80 ? "bg-amber-500" : "bg-rose-500"
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, sec.attendanceRate)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="font-semibold text-slate-800">{sec.attendanceRate}%</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-normal italic">
                                                                {hasEnrolled ? "No roll calls recorded" : "No enrollments"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center">
                                                        {!hasEnrolled ? (
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                                Empty Class
                                                            </span>
                                                        ) : !hasRecords ? (
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                                                                Pending Roll Call
                                                            </span>
                                                        ) : (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                sec.attendanceRate >= 90 ? "bg-blue-50 text-[#4085b3] border border-blue-200" :
                                                                sec.attendanceRate >= 80 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                                "bg-rose-50 text-rose-700 border border-rose-200"
                                                            }`}>
                                                                {sec.attendanceRate >= 90 ? "Healthy" : sec.attendanceRate >= 80 ? "Attention" : "Critical"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                                        {hasEnrolled ? (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDrilldownSection(sec);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#4085b3] border border-[#4085b3]/30 rounded-md hover:bg-[#4085b3] hover:text-white transition-all duration-150 cursor-pointer shadow-2xs"
                                                            >
                                                                <span>View Class</span>
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Breakdown Pagination Footer */}
                        {filteredSectionsList.length > 0 && (
                            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                                <div>
                                    Showing <strong className="text-slate-900">{(overviewPage - 1) * overviewLimit + 1}</strong> to{" "}
                                    <strong className="text-slate-900">{Math.min(overviewPage * overviewLimit, filteredSectionsList.length)}</strong> of{" "}
                                    <strong className="text-slate-900">{filteredSectionsList.length}</strong> sections
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setOverviewPage(p => Math.max(1, p - 1))}
                                        disabled={overviewPage <= 1}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Prev</span>
                                    </button>

                                    <span className="px-2 font-medium text-slate-700">
                                        Page {overviewPage} of {totalOverviewPages}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setOverviewPage(p => Math.min(totalOverviewPages, p + 1))}
                                        disabled={overviewPage >= totalOverviewPages}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: STUDENT RECORDS / ROSTER */}
            {activeTab === "students" && (
                <div className="space-y-3">
                    {/* Drill-down Active Context Banner */}
                    {drilldownLabel && (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Class:</span>
                                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
                                    {drilldownLabel}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStudentGradeFilter("ALL");
                                        setStudentSectionFilter("ALL");
                                        setDrilldownLabel(null);
                                        loadStudents(selectedYearId, 1, { gradeId: "ALL", sectionId: "ALL" });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-all duration-150 cursor-pointer shadow-2xs"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Show all school students</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTabChange("overview")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-all duration-150 cursor-pointer shadow-2xs"
                                >
                                    <span>← Back to Overview</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table Card */}
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                        {/* Table Toolbar */}
                        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student name or admission ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") loadStudents(selectedYearId, 1); }}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-[#4085b3] transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Active Scope Badge */}
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                    {studentViewMode === "sessions" 
                                        ? "Audit Logs (All Dates)" 
                                        : studentTimeframe === "today" 
                                            ? "Today's Status" 
                                            : studentTimeframe === "week" 
                                                ? (rosterData.timeframeLabel ? `This Week (${rosterData.timeframeLabel})` : "This Week") 
                                                : studentTimeframe === "month" 
                                                    ? (rosterData.timeframeLabel ? `This Month (${rosterData.timeframeLabel})` : "This Month") 
                                                    : "Term Summary"}
                                </span>

                                {/* Filter Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowStudentFilter(prev => !prev)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs ${
                                        showStudentFilter || hasActiveStudentFilters
                                            ? "bg-[#4085b3] text-white border-[#4085b3]"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3]"
                                    }`}
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    <span>Filter</span>
                                    {hasActiveStudentFilters && !showStudentFilter && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Collapsible High-Level Filter Panel */}
                        {showStudentFilter && (
                            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Period / Scope Dropdown */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="student-scope-select" className="text-xs font-medium text-slate-600">Period:</label>
                                        <select
                                            id="student-scope-select"
                                            value={studentScope}
                                            onChange={(e) => handleScopeSelect(e.target.value)}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                        >
                                            <option value="today">Today's Status</option>
                                            <option value="week">This Week</option>
                                            <option value="month">This Month</option>
                                            <option value="term">Term Summary</option>
                                            <option value="sessions">Audit Logs (All Dates)</option>
                                        </select>
                                    </div>

                                    {/* Grade Dropdown */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="student-grade-select" className="text-xs font-medium text-slate-600">Grade:</label>
                                        <select
                                            id="student-grade-select"
                                            value={studentGradeFilter}
                                            onChange={(e) => {
                                                const newGrade = e.target.value;
                                                setStudentGradeFilter(newGrade);
                                                setStudentSectionFilter("ALL");
                                                setDrilldownLabel(null);
                                                loadStudents(selectedYearId, 1, { gradeId: newGrade, sectionId: "ALL" });
                                            }}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                        >
                                            <option value="ALL">All Grades ({availableGrades.length})</option>
                                            {availableGrades.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Section Dropdown */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="student-section-select" className="text-xs font-medium text-slate-600">Section:</label>
                                        <select
                                            id="student-section-select"
                                            value={studentSectionFilter}
                                            onChange={(e) => {
                                                const newSec = e.target.value;
                                                setStudentSectionFilter(newSec);
                                                setDrilldownLabel(null);
                                                loadStudents(selectedYearId, 1, { sectionId: newSec });
                                            }}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                        >
                                            <option value="ALL">All Sections ({studentAvailableSections.length})</option>
                                            {studentAvailableSections.map(s => (
                                                <option key={s.id} value={s.id}>Section {s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Audit Mode Specific Filters */}
                                    {studentViewMode === "sessions" && (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="student-status-select" className="text-xs font-medium text-slate-600">Status:</label>
                                                <select
                                                    id="student-status-select"
                                                    value={statusFilter}
                                                    onChange={(e) => {
                                                        setStatusFilter(e.target.value);
                                                        loadStudents(selectedYearId, 1, { status: e.target.value });
                                                    }}
                                                    className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                                >
                                                    <option value="ALL">All Statuses</option>
                                                    <option value="PRESENT">Present</option>
                                                    <option value="ABSENT">Absent</option>
                                                    <option value="LATE">Late</option>
                                                    <option value="EXCUSED">Excused</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label htmlFor="student-date-filter" className="text-xs font-medium text-slate-600">Date:</label>
                                                <input
                                                    id="student-date-filter"
                                                    type="date"
                                                    value={dateFilter}
                                                    onChange={(e) => {
                                                        setDateFilter(e.target.value);
                                                        loadStudents(selectedYearId, 1, { date: e.target.value });
                                                    }}
                                                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {hasActiveStudentFilters && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setStatusFilter("ALL");
                                            setDateFilter("");
                                            setStudentGradeFilter("ALL");
                                            setStudentSectionFilter("ALL");
                                            setDrilldownLabel(null);
                                            setStudentViewMode("roster");
                                            setStudentTimeframe("today");
                                            loadStudents(selectedYearId, 1, {
                                                gradeId: "ALL",
                                                sectionId: "ALL",
                                                search: "",
                                                status: "ALL",
                                                date: "",
                                                viewMode: "roster",
                                                timeframe: "today"
                                            });
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 cursor-pointer shadow-2xs"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset Filters</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            {studentViewMode === "roster" ? (
                                /* ROSTER MODE: Exactly 1 row per enrolled student */
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                                        <tr>
                                            <th className="py-2.5 px-3.5">Student</th>
                                            <th className="py-2.5 px-3.5">Admission ID</th>
                                            <th className="py-2.5 px-3.5">Grade & Section</th>
                                            {studentTimeframe === "today" ? (
                                                <>
                                                    <th className="py-2.5 px-3.5">Today's Roll Call</th>
                                                    <th className="py-2.5 px-3.5">Remarks</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="py-2.5 px-3 text-center">Period Scope</th>
                                                    <th className="py-2.5 px-3 text-center">Present (Days)</th>
                                                    <th className="py-2.5 px-3 text-center">Late (Days)</th>
                                                    <th className="py-2.5 px-3 text-center">Absent (Days)</th>
                                                </>
                                            )}
                                            <th className="py-2.5 px-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rosterData.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={studentTimeframe === "today" ? 6 : 8} className="py-8 text-center text-slate-400">
                                                    No students enrolled matching the selected filter criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            rosterData.data.map((row) => (
                                                <tr key={row.enrollmentId} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">{row.studentName}</td>
                                                    <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">{row.admissionNumber}</td>
                                                    <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                                                        {row.gradeName} - Section {row.sectionName}
                                                    </td>

                                                    {studentTimeframe === "today" ? (
                                                        <>
                                                            <td className="py-2.5 px-3.5">
                                                                {statusBadge(row.todayStatus)}
                                                            </td>
                                                            <td className="py-2.5 px-3.5 text-slate-500 truncate max-w-[180px]">
                                                                {row.todayRemarks || "—"}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                                                                    {studentTimeframe === "week" ? "Weekly" : studentTimeframe === "month" ? "Monthly" : "Term"}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center font-bold text-slate-800 text-sm">
                                                                {row.presentDays}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center font-semibold text-amber-600 text-sm">
                                                                {row.lateDays}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center font-semibold text-rose-600 text-sm">
                                                                {row.absentDays}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenStudentDetail(row.enrollmentId)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#4085b3] border border-[#4085b3]/30 rounded-md hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-all duration-150 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>History</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                /* SESSIONS AUDIT MODE: Day-by-day logs */
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                                        <tr>
                                            <th className="py-2.5 px-3">Student</th>
                                            <th className="py-2.5 px-3">Admission ID</th>
                                            <th className="py-2.5 px-3">Grade & Section</th>
                                            <th className="py-2.5 px-3">Date</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Remarks</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {studentsData.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                                    No attendance logs match your filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            studentsData.data.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.studentName}</td>
                                                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{row.admissionNumber}</td>
                                                    <td className="py-2.5 px-3 text-slate-600">{row.gradeName} - {row.sectionName}</td>
                                                    <td className="py-2.5 px-3 text-slate-600">{row.date}</td>
                                                    <td className="py-2.5 px-3">{statusBadge(row.status)}</td>
                                                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[160px]">
                                                        {row.remarks || "—"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenStudentDetail(row.enrollmentId)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#4085b3] border border-[#4085b3]/30 rounded-md hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-all duration-150 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>History</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Student Attendance Pagination Footer */}
                        {((studentViewMode === "roster" ? rosterData.total : studentsData.total) > 0) && (
                            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                                <div>
                                    Showing <strong className="text-slate-900">{(page - 1) * 25 + 1}</strong> to{" "}
                                    <strong className="text-slate-900">{Math.min(page * 25, studentViewMode === "roster" ? rosterData.total : studentsData.total)}</strong> of{" "}
                                    <strong className="text-slate-900">{studentViewMode === "roster" ? rosterData.total : studentsData.total}</strong> students
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const prevP = Math.max(1, page - 1);
                                            setPage(prevP);
                                            loadStudents(selectedYearId, prevP);
                                        }}
                                        disabled={page <= 1}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Prev</span>
                                    </button>

                                    <span className="px-2 font-medium text-slate-700">
                                        Page {page} of {Math.max(1, Math.ceil((studentViewMode === "roster" ? rosterData.total : studentsData.total) / 25))}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const totalCount = studentViewMode === "roster" ? rosterData.total : studentsData.total;
                                            const totalP = Math.max(1, Math.ceil(totalCount / 25));
                                            const nextP = Math.min(totalP, page + 1);
                                            setPage(nextP);
                                            loadStudents(selectedYearId, nextP);
                                        }}
                                        disabled={page >= Math.max(1, Math.ceil((studentViewMode === "roster" ? rosterData.total : studentsData.total) / 25))}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: RISK ALERTS */}
            {activeTab === "alerts" && (
                <div className="space-y-3">
                    {alerts.length === 0 ? (
                        <div className="p-10 border border-slate-200 rounded-xl bg-white text-center">
                            <CheckCircle2 className="w-8 h-8 text-[#4085b3] mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-900">No Absence Risk Alerts</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                All students currently maintain normal attendance standing.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            alert.severity === "CRITICAL" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                            "bg-amber-50 text-amber-600 border border-amber-200"
                                        }`}>
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-900">{alert.title}</p>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${
                                                    alert.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                                                }`}>
                                                    {alert.severity}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{alert.description}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Recommendation: {alert.suggestedAction}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <Link
                                            href="/dashboard/communication/messages?tab=PARENT"
                                            className="px-2.5 py-1 text-xs font-semibold text-[#4085b3] border border-[#4085b3]/30 bg-blue-50/40 hover:bg-[#4085b3] hover:text-white rounded-lg flex items-center gap-1 transition-all duration-150"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>Contact Parent</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: OFFICIAL CORRECTIONS */}
            {activeTab === "corrections" && (
                <div className="space-y-3">
                    {corrections.length === 0 ? (
                        <div className="p-10 border border-slate-200 rounded-xl bg-white text-center">
                            <CheckCircle2 className="w-8 h-8 text-[#4085b3] mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-900">No Correction Requests</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                No pending or historical attendance correction requests recorded.
                            </p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                                    <tr>
                                        <th className="py-2.5 px-3">Student</th>
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Correction</th>
                                        <th className="py-2.5 px-3">Reason</th>
                                        <th className="py-2.5 px-3">Requested By</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3 text-right">Decision</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {corrections.map((corr) => (
                                        <tr key={corr.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-3">
                                                <p className="font-semibold text-slate-900">{corr.studentName}</p>
                                                <p className="text-[10px] text-slate-400">{corr.gradeName} - {corr.sectionName}</p>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600">{corr.date}</td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                    <span className="text-rose-600 line-through">{corr.originalStatus}</span>
                                                    <span>➔</span>
                                                    <span className="text-[#4085b3] font-bold">{corr.requestedStatus}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <p className="text-slate-800 font-medium">{corr.reasonCategory}</p>
                                                <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{corr.justification}</p>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600">
                                                {corr.requestedBy?.name || "Teacher / Staff"}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                    corr.status === "PENDING" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                                                    corr.status === "APPROVED" ? "bg-blue-50 text-[#4085b3] border border-blue-200" :
                                                    "bg-rose-50 text-rose-800 border border-rose-200"
                                                }`}>
                                                    {corr.status}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                {corr.status === "PENDING" ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleProcessCorrection(corr.id, "approve")}
                                                            className="px-2.5 py-1 bg-[#4085b3] hover:bg-[#32698e] text-white rounded text-[11px] font-semibold cursor-pointer transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleProcessCorrection(corr.id, "reject")}
                                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Student Detail Slide-Over Drawer */}
            {selectedEnrollmentId && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                        onClick={() => setSelectedEnrollmentId(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-[#4085b3] flex items-center justify-center font-bold text-sm shrink-0">
                                    {studentDetail?.student?.name ? studentDetail.student.name.charAt(0).toUpperCase() : "S"}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                                        {studentDetail?.student?.name || "Student Attendance"}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                                        {studentDetail?.student ? `${studentDetail.student.gradeName} - Section ${studentDetail.student.sectionName} • ID: ${studentDetail.student.admissionNumber}` : "Loading details..."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {studentDetail && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextState = !showComposer;
                                            setShowComposer(nextState);
                                            if (nextState && studentDetail) {
                                                const defaultTemplate = studentDetail.stats.absentCount > 0 ? "absence" : studentDetail.stats.lateCount > 0 ? "late" : "general";
                                                setComposerTemplate(defaultTemplate);
                                                setComposerMessage(getNoticeTemplate(defaultTemplate, composerRecipientType, studentDetail));
                                            }
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs ${
                                            showComposer
                                                ? "bg-[#4085b3] text-white border-[#4085b3]"
                                                : "bg-white text-[#4085b3] border-[#4085b3]/40 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3]"
                                        }`}
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{showComposer ? "Hide Notice" : "Contact / Notice"}</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSelectedEnrollmentId(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-all duration-150 cursor-pointer"
                                    title="Close Drawer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Inline Attendance Notice Composer */}
                        {showComposer && studentDetail && (
                            <div className="p-3.5 bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-1 duration-150 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                        <MessageSquare className="w-3.5 h-3.5 text-[#4085b3]" />
                                        <span>Attendance Notice Composer</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">Instant EMIS Dispatch</span>
                                </div>

                                {/* Recipient Toggle */}
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Recipient:</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setComposerRecipientType("parent");
                                                setComposerMessage(getNoticeTemplate(composerTemplate, "parent", studentDetail));
                                            }}
                                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                                composerRecipientType === "parent"
                                                    ? "bg-[#4085b3] text-white border-[#4085b3]"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            Parent / Guardian
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setComposerRecipientType("student");
                                                setComposerMessage(getNoticeTemplate(composerTemplate, "student", studentDetail));
                                            }}
                                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                                composerRecipientType === "student"
                                                    ? "bg-[#4085b3] text-white border-[#4085b3]"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            Student Direct
                                        </button>
                                    </div>
                                </div>

                                {/* Parent Contact Info / Dropdown */}
                                {composerRecipientType === "parent" && (
                                    <div>
                                        {studentDetail.student.parents && studentDetail.student.parents.length > 0 ? (
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Parent Contact:</label>
                                                <select
                                                    value={composerSelectedParentId}
                                                    onChange={(e) => setComposerSelectedParentId(e.target.value)}
                                                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-[#4085b3] focus:outline-hidden cursor-pointer"
                                                >
                                                    {studentDetail.student.parents.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.relationship}) {p.phoneNumber ? `• Tel: ${p.phoneNumber}` : ""} {p.userId ? "• Portal Active" : "• Offline"}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (studentDetail.student.emergencyContactName || studentDetail.student.emergencyContactPhone) ? (
                                            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs text-slate-700 flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-900">{studentDetail.student.emergencyContactName || "Emergency Contact"} ({studentDetail.student.emergencyContactRelation || "Guardian"})</p>
                                                    <p className="text-[11px] text-slate-500 font-mono">{studentDetail.student.emergencyContactPhone || "No telephone provided"}</p>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[#4085b3]">Emergency</span>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                                No linked parent account found for this student.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Notice Templates */}
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Notice Template:</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(["absence", "late", "general"] as const).map(tmpl => (
                                            <button
                                                key={tmpl}
                                                type="button"
                                                onClick={() => {
                                                    setComposerTemplate(tmpl);
                                                    setComposerMessage(getNoticeTemplate(tmpl, composerRecipientType, studentDetail));
                                                }}
                                                className={`px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-all ${
                                                    composerTemplate === tmpl
                                                        ? "bg-slate-800 text-white border-slate-800"
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                                }`}
                                            >
                                                {tmpl === "absence" ? "Absence Warning" : tmpl === "late" ? "Tardiness Notice" : "Standing Check"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Editable Message Box */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[11px] font-semibold text-slate-700">Message Content:</label>
                                        <div className="flex items-center gap-3">
                                            {composerMessage && (
                                                <button
                                                    type="button"
                                                    onClick={() => setComposerMessage("")}
                                                    className="text-[11px] text-slate-500 hover:text-rose-600 cursor-pointer inline-flex items-center gap-1 transition-colors font-medium"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span>Clear</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleCopyNotice}
                                                className="text-[11px] text-[#4085b3] hover:underline cursor-pointer inline-flex items-center gap-1 font-semibold"
                                            >
                                                {copiedNotice ? <Check className="w-3 h-3 text-[#4085b3]" /> : <Copy className="w-3 h-3" />}
                                                <span>{copiedNotice ? "Copied" : "Copy Text"}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        rows={7}
                                        value={composerMessage}
                                        onChange={(e) => setComposerMessage(e.target.value)}
                                        placeholder="Type notice message here..."
                                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-[13px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] focus:outline-hidden transition-all shadow-2xs resize-y min-h-[160px]"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowComposer(false)}
                                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSendNotice}
                                        disabled={sendingNotice || !composerMessage.trim()}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded-lg cursor-pointer transition-all duration-150 shadow-2xs disabled:opacity-50"
                                    >
                                        {sendingNotice ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-3.5 h-3.5" />
                                                <span>Send Notice</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {loadingDetail ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
                                <RefreshCw className="w-5 h-5 animate-spin text-[#4085b3] mb-2" />
                                <span>Loading attendance history...</span>
                            </div>
                        ) : studentDetail ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Summary Metric Cards */}
                                <div className="p-4 border-b border-slate-100 bg-white">
                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Days</p>
                                            <p className="font-bold text-slate-900 text-base mt-0.5">{studentDetail.stats.totalSessions}</p>
                                        </div>
                                        <div className="p-2.5 bg-blue-50/60 border border-blue-200/60 rounded-xl">
                                            <p className="text-[10px] font-medium text-[#4085b3] uppercase tracking-wider">Present</p>
                                            <p className="font-bold text-[#4085b3] text-base mt-0.5">{studentDetail.stats.presentCount}</p>
                                        </div>
                                        <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                                            <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Late</p>
                                            <p className="font-bold text-amber-700 text-base mt-0.5">{studentDetail.stats.lateCount}</p>
                                        </div>
                                        <div className="p-2.5 bg-rose-50/60 border border-rose-200/60 rounded-xl">
                                            <p className="text-[10px] font-medium text-rose-600 uppercase tracking-wider">Absent</p>
                                            <p className="font-bold text-rose-700 text-base mt-0.5">{studentDetail.stats.absentCount}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Drawer Filter & Export Toolbar */}
                                <div className="p-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        {/* Period Dropdown */}
                                        <select
                                            value={drawerTimeframeFilter}
                                            onChange={(e) => setDrawerTimeframeFilter(e.target.value)}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer shadow-2xs"
                                        >
                                            <option value="ALL">All Dates ({studentDetail.records.length})</option>
                                            <option value="THIS_WEEK">This Week</option>
                                            <option value="THIS_MONTH">This Month</option>
                                        </select>

                                        {/* Status Dropdown */}
                                        <select
                                            value={drawerStatusFilter}
                                            onChange={(e) => setDrawerStatusFilter(e.target.value)}
                                            className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#4085b3] cursor-pointer shadow-2xs"
                                        >
                                            <option value="ALL">All Statuses</option>
                                            <option value="ABSENT">Absent Only</option>
                                            <option value="LATE">Late Only</option>
                                            <option value="PRESENT">Present Only</option>
                                            <option value="EXCUSED">Excused Only</option>
                                        </select>
                                    </div>

                                    {/* Export CSV Button */}
                                    <button
                                        type="button"
                                        onClick={handleExportStudentCSV}
                                        disabled={studentDetail.records.length === 0}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-all duration-150 cursor-pointer shadow-2xs disabled:opacity-40"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Export CSV</span>
                                    </button>
                                </div>

                                {/* Session Ledger Timeline */}
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-1">
                                    {filteredDrawerRecords.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400">
                                            <Calendar className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                                            <p className="text-xs font-semibold text-slate-600">No session records found</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">No attendance entries match your filter criteria.</p>
                                        </div>
                                    ) : (
                                        filteredDrawerRecords.map((rec) => (
                                            <div key={rec.id} className="p-2.5 rounded-lg hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800">
                                                        {formatDateDisplay(rec.date)}
                                                    </p>
                                                    {rec.remarks ? (
                                                        <p className="text-[11px] text-slate-500 truncate mt-0.5" title={rec.remarks}>
                                                            Remark: {rec.remarks}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400 italic mt-0.5">No remarks</p>
                                                    )}
                                                </div>
                                                <div className="shrink-0">
                                                    {statusBadge(rec.status)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Drawer Footer */}
                                <div className="p-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        Showing <strong>{filteredDrawerRecords.length}</strong> of <strong>{studentDetail.records.length}</strong> sessions
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEnrollmentId(null)}
                                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-all duration-150 cursor-pointer text-slate-700 shadow-2xs"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
