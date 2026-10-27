"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    Megaphone,
    Settings,
    TriangleAlert,
    UserRound,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { fetchApi } from "../../../lib/api";
import { useStudentLanguage } from "../../../lib/student-i18n";

type DashboardData = {
    student: { studentId: string; name: string };
    enrollment: {
        academicYear: { name: string };
        schoolGrade: { grade: { name: string } };
        section: { name: string } | null;
    };
    todayClasses: Array<{
        id: string;
        dayOfWeek?: number;
        classPeriod: { name: string; startTime: string; endTime?: string };
        teachingAssignment: {
            subject: { name: string; code?: string };
            teacher: { firstName: string; lastName: string };
        };
        room?: { name: string } | null;
    }>;
    weeklyClasses?: Array<{
        id: string;
        dayOfWeek: number;
        classPeriod: { name: string; startTime: string; endTime: string };
        teachingAssignment: {
            subject: { name: string; code?: string };
            teacher: { firstName: string; lastName: string };
        };
        room?: { name: string } | null;
    }>;
    subjects?: Array<{
        id: string;
        subject: { id: string; name: string; code?: string };
        teacher: {
            id: string;
            firstName: string;
            lastName: string;
            email?: string;
            phoneNumber?: string;
        };
        section?: { id: string; name: string } | null;
        periodsPerWeek?: number;
    }>;
    attendance: { rate: number | null };
    recentResults: Array<{ id: string; title: string; subject: string; percentage: number }>;
    upcomingActivities: Array<{
        id: string;
        title: string;
        dueDate: string | null;
        teachingAssignment: { subject: { name: string } };
    }>;
    announcements: Array<{ id: string; title: string; content: string }>;
    supportFlags: Array<{ id: string; description: string }>;
};

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTeacherName(firstName?: string, lastName?: string) {
    const parts = [firstName, lastName].filter(Boolean);
    if (!parts.length) return "Assigned Teacher";
    return parts
        .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
        .join(" ");
}

export default function StudentDashboard() {
    const { t } = useStudentLanguage();
    const { authData } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setProfilePhoto(localStorage.getItem("student_profile_photo"));
        }
        const handlePhotoChange = (e: any) => {
            setProfilePhoto(e.detail || null);
        };
        window.addEventListener("studentProfilePhotoChanged", handlePhotoChange);
        return () => window.removeEventListener("studentProfilePhotoChanged", handlePhotoChange);
    }, []);

    useEffect(() => {
        async function loadDashboard() {
            try {
                const response = await fetchApi("/student/dashboard");
                if (!response.ok) throw new Error("Dashboard request failed");
                setDashboard(await response.json());
            } catch {
                setError("We could not load your dashboard right now.");
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-6xl p-4 animate-pulse text-slate-500 font-sans text-sm">
                Loading your dashboard...
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="mx-auto w-full max-w-6xl p-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 text-sm">
                    {error || "Student dashboard data not found."}
                </div>
            </div>
        );
    }

    const firstName = authData?.user?.name?.split(" ")[0] || dashboard.student.name.split(" ")[0];
    const attendanceLabel = dashboard.attendance.rate === null ? "No records" : `${dashboard.attendance.rate}%`;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.goodAfternoon : t.goodEvening;
    const gradeName = dashboard.enrollment.schoolGrade?.grade?.name || "Grade";
    const sectionName = dashboard.enrollment.section?.name ? `Section ${dashboard.enrollment.section.name}` : "Section not assigned";
    const academicYear = dashboard.enrollment.academicYear?.name || "Current academic year";
    const todayName = WEEKDAY_NAMES[new Date().getDay()];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 p-2 sm:p-4 font-sans text-slate-800">
            {/* ─── GREETING SECTION (Clean White, No Color, Responsive) ─── */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs text-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3.5 sm:space-x-4">
                        {profilePhoto ? (
                            <img
                                src={profilePhoto}
                                alt="Student avatar"
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-slate-200 shadow-xs shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg shrink-0">
                                {firstName ? firstName[0].toUpperCase() : "S"}
                            </div>
                        )}
                        <div>
                            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.studentPortal || "Student Portal"}</p>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{greeting}, {firstName}!</h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{gradeName} · {sectionName} · {academicYear}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Student ID</p>
                            <p className="text-xs font-bold text-slate-800 tabular-nums">{dashboard.student.studentId}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Academic Year</p>
                            <p className="text-xs font-bold text-slate-800">{academicYear}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── METRIC STAT CARDS (Clean White Style, No Blue Hover Fill) ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <StatCard icon={<GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />} label="Student ID" value={dashboard.student.studentId} href="/dashboard/student/profile" />
                <StatCard icon={<BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />} label={t.assignedSubjects || "Assigned Subjects"} value={String(dashboard.subjects?.length ?? 0)} href="/dashboard/student/results" />
                <StatCard icon={<CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />} label="Attendance" value={attendanceLabel} href="/dashboard/student/attendance" />
                <StatCard icon={<FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />} label={t.academicResults || "Academic Results"} value="View Marks" href="/dashboard/student/results" />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
                {/* Left Column (2 cols) */}
                <div className="space-y-5 sm:space-y-6 lg:col-span-2">
                    
                    {/* Class Schedule Section */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-700" />
                                <h2 className="text-sm sm:text-base font-bold text-slate-900">Today&apos;s Schedule</h2>
                            </div>
                            <Link href="/dashboard/student/timetable" className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline">
                                Full timetable →
                            </Link>
                        </div>
                        <div className="p-4 sm:p-6">
                            {dashboard.todayClasses.length > 0 ? (
                                <div className="space-y-2.5 sm:space-y-3">
                                    {dashboard.todayClasses.map((item) => (
                                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:shadow-xs transition-all duration-150">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {item.teachingAssignment.subject.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.teachingAssignment.subject.name}</p>
                                                    <p className="text-[11px] text-slate-500 truncate">
                                                        {formatTeacherName(item.teachingAssignment.teacher.firstName, item.teachingAssignment.teacher.lastName)}
                                                        {item.room?.name ? ` · Room ${item.room.name}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                                                {item.classPeriod.startTime} {item.classPeriod.endTime ? `- ${item.classPeriod.endTime}` : ""}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 text-xs text-slate-700">
                                        <p className="font-bold text-slate-900">No classes scheduled for today ({todayName}).</p>
                                        <p className="mt-0.5 text-slate-500 text-[11px]">
                                            Check your weekly schedule preview below or open the full timetable.
                                        </p>
                                    </div>

                                    {dashboard.weeklyClasses && dashboard.weeklyClasses.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weekly schedule preview</p>
                                            <div className="grid gap-2.5 sm:grid-cols-2">
                                                {dashboard.weeklyClasses.slice(0, 4).map((item) => (
                                                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-xs transition-all duration-150">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                                {WEEKDAY_NAMES[item.dayOfWeek] || `Day ${item.dayOfWeek}`}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 font-medium">
                                                                {item.classPeriod.startTime}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1.5 text-xs font-bold text-slate-900 truncate">{item.teachingAssignment.subject.name}</p>
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            {formatTeacherName(item.teachingAssignment.teacher.firstName, item.teachingAssignment.teacher.lastName)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <Empty text="No classes are currently scheduled for this week." />
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Enrolled Subjects & Teachers Section (Functional & Clickable to Results) */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-slate-700" />
                                <h2 className="text-sm sm:text-base font-bold text-slate-900">Enrolled Subjects &amp; Teachers</h2>
                            </div>
                            <Link href="/dashboard/student/results" className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline">
                                View marks →
                            </Link>
                        </div>
                        <div className="p-4 sm:p-6">
                            {!dashboard.subjects || dashboard.subjects.length === 0 ? (
                                <Empty text="No subjects or teachers have been assigned to your section yet." />
                            ) : (
                                <div className="grid gap-2.5 sm:gap-3.5 sm:grid-cols-2">
                                    {dashboard.subjects.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/dashboard/student/results?subject=${encodeURIComponent(item.subject.name)}`}
                                            className="block rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:shadow-xs transition-all duration-150 group"
                                            title={`Click to view results for ${item.subject.name}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-slate-950 transition-colors truncate">
                                                        {item.subject.name}
                                                    </h3>
                                                    {item.subject.code && (
                                                        <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                                                            {item.subject.code}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 shrink-0">
                                                    {item.periodsPerWeek ? `${item.periodsPerWeek}p/wk` : "Enrolled"}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                                                    {item.teacher.firstName ? item.teacher.firstName.charAt(0).toUpperCase() : <UserRound className="h-3.5 w-3.5" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                                        {formatTeacherName(item.teacher.firstName, item.teacher.lastName)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        Click to view subject marks →
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Recent results */}
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                                <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Results</h2>
                            </div>
                            <Link href="/dashboard/student/results" className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline">
                                View all marks →
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {dashboard.recentResults.length === 0 ? (
                                <div className="p-6"><Empty text="No published results yet." /></div>
                            ) : (
                                dashboard.recentResults.map((result) => (
                                    <Link
                                        key={result.id}
                                        href="/dashboard/student/results"
                                        className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors group block"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{result.title}</p>
                                            <p className="text-xs text-slate-500 truncate">{result.subject}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-sm text-slate-900 tabular-nums">{result.percentage}%</p>
                                            <span className="text-[10px] text-slate-400">Recorded</span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column (1 col) */}
                <div className="space-y-5 sm:space-y-6">
                    {/* Announcements */}
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4">
                            <h2 className="flex items-center gap-2 font-bold text-sm sm:text-base text-slate-900">
                                <Megaphone className="h-4 w-4 text-slate-700" /> Announcements
                            </h2>
                            <Link href="/dashboard/student/communication/announcements" className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline">
                                View all
                            </Link>
                        </div>
                        <div className="space-y-2 p-3 sm:p-4">
                            {dashboard.announcements.length === 0 ? (
                                <Empty text="No announcements." />
                            ) : (
                                dashboard.announcements.slice(0, 3).map((item) => (
                                    <Link
                                        key={item.id}
                                        href="/dashboard/student/communication/announcements"
                                        className="block rounded-xl p-3 transition-colors hover:bg-slate-50 border border-slate-100 hover:border-slate-200 group"
                                    >
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.title}</p>
                                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">{item.content}</p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Needs attention / Early Warning Flags */}
                    {dashboard.supportFlags.length > 0 && (
                        <div className="space-y-2.5">
                            {dashboard.supportFlags.map((flag) => {
                                const isRed = flag.description.includes("[RED]");
                                const titleLine = flag.description.split("\n")[0].replace(/^\[(RED|YELLOW)\]\s*/, "");
                                const detailLines = flag.description.split("\n").slice(1).join("\n").trim();

                                return (
                                    <div 
                                        key={flag.id} 
                                        className={`rounded-xl border p-3.5 text-xs ${
                                            isRed 
                                                ? "border-rose-200 bg-rose-50 text-rose-950" 
                                                : "border-amber-200 bg-amber-50 text-amber-950"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                                            <TriangleAlert className={`h-4 w-4 ${isRed ? "text-rose-600" : "text-amber-600"}`} />
                                            <span>{titleLine || "የክትትል ማሳሰቢያ (Academic & Attendance Alert)"}</span>
                                        </div>
                                        {detailLines && (
                                            <p className="mt-1 whitespace-pre-line text-slate-700 leading-relaxed text-[11px]">
                                                {detailLines}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="text-xs text-slate-400 py-2">{text}</p>;
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
    const cardContent = (
        <div className="border border-slate-200 bg-white rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200 group">
            <div className="flex items-start justify-between gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 truncate">
                    {label}
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    {icon}
                </div>
            </div>
            <div>
                <span className="text-lg sm:text-2xl font-bold text-slate-900 tabular-nums truncate block">
                    {value}
                </span>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{cardContent}</Link>;
    }
    return cardContent;
}
