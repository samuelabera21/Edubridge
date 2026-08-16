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
import { AddGradeModal } from "./components/AddGradeModal";
import { AddSectionModal } from "./components/AddSectionModal";

export default function GradesAndSectionsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);
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
                            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddGradeModalOpen(true)}>
                                Add Grade
                            </Button>
                        )}
                        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                            Filter
                        </Button>
                    </div>
                </div>
            </div>

            {schoolGrades.length === 0 ? (
                <EmptyState 
                    title="No Grades Configured" 
                    message={`There are no grades assigned to the ${activeYear.name} academic year.`} 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Assigned Grades</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Grade Level</th>
                                        <th className="px-6 py-3 font-semibold">Capacity</th>
                                        <th className="px-6 py-3 font-semibold">Sections</th>
                                        <th className="px-6 py-3 font-semibold">Status</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {schoolGrades.map((sg) => (
                                        <tr key={sg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                                <GraduationCap className="w-4 h-4 mr-2 text-gray-400" />
                                                {sg.grade?.name || "Unknown"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{sg.capacity || "N/A"}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex items-center">
                                                    <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                                                    {sg.sections?.length || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {activeYear?.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <div className="text-right mt-3 pt-3 border-t">
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

            {activeYear && (
                <AddGradeModal 
                    isOpen={isAddGradeModalOpen}
                    onClose={() => setIsAddGradeModalOpen(false)}
                    onSuccess={loadData}
                    activeYearId={activeYear.id}
                />
            )}

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
