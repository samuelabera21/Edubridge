"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock,
    FileText,
    GraduationCap,
    Megaphone,
    TriangleAlert,
    UserRound,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { fetchApi } from "../../../lib/api";

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
    const { authData } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        return <div className="mx-auto w-full max-w-6xl animate-pulse text-gray-500">Loading your dashboard...</div>;
    }

    if (error || !dashboard) {
        return <div className="mx-auto w-full max-w-6xl rounded-xl border border-red-100 bg-red-50 p-6 text-red-700">{error || "Student dashboard data not found."}</div>;
    }

    const firstName = authData?.user?.name?.split(" ")[0] || dashboard.student.name.split(" ")[0];
    const attendanceLabel = dashboard.attendance.rate === null ? "No records" : `${dashboard.attendance.rate}%`;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const gradeName = dashboard.enrollment.schoolGrade?.grade?.name || "Grade";
    const sectionName = dashboard.enrollment.section?.name ? `Section ${dashboard.enrollment.section.name}` : "Section not assigned";
    const academicYear = dashboard.enrollment.academicYear?.name || "Current academic year";
    const todayName = WEEKDAY_NAMES[new Date().getDay()];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <section className="relative overflow-hidden rounded-2xl bg-[#184973] p-8 text-white shadow-lg">
                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-100">Student dashboard</p>
                        <h1 className="mb-2 text-3xl font-bold">{greeting}, {firstName}!</h1>
                        <p className="text-lg text-blue-100">{gradeName} · {sectionName} · {academicYear}</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[10px] uppercase tracking-wide text-blue-100">Student ID</p>
                            <p className="text-sm font-bold text-white">{dashboard.student.studentId}</p>
                        </div>
                        <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[10px] uppercase tracking-wide text-blue-100">Academic year</p>
                            <p className="text-sm font-bold text-white">{academicYear}</p>
                        </div>
                    </div>
                </div>
                <GraduationCap className="absolute -bottom-10 -right-10 h-64 w-64 -rotate-12 text-white opacity-10" />
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<GraduationCap className="h-6 w-6" />} label="Student ID" value={dashboard.student.studentId} color="blue" />
                <StatCard icon={<BookOpen className="h-6 w-6" />} label="Enrolled subjects" value={String(dashboard.subjects?.length ?? 0)} color="blue" />
                <StatCard icon={<CheckCircle2 className="h-6 w-6" />} label="Attendance" value={attendanceLabel} color="green" />
                <StatCard icon={<Clock className="h-6 w-6" />} label="Pending activities" value={String(dashboard.upcomingActivities.length)} color="amber" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column (2 cols) */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Class Schedule Section */}
                    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-[#006b3f]" />
                                <h2 className="font-semibold text-gray-900">Today&apos;s classes &amp; schedule</h2>
                            </div>
                            <Link href="/dashboard/student/timetable" className="text-sm font-medium text-[#006b3f] hover:underline">
                                View full timetable →
                            </Link>
                        </div>
                        <div className="p-6">
                            {dashboard.todayClasses.length > 0 ? (
                                <div className="space-y-3">
                                    {dashboard.todayClasses.map((item) => (
                                        <div key={item.id} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:bg-gray-50">
                                            <div className="w-28 flex-shrink-0 text-sm font-semibold text-[#006b3f]">
                                                {item.classPeriod.startTime} {item.classPeriod.endTime ? `- ${item.classPeriod.endTime}` : ""}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{item.teachingAssignment.subject.name}</p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {formatTeacherName(item.teachingAssignment.teacher.firstName, item.teachingAssignment.teacher.lastName)} · {item.classPeriod.name}
                                                    {item.room?.name ? ` · Room ${item.room.name}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                                        <p className="font-semibold">No classes scheduled for today ({todayName}).</p>
                                        <p className="mt-1 text-xs text-emerald-700">
                                            Below is your weekly schedule preview. You can also view the full timetable.
                                        </p>
                                    </div>

                                    {dashboard.weeklyClasses && dashboard.weeklyClasses.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Weekly schedule preview</p>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {dashboard.weeklyClasses.map((item) => (
                                                    <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 hover:border-gray-200 transition">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                                                {WEEKDAY_NAMES[item.dayOfWeek] || `Day ${item.dayOfWeek}`}
                                                            </span>
                                                            <span className="text-xs font-medium text-gray-500">
                                                                {item.classPeriod.name} ({item.classPeriod.startTime}{item.classPeriod.endTime ? ` - ${item.classPeriod.endTime}` : ""})
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-sm font-semibold text-gray-900">{item.teachingAssignment.subject.name}</p>
                                                        <p className="mt-0.5 text-xs text-gray-600">
                                                            Teacher: {formatTeacherName(item.teachingAssignment.teacher.firstName, item.teachingAssignment.teacher.lastName)}
                                                        </p>
                                                        {item.room?.name && (
                                                            <p className="mt-1 text-[11px] text-gray-400">Room: {item.room.name}</p>
                                                        )}
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

                    {/* Enrolled Subjects & Teachers Section */}
                    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-[#006b3f]" />
                                <h2 className="font-semibold text-gray-900">Enrolled subjects &amp; teachers</h2>
                            </div>
                            <Link href="/dashboard/student/classes/subjects" className="text-sm font-medium text-[#006b3f] hover:underline">
                                View all →
                            </Link>
                        </div>
                        <div className="p-6">
                            {!dashboard.subjects || dashboard.subjects.length === 0 ? (
                                <Empty text="No subjects or teachers have been assigned to your section yet." />
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {dashboard.subjects.map((item) => (
                                        <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-emerald-200 transition">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{item.subject.name}</h3>
                                                    {item.subject.code && (
                                                        <span className="mt-0.5 inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                                            {item.subject.code}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.periodsPerWeek ? (
                                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                        {item.periodsPerWeek} periods/wk
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-4 flex items-center gap-3 border-t border-gray-50 pt-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                                                    {item.teacher.firstName ? item.teacher.firstName.charAt(0).toUpperCase() : <UserRound className="h-4 w-4" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {formatTeacherName(item.teacher.firstName, item.teacher.lastName)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {item.teacher.email || item.teacher.phoneNumber || "Assigned Teacher"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Recent results */}
                    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <h2 className="font-semibold text-gray-900">Recent results</h2>
                            <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {dashboard.recentResults.length === 0 ? (
                                <div className="p-6"><Empty text="No published results yet." /></div>
                            ) : (
                                dashboard.recentResults.map((result) => (
                                    <div key={result.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{result.title}</p>
                                            <p className="text-sm text-gray-500">{result.subject}</p>
                                        </div>
                                        <p className="font-semibold text-[#006b3f]">{result.percentage}%</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column (1 col) */}
                <div className="space-y-6">
                    {/* Upcoming activities */}
                    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h2 className="font-semibold text-gray-900">Upcoming activities</h2>
                        </div>
                        <div className="space-y-3 p-6">
                            {dashboard.upcomingActivities.length === 0 ? (
                                <Empty text="No upcoming activities." />
                            ) : (
                                dashboard.upcomingActivities.map((activity) => (
                                    <div key={activity.id} className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
                                        <p className="font-semibold">{activity.title}</p>
                                        <p className="mt-1">
                                            {activity.teachingAssignment.subject.name} ·{" "}
                                            {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString() : "No due date"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Announcements */}
                    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                                <Megaphone className="h-4 w-4 text-[#006b3f]" /> Announcements
                            </h2>
                            <Link href="/dashboard/student/communication" className="text-xs font-semibold text-[#006b3f] hover:underline">
                                View all
                            </Link>
                        </div>
                        <div className="space-y-3 p-6">
                            {dashboard.announcements.length === 0 ? (
                                <Empty text="No announcements." />
                            ) : (
                                dashboard.announcements.slice(0, 3).map((item) => (
                                    <Link
                                        key={item.id}
                                        href="/dashboard/student/communication"
                                        className="block rounded-lg p-2 transition-colors hover:bg-slate-50"
                                    >
                                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.content}</p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Needs attention */}
                    {dashboard.supportFlags.length > 0 && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-6 text-amber-900">
                            <h2 className="flex items-center gap-2 font-semibold">
                                <TriangleAlert className="h-4 w-4" /> Needs attention
                            </h2>
                            <p className="mt-2 text-sm">
                                You have {dashboard.supportFlags.length} active support notification
                                {dashboard.supportFlags.length === 1 ? "" : "s"}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="text-sm text-gray-500">{text}</p>;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "blue" | "green" | "amber" }) {
    const colors = { blue: "bg-blue-50 text-[#006b3f]", green: "bg-green-50 text-green-600", amber: "bg-amber-50 text-amber-600" };
    return (
        <div className="flex items-center space-x-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className={`rounded-lg p-3 ${colors[color]}`}>{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
