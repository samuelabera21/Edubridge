"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Plus, Filter, ClipboardList, Settings2 } from "lucide-react";
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
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "ACADEMIC:MANAGE")
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
            
            setAssignments(assignData);
            
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading && years.length === 0) {
        return <LoadingState message="Loading teaching assignments..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    if (!activeYear) {
        return (
            <div className="space-y-6">
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <ClipboardList className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Teaching Assignments
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Managing assignments for <span className="font-semibold text-[#006b3f]">{activeYear.name}</span>
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

            {assignments.length === 0 ? (
                <EmptyState 
                    title="No Assignments Found" 
                    message={`There are no teachers assigned to classes for the ${activeYear.name} academic year.`} 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Current School Assignments</CardTitle>
                        <div className="flex space-x-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => router.push("/dashboard/teachers/assignments/manage")}
                                leftIcon={<Settings2 className="w-4 h-4" />}
                            >
                                Multi-Section Assignment Manager
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Teacher</th>
                                        <th className="px-6 py-3 font-semibold">Subject</th>
                                        <th className="px-6 py-3 font-semibold">Grade</th>
                                        <th className="px-6 py-3 font-semibold">Section</th>
                                        <th className="px-6 py-3 font-semibold">Weekly Periods</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {assignments.map((assignment) => (
                                        <tr key={assignment.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    {assignment.teacher?.firstName} {assignment.teacher?.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500">{assignment.teacher?.staffIdCode}</p>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {assignment.subject?.name || "Unknown Subject"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {assignment.schoolGrade?.grade?.name || "Unknown Grade"} 
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                {assignment.section ? `Section ${assignment.section.name}` : "All Sections"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                                                    {assignment.periodsPerWeek || 5} Periods/Wk
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => router.push(`/dashboard/teachers/assignments/manage?teacherId=${assignment.teacherId}`)}
                                                >
                                                    Manage Teacher
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
