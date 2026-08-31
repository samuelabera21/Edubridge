"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ClipboardCheck, 
    Users, 
    UserCheck, 
    XCircle, 
    AlertTriangle, 
    CheckCircle2, 
    Calendar, 
    ArrowRight,
    TrendingUp,
    Clock,
    School
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

export default function AttendanceOverviewPage() {
    const router = useRouter();
    const { authData } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );

    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Active Year
            const yearsRes = await fetchApi("/academic/years");
            if (yearsRes.ok) {
                const yearsData: AcademicYear[] = await yearsRes.json();
                const active = yearsData.find(y => y.status === "ACTIVE");
                setActiveYear(active || null);

                if (active) {
                    const gradesRes = await fetchApi(`/academic/years/${active.id}/grades`);
                    if (gradesRes.ok) {
                        const gradesData = await gradesRes.json();
                        setSchoolGrades(Array.isArray(gradesData) ? gradesData : []);
                    }
                }
            }

            // 2. Fetch Teacher Daily Attendance
            const teacherRes = await fetchApi(`/attendance/teacher/daily?date=${selectedDate}`);
            if (teacherRes.ok) {
                const teacherData = await teacherRes.json();
                setTeacherAttendance(Array.isArray(teacherData) ? teacherData : []);
            }

        } catch (err: any) {
            setError(err.message || "Failed to load attendance oversight dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    // Teacher Attendance Stats
    const totalTeachers = teacherAttendance.length;
    const teachersPresent = teacherAttendance.filter(t => t.attendance?.status === "PRESENT" || t.attendance?.status === "LATE").length;
    const teachersAbsent = teacherAttendance.filter(t => t.attendance?.status === "ABSENT").length;
    const teacherRate = totalTeachers > 0 ? ((teachersPresent / totalTeachers) * 100).toFixed(1) : "100.0";

    if (loading && teacherAttendance.length === 0) {
        return <LoadingState message="Loading daily attendance oversight..." />;
    }

    if (error && teacherAttendance.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ClipboardCheck className="w-7 h-7 text-[#006b3f]" />
                        <span>Executive Attendance Oversight</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Daily attendance metrics, faculty check-in status, and absence risk governance.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white shadow-sm"
                    />
                </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="cursor-pointer" onClick={() => router.push("/dashboard/attendance/alerts")}>
                    <Card className="bg-gradient-to-r from-red-50 to-amber-50 border-red-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> HIGH PRIORITY
                                </span>
                                <h3 className="text-lg font-bold text-gray-900">Repeated Absence Alerts Hub</h3>
                                <p className="text-xs text-gray-600">Review students absent 3+ consecutive days & log parent interventions.</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-red-600" />
                        </CardContent>
                    </Card>
                </div>

                <div className="cursor-pointer" onClick={() => router.push("/dashboard/attendance/corrections")}>
                    <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PRINCIPAL OVERRIDE
                                </span>
                                <h3 className="text-lg font-bold text-gray-900">Official Attendance Corrections</h3>
                                <p className="text-xs text-gray-600">Authorize medical excuses & view principal override audit logs.</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-emerald-600" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Overall Summary KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Student Rate Today</p>
                            <p className="text-xl font-bold text-gray-900">94.8%</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Faculty Present</p>
                            <p className="text-xl font-bold text-gray-900">{teachersPresent} / {totalTeachers || 12}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Faculty Rate</p>
                            <p className="text-xl font-bold text-gray-900">{teacherRate}%</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/60 border-red-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Faculty Absent</p>
                            <p className="text-xl font-bold text-red-800">{teachersAbsent}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Faculty Attendance Summary Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Faculty Daily Check-in Roster ({selectedDate})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/attendance/teacher")}>
                        View Full Teacher Roster
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {teacherAttendance.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p className="font-semibold text-gray-700">No teacher attendance records logged for {selectedDate}</p>
                            <p className="text-xs text-gray-400 mt-1">Open Teacher Attendance to record daily check-in statuses.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Teacher Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Staff Code</th>
                                        <th className="px-6 py-3.5 font-semibold">Status Today</th>
                                        <th className="px-6 py-3.5 font-semibold">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teacherAttendance.map((item) => (
                                        <tr key={item.teacher.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {item.teacher.firstName} {item.teacher.lastName}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-gray-600">
                                                {item.teacher.staffIdCode || item.teacher.employeeId || "TCH-STAFF"}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.attendance?.status === "PRESENT" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        PRESENT
                                                    </span>
                                                ) : item.attendance?.status === "LATE" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        LATE
                                                    </span>
                                                ) : item.attendance?.status === "ABSENT" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                        ABSENT
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        NOT LOGGED
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {item.attendance?.remarks || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
