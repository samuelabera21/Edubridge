"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Plus, Users, School, Edit2, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";
import Link from "next/link";
import { AddSectionModal } from "./components/AddSectionModal";
import { EditSectionModal } from "./components/EditSectionModal";

export default function GradesAndSectionsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [gradesLoading, setGradesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [addSectionModalState, setAddSectionModalState] = useState<{ isOpen: boolean; schoolGradeId: string; gradeName: string }>({
        isOpen: false,
        schoolGradeId: "",
        gradeName: ""
    });

    const [editSectionModalState, setEditSectionModalState] = useState<{
        isOpen: boolean;
        section: { id: string; name: string; capacity?: number | null } | null;
        gradeName: string;
    }>({
        isOpen: false,
        section: null,
        gradeName: ""
    });

    const hasManagePermission = authData?.access.some(acc => 
        ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE"].includes(p.permission?.name))
    );

    const selectedYear = years.find(y => y.id === selectedYearId) || null;

    const loadYears = async () => {
        try {
            setLoading(true);
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            if (yearsData.length > 0) {
                const active = yearsData.find(y => y.status === "ACTIVE");
                const initialYear = active || yearsData[0];
                setSelectedYearId(initialYear.id);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred loading academic years");
        } finally {
            setLoading(false);
        }
    };

    const loadGradesForYear = async (yearId: string) => {
        if (!yearId) return;
        try {
            setGradesLoading(true);
            const gradesRes = await fetchApi(`/academic/years/${yearId}/grades`);
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                setSchoolGrades(gradesData);
            } else {
                setSchoolGrades([]);
            }
        } catch (err: any) {
            console.error("Failed to load school grades:", err);
            setSchoolGrades([]);
        } finally {
            setGradesLoading(false);
        }
    };

    useEffect(() => {
        loadYears();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            loadGradesForYear(selectedYearId);
        }
    }, [selectedYearId]);

    const handleDeleteSection = async (sectionId: string, sectionName: string) => {
        if (!confirm(`Are you sure you want to delete Section "${sectionName}"?`)) return;
        try {
            const res = await fetchApi(`/academic/sections/${sectionId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete section");
            }
            await loadGradesForYear(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteSchoolGrade = async (schoolGradeId: string, gradeName: string) => {
        if (!confirm(`Are you sure you want to remove ${gradeName} from this academic year?`)) return;
        try {
            const res = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to remove grade offering");
            }
            await loadGradesForYear(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading && years.length === 0) {
        return <LoadingState message="Loading academic grades & sections..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Top Bar: Title & Year Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <School className="w-7 h-7 mr-3 text-[#006b3f]" />
                        Grades & Sections Configuration
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure grade offerings, classroom sections, and student seating capacity for academic operations.
                    </p>
                </div>

                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Academic Year:</label>
                    <select
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#006b3f] focus:border-[#006b3f] p-1.5 font-medium"
                    >
                        {years.map(y => (
                            <option key={y.id} value={y.id}>
                                {y.name} ({y.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Status Banner */}
            {selectedYear && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    selectedYear.status === "ACTIVE"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : selectedYear.status === "PLANNED"
                        ? "bg-blue-50 border-blue-200 text-blue-900"
                        : "bg-gray-50 border-gray-200 text-gray-800"
                }`}>
                    <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded-full bg-white shadow-sm">
                            {selectedYear.status === "ACTIVE" ? (
                                <CheckCircle2 className="w-5 h-5 text-[#006b3f]" />
                            ) : (
                                <Clock className="w-5 h-5 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <span className="font-bold text-sm">
                                {selectedYear.name} — Status: {selectedYear.status}
                            </span>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {selectedYear.status === "PLANNED"
                                    ? "🛠️ Planning Mode: Structure grades and sections before activating the year."
                                    : "Active Operational Year."}
                            </p>
                        </div>
                    </div>

                    {hasManagePermission && (
                        <Link href={`/dashboard/academics/grades/create?yearId=${selectedYear.id}`}>
                            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                                Add Grade Offering
                            </Button>
                        </Link>
                    )}
                </div>
            )}

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Classroom Sections</p>
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
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Seating Capacity</p>
                            <p className="text-xl font-bold text-gray-900">
                                {schoolGrades.reduce((acc, curr) => {
                                    const secCap = curr.sections?.reduce((sAcc: number, s: any) => sAcc + (s.capacity || 0), 0) || 0;
                                    return acc + secCap;
                                }, 0)} Seats
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Grades & Sections Table */}
            {gradesLoading ? (
                <LoadingState message="Updating grade offerings..." />
            ) : schoolGrades.length === 0 ? (
                <EmptyState 
                    title="No Grades Configured" 
                    message={`There are no grades assigned to ${selectedYear?.name || "this academic year"}. Click "Add Grade Offering" to get started.`} 
                />
            ) : (
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-base font-bold text-gray-900">
                            Offered Grades & Section Allocations ({selectedYear?.name})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Grade Level</th>
                                        <th className="px-6 py-3.5 font-semibold">Sections & Capacities</th>
                                        <th className="px-6 py-3.5 font-semibold">Curriculum Subjects</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {schoolGrades.map((sg) => (
                                        <tr key={sg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900 flex items-center">
                                                <GraduationCap className="w-4 h-4 mr-2 text-[#006b3f]" />
                                                {sg.grade?.name || "Unknown"}
                                                <span className="ml-2 text-xs font-normal text-gray-400">
                                                    (Level {sg.grade?.level ?? 0})
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-gray-600">
                                                {sg.sections && sg.sections.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {sg.sections.map((sec: any) => (
                                                            <span key={sec.id} className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 group">
                                                                Sec {sec.name} ({sec.capacity || 50} max)
                                                                {hasManagePermission && (
                                                                    <div className="ml-2 inline-flex items-center space-x-1">
                                                                        <button
                                                                            onClick={() => setEditSectionModalState({
                                                                                isOpen: true,
                                                                                section: sec,
                                                                                gradeName: sg.grade?.name
                                                                            })}
                                                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                                                            title="Edit Section"
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteSection(sec.id, sec.name)}
                                                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                                                            title="Delete Section"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No sections created</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-gray-600">
                                                {sg.gradeSubjects && sg.gradeSubjects.length > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                        {sg.gradeSubjects.length} Subject(s) Assigned
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-600 font-medium">
                                                        No subjects allocated
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right space-x-2">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {hasManagePermission && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            leftIcon={<Plus className="w-3 h-3" />}
                                                            onClick={() => setAddSectionModalState({
                                                                isOpen: true,
                                                                schoolGradeId: sg.id,
                                                                gradeName: sg.grade?.name
                                                            })}
                                                        >
                                                            Add Section
                                                        </Button>
                                                    )}
                                                    <Link href={`/dashboard/academics/grades/${sg.id}`}>
                                                        <Button variant="secondary" size="sm">
                                                            Details
                                                        </Button>
                                                    </Link>
                                                    {hasManagePermission && (
                                                        <button
                                                            onClick={() => handleDeleteSchoolGrade(sg.id, sg.grade?.name)}
                                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                            title="Remove Grade Offering"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
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

            {/* Add Section Modal */}
            <AddSectionModal 
                isOpen={addSectionModalState.isOpen}
                onClose={() => setAddSectionModalState({ isOpen: false, schoolGradeId: "", gradeName: "" })}
                onSuccess={() => loadGradesForYear(selectedYearId)}
                schoolGradeId={addSectionModalState.schoolGradeId}
                gradeName={addSectionModalState.gradeName}
            />

            {/* Edit Section Modal */}
            <EditSectionModal 
                isOpen={editSectionModalState.isOpen}
                onClose={() => setEditSectionModalState({ isOpen: false, section: null, gradeName: "" })}
                onSuccess={() => loadGradesForYear(selectedYearId)}
                section={editSectionModalState.section}
                gradeName={editSectionModalState.gradeName}
            />
        </div>
    );
}
