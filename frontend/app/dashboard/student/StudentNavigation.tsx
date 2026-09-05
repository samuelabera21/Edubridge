"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    BarChart3,
    Bell,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    FileText,
    GraduationCap,
    HeartHandshake,
    LayoutDashboard,
    MessageSquare,
    Sparkles,
    User,
} from "lucide-react";
import { useState } from "react";
import StudentSubNavigation, { type StudentNavGroup } from "./components/StudentSubNavigation";

const studentNavGroups: StudentNavGroup[] = [
    {
        key: "profile",
        label: "My Profile",
        icon: User,
        links: [
            { label: "Student Information", href: "/dashboard/student/profile/information" },
            { label: "School and Enrollment", href: "/dashboard/student/profile/enrollment" },
        ],
    },
    {
        key: "classes",
        label: "My Classes",
        icon: BookOpen,
        links: [
            { label: "Subjects and Teachers", href: "/dashboard/student/classes/subjects" },
            { label: "Class Schedule", href: "/dashboard/student/classes/schedule" },
            { label: "Learning Resources", href: "/dashboard/student/classes/resources" },
        ],
    },
    {
        key: "attendance",
        label: "My Attendance",
        icon: ClipboardCheck,
        links: [
            { label: "Attendance History", href: "/dashboard/student/attendance" },
            { label: "Absence Records", href: "/dashboard/student/attendance" },
            { label: "Submit Explanation", href: "/dashboard/student/attendance/explanation" },
        ],
    },
    {
        key: "assessments",
        label: "My Assessments",
        icon: BarChart3,
        links: [
            { label: "Tests and Quizzes", href: "/dashboard/student/assessments" },
            { label: "Results and Feedback", href: "/dashboard/student/assessments/results" },
            { label: "Performance Trends", href: "/dashboard/student/assessments/performance" },
        ],
    },
    {
        key: "learning",
        label: "My Learning Activities",
        icon: Activity,
        links: [
            { label: "Assignments", href: "/dashboard/student/learning" },
            { label: "Practice and Quizzes", href: "/dashboard/student/learning" },
            { label: "Submitted Work", href: "/dashboard/student/learning/submissions" },
        ],
    },
    {
        key: "support",
        label: "My Support",
        icon: HeartHandshake,
        links: [
            { label: "Recommendations", href: "/dashboard/student/support" },
            { label: "Remedial Activities", href: "/dashboard/student/support" },
            { label: "Progress", href: "/dashboard/student/support" },
        ],
    },
    {
        key: "communication",
        label: "Communication",
        icon: MessageSquare,
        links: [
            { label: "Teacher Messages", href: "/dashboard/student/communication" },
            { label: "School Announcements", href: "/dashboard/student/communication" },
            { label: "Notifications", href: "/dashboard/student/communication" },
        ],
    },
    {
        key: "resources",
        label: "Learning Resources",
        icon: FileText,
        links: [
            { label: "Recommended Resources", href: "/dashboard/student/resources" },
            { label: "School Resources", href: "/dashboard/student/resources" },
            { label: "Approved External Links", href: "/dashboard/student/resources" },
        ],
    },
    {
        key: "assistant",
        label: "AI Study Assistant",
        icon: Sparkles,
        links: [
            { label: "Explain Concepts", href: "/dashboard/student/assistant" },
            { label: "Guided Practice", href: "/dashboard/student/assistant" },
            { label: "Study Planning", href: "/dashboard/student/assistant" },
        ],
    },
];

export default function StudentNavigation() {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        profile: pathname.startsWith("/dashboard/student/profile"),
        classes: pathname.startsWith("/dashboard/student/classes"),
        attendance: pathname.startsWith("/dashboard/student/attendance"),
        assessments: pathname.startsWith("/dashboard/student/assessments"),
        learning: pathname.startsWith("/dashboard/student/learning"),
        support: pathname.startsWith("/dashboard/student/support"),
        communication: pathname.startsWith("/dashboard/student/communication"),
        resources: pathname.startsWith("/dashboard/student/resources"),
        assistant: pathname.startsWith("/dashboard/student/assistant"),
    });

    const toggleGroup = (key: string) => {
        setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex overflow-y-auto text-gray-800">
            <div className="p-4 flex-1">
                <div className="mb-5 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#006b3f] flex items-center justify-center text-white shadow-sm">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">Student Workspace</p>
                        <p className="text-[10px] text-emerald-700 font-medium">Learning portal</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/dashboard/student"
                        className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/dashboard/student"
                                ? "bg-[#006b3f] text-white shadow-sm"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>My Dashboard</span>
                    </Link>

                    <Link
                        href="/dashboard/student/timetable"
                        className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isActive("/dashboard/student/timetable")
                                ? "bg-emerald-50 text-[#006b3f]"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                        <CalendarDays className="w-4 h-4" />
                        <span>Timetable</span>
                    </Link>

                    {studentNavGroups.map((group) => (
                        <StudentSubNavigation
                            key={group.key}
                            group={group}
                            isOpen={openGroups[group.key]}
                            pathname={pathname}
                            onToggle={toggleGroup}
                        />
                    ))}

                    <Link
                        href="/dashboard/student/notifications"
                        className={`flex items-center space-x-3 px-3.5 py-2.5 mt-2 rounded-xl text-xs font-bold transition-all ${
                            isActive("/dashboard/student/notifications")
                                ? "bg-emerald-50 text-[#006b3f]"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                        <Bell className="w-4 h-4" />
                        <span>Notifications</span>
                    </Link>
                </nav>
            </div>
        </aside>
    );
}
