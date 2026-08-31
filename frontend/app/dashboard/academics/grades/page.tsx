"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Plus, Filter, Users, School } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";
import Link from "next/link";
import { AddSectionModal } from "./components/AddSectionModal";

export default function GradesAndSectionsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [sectionModalState, setSectionModalState] = useState<{ isOpen: boolean; schoolGradeId: string; gradeName: string }>({ isOpen: false, schoolGradeId: "", gradeName: "" });

    // Bypass permission check for Admin testing
    const hasCreatePermission = true;

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            // Find active year
            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            // 2. If active year exists, fetch its grades
            if (active) {
                const gradesRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (gradesRes.ok) {
                    const gradesData = await gradesRes.json();
                    setSchoolGrades(gradesData);
                }
            }
            
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
        return <LoadingState message="Loading academic grades..." />;
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
                            <School className="w-6 h-6 mr-2 text-[#006b3f]" />
                            Grades & Sections
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Manage grade levels and sections for the academic year.</p>
                    </div>
                </div>
                <EmptyState 
                    title="No Active Academic Year" 
                    message="You must have an active academic year to configure grades and sections. Please activate a year first." 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <School className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Grades & Sections
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Managing structure for <span className="font-semibold text-[#006b3f]">{activeYear.name}</span>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        {hasCreatePermission && (
                            <Link href="/dashboard/academics/grades/create">
                                <Button leftIcon={<Plus className="w-4 h-4" />}>
                                    Add Grade
                                </Button>
                            </Link>
                        )}
                        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                            Filter
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <School className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Configured Grade Levels</p>
                            <p className="text-xl font-bold text-gray-900">{schoolGrades.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Active Sections</p>
                            <p className="text-xl font-bold text-gray-900">
                                {schoolGrades.reduce((acc, curr) => acc + (curr.sections?.length || 0), 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Grade Level Cap</p>
                            <p className="text-xl font-bold text-gray-900">
                                {schoolGrades.reduce((acc, curr) => acc + (curr.capacity || 0), 0) || "N/A"} Seats
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {schoolGrades.length === 0 ? (
                <EmptyState 
                    title="No Grades Configured" 
                    message={`There are no grades assigned to the ${activeYear.name} academic year.`} 
                />
            ) : (
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-base font-bold text-gray-900">Configured Grades & Section Allocations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Grade Level</th>
                                        <th className="px-6 py-3.5 font-semibold">Target Capacity</th>
                                        <th className="px-6 py-3.5 font-semibold">Section Breakdown & Capacity</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {schoolGrades.map((sg) => (
                                        <tr key={sg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900 flex items-center">
                                                <GraduationCap className="w-4 h-4 mr-2 text-[#006b3f]" />
                                                {sg.grade?.name || "Unknown"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{sg.capacity ? `${sg.capacity} Students` : "Uncapped"}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {sg.sections && sg.sections.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        {sg.sections.map((sec: any) => (
                                                            <span key={sec.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                Sec {sec.name} ({sec.capacity || 45} max)
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No sections added</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {activeYear?.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {hasCreatePermission && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            leftIcon={<Plus className="w-3 h-3" />}
                                                            onClick={() => setSectionModalState({ isOpen: true, schoolGradeId: sg.id, gradeName: sg.grade.name })}
                                                        >
                                                            Add Section
                                                        </Button>
                                                    )}
                                                    <Link href={`/dashboard/academics/grades/${sg.id}`}>
                                                        <Button variant="secondary" size="sm">
                                                            Manage
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal removed */}

            <AddSectionModal 
                isOpen={sectionModalState.isOpen}
                onClose={() => setSectionModalState({ isOpen: false, schoolGradeId: "", gradeName: "" })}
                onSuccess={loadData}
                schoolGradeId={sectionModalState.schoolGradeId}
                gradeName={sectionModalState.gradeName}
            />
        </div>
    );
}
