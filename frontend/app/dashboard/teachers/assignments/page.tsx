"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Plus, Search, ClipboardList, Settings2, Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

export default function TeachingAssignmentsPage() {
    const router = useRouter();
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => ["ADMIN", "SCHOOL_ADMIN", "ACADEMIC:MANAGE", "TEACHER:ASSIGN"].includes(p.permission.name))
    );

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Years to find active
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            // 2. Fetch Assignments
            const assignRes = await fetchApi("/teacher/assignments");
            if (!assignRes.ok) throw new Error("Failed to load assignments");
            const assignData = await assignRes.json();
            
            setAssignments(Array.isArray(assignData) ? assignData : []);
            
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while fetching assignments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Calculate teacher workloads
    const teacherWorkloads = useMemo(() => {
        const map: { [teacherId: string]: { name: string; staffCode?: string; totalPeriods: number; count: number } } = {};

        assignments.forEach(a => {
            if (!a.teacherId) return;
            if (!map[a.teacherId]) {
                map[a.teacherId] = {
                    name: a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : "Unknown Teacher",
                    staffCode: a.teacher?.staffIdCode || a.teacher?.employeeId,
                    totalPeriods: 0,
                    count: 0
                };
            }
            map[a.teacherId].totalPeriods += (a.periodsPerWeek || 5);
            map[a.teacherId].count += 1;
        });

        return map;
    }, [assignments]);

    // Metrics
    const uniqueTeachersCount = Object.keys(teacherWorkloads).length;
    const totalWeeklyPeriods = assignments.reduce((acc, curr) => acc + (curr.periodsPerWeek || 5), 0);
    const avgWorkload = uniqueTeachersCount > 0 ? (totalWeeklyPeriods / uniqueTeachersCount).toFixed(1) : "0";
    const overloadedCount = Object.values(teacherWorkloads).filter(t => t.totalPeriods > 24).length;

    // Filter
    const filteredAssignments = assignments.filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const teacherName = a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}`.toLowerCase() : "";
        const subjectName = a.subject?.name ? a.subject.name.toLowerCase() : "";
        return teacherName.includes(q) || subjectName.includes(q);
    });

    if (loading && years.length === 0) {
        return <LoadingState message="Loading teaching assignments & workload metrics..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    if (!activeYear) {
        return (
            <div className="space-y-6 text-black">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center">
                            <ClipboardList className="w-6 h-6 mr-2 text-[#006b3f]" />
                            Teaching Assignments
                        </h1>
                    </div>
                </div>
                <EmptyState 
                    title="No Active Academic Year" 
                    message="You must have an active academic year to view and manage teaching assignments." 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ClipboardList className="w-7 h-7 text-[#006b3f]" />
                        <span>Class & Teaching Workload Governance</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Managing assignments & period workloads for <span className="font-semibold text-[#006b3f]">{activeYear.name}</span>
                    </p>
                </div>
                {hasCreatePermission && (
                    <Button 
                        onClick={() => router.push("/dashboard/teachers/assignments/manage")}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="bg-[#006b3f] hover:bg-[#005432]"
                    >
                        Assign Teacher to Classes
                    </Button>
                )}
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Assigned Faculty</p>
                            <p className="text-xl font-bold text-gray-900">{uniqueTeachersCount}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Weekly Periods</p>
                            <p className="text-xl font-bold text-gray-900">{totalWeeklyPeriods}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Avg Workload</p>
                            <p className="text-xl font-bold text-gray-900">{avgWorkload} <span className="text-xs text-gray-500 font-normal">p/wk</span></p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Overloaded (&gt;24 p/wk)</p>
                            <p className="text-xl font-bold text-amber-800">{overloadedCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {assignments.length === 0 ? (
                <EmptyState 
                    title="No Assignments Found" 
                    message={`There are no teachers assigned to classes for the ${activeYear.name} academic year.`} 
                />
            ) : (
                <Card className="shadow-sm">
                    <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-base font-bold text-gray-900">Current Faculty Assignments</CardTitle>
                        <div className="flex items-center space-x-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search teacher or subject..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => router.push("/dashboard/teachers/assignments/manage")}
                                leftIcon={<Settings2 className="w-4 h-4" />}
                            >
                                Assignment Manager
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Teacher</th>
                                        <th className="px-6 py-3.5 font-semibold">Subject</th>
                                        <th className="px-6 py-3.5 font-semibold">Grade & Section</th>
                                        <th className="px-6 py-3.5 font-semibold">Weekly Load</th>
                                        <th className="px-6 py-3.5 font-semibold">Teacher Workload Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredAssignments.map((assignment) => {
                                        const teacherStats = teacherWorkloads[assignment.teacherId];
                                        const totalPeriods = teacherStats?.totalPeriods || assignment.periodsPerWeek || 5;

                                        let statusBadge = (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                OPTIMAL ({totalPeriods} p/wk)
                                            </span>
                                        );
                                        if (totalPeriods > 24) {
                                            statusBadge = (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                    OVERLOADED ({totalPeriods} p/wk)
                                                </span>
                                            );
                                        } else if (totalPeriods < 12) {
                                            statusBadge = (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                    UNDERLOADED ({totalPeriods} p/wk)
                                                </span>
                                            );
                                        }

                                        return (
                                            <tr key={assignment.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">
                                                        {assignment.teacher?.firstName} {assignment.teacher?.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{assignment.teacher?.staffIdCode || assignment.teacher?.employeeId || "Staff Member"}</p>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {assignment.subject?.name || "Subject"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    <span className="font-medium text-gray-900">{assignment.schoolGrade?.grade?.name || "Grade"}</span>
                                                    {" — "}
                                                    <span className="text-[#006b3f] font-semibold">{assignment.section ? `Section ${assignment.section.name}` : "All Sections"}</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                                                        {assignment.periodsPerWeek || 5} Periods/Wk
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {statusBadge}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => router.push(`/dashboard/teachers/assignments/manage?teacherId=${assignment.teacherId}`)}
                                                    >
                                                        Manage
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
