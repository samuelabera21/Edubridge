"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, GraduationCap, Megaphone, TriangleAlert } from "lucide-react";
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
        classPeriod: { name: string; startTime: string };
        teachingAssignment: { subject: { name: string }; teacher: { firstName: string; lastName: string } };
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

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#006b3f] to-sky-500 p-8 text-white shadow-lg">
                <div className="relative z-10">
                    <p className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-100">Student dashboard</p>
                    <h1 className="mb-2 text-3xl font-bold">Welcome back, {firstName}!</h1>
                    <p className="text-lg text-blue-100">{dashboard.enrollment.schoolGrade.grade.name} · Section {dashboard.enrollment.section?.name || "Not assigned"} · {dashboard.enrollment.academicYear.name}</p>
                </div>
                <GraduationCap className="absolute -bottom-10 -right-10 h-64 w-64 -rotate-12 text-white opacity-10" />
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <StatCard icon={<GraduationCap className="h-6 w-6" />} label="Student ID" value={dashboard.student.studentId} color="blue" />
                <StatCard icon={<CheckCircle2 className="h-6 w-6" />} label="Attendance" value={attendanceLabel} color="green" />
                <StatCard icon={<Clock className="h-6 w-6" />} label="Pending activities" value={String(dashboard.upcomingActivities.length)} color="amber" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                        <h2 className="font-semibold text-gray-900">Today&apos;s classes</h2>
                        <Link href="/dashboard/student/classes" className="text-sm font-medium text-[#006b3f]">View classes</Link>
                    </div>
                    <div className="space-y-3 p-6">
                        {dashboard.todayClasses.length === 0 ? <Empty text="No classes are scheduled today." /> : dashboard.todayClasses.map((item) => (
                            <div key={item.id} className="flex items-start gap-4 rounded-lg border border-gray-100 p-4">
                                <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-500">{item.classPeriod.startTime}</div>
                                <div><p className="font-semibold text-gray-900">{item.teachingAssignment.subject.name}</p><p className="mt-1 text-sm text-gray-500">{item.teachingAssignment.teacher.firstName} {item.teachingAssignment.teacher.lastName} · {item.classPeriod.name}</p></div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4"><h2 className="font-semibold text-gray-900">Upcoming activities</h2></div>
                    <div className="space-y-3 p-6">
                        {dashboard.upcomingActivities.length === 0 ? <Empty text="No upcoming activities." /> : dashboard.upcomingActivities.map((activity) => (
                            <div key={activity.id} className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900"><p className="font-semibold">{activity.title}</p><p className="mt-1">{activity.teachingAssignment.subject.name} · {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString() : "No due date"}</p></div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="rounded-xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4"><h2 className="font-semibold text-gray-900">Recent results</h2><FileText className="h-5 w-5 text-gray-400" /></div>
                    <div className="divide-y divide-gray-100">
                        {dashboard.recentResults.length === 0 ? <Empty text="No published results yet." /> : dashboard.recentResults.map((result) => <div key={result.id} className="flex items-center justify-between gap-4 px-6 py-4"><div><p className="font-medium text-gray-900">{result.title}</p><p className="text-sm text-gray-500">{result.subject}</p></div><p className="font-semibold text-[#006b3f]">{result.percentage}%</p></div>)}
                    </div>
                </section>

                <div className="space-y-6">
                    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-6 py-4"><h2 className="flex items-center gap-2 font-semibold text-gray-900"><Megaphone className="h-4 w-4" /> Announcements</h2></div>
                        <div className="space-y-3 p-6">{dashboard.announcements.length === 0 ? <Empty text="No announcements." /> : dashboard.announcements.slice(0, 3).map((item) => <div key={item.id}><p className="font-medium text-gray-900">{item.title}</p><p className="mt-1 text-sm text-gray-500">{item.content}</p></div>)}</div>
                    </section>
                    {dashboard.supportFlags.length > 0 && <div className="rounded-xl border border-amber-100 bg-amber-50 p-6 text-amber-900"><h2 className="flex items-center gap-2 font-semibold"><TriangleAlert className="h-4 w-4" /> Needs attention</h2><p className="mt-2 text-sm">You have {dashboard.supportFlags.length} active support notification{dashboard.supportFlags.length === 1 ? "" : "s"}.</p></div>}
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
    return <div className="flex items-center space-x-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"><div className={`rounded-lg p-3 ${colors[color]}`}>{icon}</div><div><p className="text-sm font-medium text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p></div></div>;
}
