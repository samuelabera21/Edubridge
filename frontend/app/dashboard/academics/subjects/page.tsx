"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Plus, Search, Tag, Clock, Layers, Trash2, GraduationCap, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";
import { AddSubjectModal } from "./components/AddSubjectModal";

interface MasterSubject {
    id: string;
    name: string;
    code?: string;
}

interface SchoolGradeSubjectItem {
    id: string;
    schoolGradeId: string;
    subjectId: string;
    weeklyPeriods?: number | null;
    subject: MasterSubject;
}

interface SchoolGradeItem {
    id: string;
    academicYearId: string;
    gradeId: string;
    grade: {
        id: string;
        name: string;
        level: number;
    };
    gradeSubjects?: SchoolGradeSubjectItem[];
}

export default function SubjectsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"CURRICULUM" | "CATALOG">("CURRICULUM");

    // Master Catalog State
    const [masterSubjects, setMasterSubjects] = useState<MasterSubject[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Grade Allocation State
    const [schoolGrades, setSchoolGrades] = useState<SchoolGradeItem[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [gradeSubjects, setGradeSubjects] = useState<SchoolGradeSubjectItem[]>([]);
    const [gradeLoading, setGradeLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalGradeTarget, setModalGradeTarget] = useState<{ schoolGradeId?: string; gradeName?: string }>({});

    const hasManagePermission = authData?.access.some(acc => 
        ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE"].includes(p.permission?.name))
    );

    const selectedYear = years.find(y => y.id === selectedYearId) || null;
    const currentGrade = schoolGrades.find(g => g.id === selectedGradeId) || null;

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            let chosenYearId = selectedYearId;
            if (!chosenYearId && yearsData.length > 0) {
                const active = yearsData.find(y => y.status === "ACTIVE");
                chosenYearId = active ? active.id : yearsData[0].id;
                setSelectedYearId(chosenYearId);
            }

            // 2. Fetch Master Subjects
            const subRes = await fetchApi("/academic/subjects");
            if (subRes.ok) {
                const subData = await subRes.json();
                setMasterSubjects(Array.isArray(subData) ? subData : []);
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading subjects.");
        } finally {
            setLoading(false);
        }
    };

    // When selectedYearId changes, load school grades for this year
    const loadGradesForYear = async (yearId: string) => {
        if (!yearId) return;
        try {
            const res = await fetchApi(`/academic/years/${yearId}/grades`);
            if (res.ok) {
                const gradesData: SchoolGradeItem[] = await res.json();
                setSchoolGrades(gradesData);
                if (gradesData.length > 0) {
                    setSelectedGradeId(gradesData[0].id);
                } else {
                    setSelectedGradeId("");
                    setGradeSubjects([]);
                }
            } else {
                setSchoolGrades([]);
                setSelectedGradeId("");
                setGradeSubjects([]);
            }
        } catch (err) {
            console.error("Failed to load grades for year:", err);
            setSchoolGrades([]);
        }
    };

    // When selectedGradeId changes, load subjects for that grade
    const loadSubjectsForGrade = async (schoolGradeId: string) => {
        if (!schoolGradeId) return;
        try {
            setGradeLoading(true);
            const res = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}/subjects`);
            if (res.ok) {
                const data = await res.json();
                setGradeSubjects(data);
            } else {
                setGradeSubjects([]);
            }
        } catch (err) {
            console.error("Failed to load grade subjects:", err);
            setGradeSubjects([]);
        } finally {
            setGradeLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            loadGradesForYear(selectedYearId);
        }
    }, [selectedYearId]);

    useEffect(() => {
        if (selectedGradeId) {
            loadSubjectsForGrade(selectedGradeId);
        }
    }, [selectedGradeId]);

    const handleRemoveSubjectFromGrade = async (subjectId: string, subjectName: string) => {
        if (!confirm(`Are you sure you want to remove "${subjectName}" from this grade's curriculum?`)) return;
        try {
            const res = await fetchApi(`/academic/grades/school-grades/${selectedGradeId}/subjects/${subjectId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to remove subject from grade");
            }
            await loadSubjectsForGrade(selectedGradeId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredMasterSubjects = masterSubjects.filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.code && s.code.toLowerCase().includes(q))
        );
    });

    const totalWeeklyPeriods = gradeSubjects.reduce((acc, curr) => acc + (curr.weeklyPeriods || 0), 0);

    if (loading && years.length === 0) {
        return <LoadingState message="Loading curriculum subjects and grade allocations..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadInitialData} />;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <BookOpen className="w-7 h-7 mr-3 text-[#006b3f]" />
                        Subjects & Grade Curriculum Allocation
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Map subjects to specific grade levels and configure weekly period requirements per Ethiopian curriculum standards.
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

            {/* Navigation Tabs */}
            <div className="flex space-x-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("CURRICULUM")}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                        activeTab === "CURRICULUM"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    <span>Grade-Level Curriculum & Periods</span>
                </button>
                <button
                    onClick={() => setActiveTab("CATALOG")}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                        activeTab === "CATALOG"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Master Subject Catalog ({masterSubjects.length})</span>
                </button>
            </div>

            {/* TAB 1: GRADE CURRICULUM ALLOCATION */}
            {activeTab === "CURRICULUM" && (
                <div className="space-y-6">
                    {schoolGrades.length === 0 ? (
                        <EmptyState
                            title="No Grades Configured for this Academic Year"
                            message={`Please configure grades for ${selectedYear?.name || "this year"} first in Grades & Sections before allocating subjects.`}
                        />
                    ) : (
                        <>
                            {/* Grade Selector & Action Bar */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center space-x-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Select Grade Level:</label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => setSelectedGradeId(e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#006b3f] focus:border-[#006b3f] p-2 font-bold"
                                    >
                                        {schoolGrades.map(sg => (
                                            <option key={sg.id} value={sg.id}>
                                                {sg.grade?.name} (Level {sg.grade?.level})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Total Weekly Load</p>
                                        <p className="text-lg font-bold text-gray-900">{totalWeeklyPeriods} Periods/Week</p>
                                    </div>
                                    {hasManagePermission && currentGrade && (
                                        <Button
                                            size="sm"
                                            leftIcon={<Plus className="w-4 h-4" />}
                                            onClick={() => {
                                                setModalGradeTarget({
                                                    schoolGradeId: currentGrade.id,
                                                    gradeName: currentGrade.grade?.name
                                                });
                                                setIsAddModalOpen(true);
                                            }}
                                        >
                                            Assign Subject to {currentGrade.grade?.name}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Grade Subject Table */}
                            {gradeLoading ? (
                                <LoadingState message="Loading curriculum for selected grade..." />
                            ) : gradeSubjects.length === 0 ? (
                                <EmptyState
                                    title={`No Subjects Assigned to ${currentGrade?.grade?.name || "this Grade"}`}
                                    message="Click 'Assign Subject' to map a subject and its weekly instructional period load."
                                />
                            ) : (
                                <Card className="shadow-sm">
                                    <CardHeader className="py-4 bg-gray-50/50 border-b border-gray-100">
                                        <CardTitle className="text-base font-bold text-gray-900">
                                            Curriculum Subjects for {currentGrade?.grade?.name} ({selectedYear?.name})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3.5 font-semibold">Subject Name</th>
                                                        <th className="px-6 py-3.5 font-semibold">Subject Code</th>
                                                        <th className="px-6 py-3.5 font-semibold">Weekly Periods Required</th>
                                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {gradeSubjects.map((item) => (
                                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-gray-900 flex items-center">
                                                                <BookOpen className="w-4 h-4 mr-2 text-[#006b3f]" />
                                                                {item.subject?.name}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                                {item.subject?.code || "N/A"}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                    <Clock className="w-3.5 h-3.5 mr-1 text-[#006b3f]" />
                                                                    {item.weeklyPeriods ?? 5} Periods / Week
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {hasManagePermission && (
                                                                    <button
                                                                        onClick={() => handleRemoveSubjectFromGrade(item.subjectId, item.subject?.name)}
                                                                        className="text-red-600 hover:text-red-800 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                        title="Remove from grade curriculum"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* TAB 2: MASTER CATALOG */}
            {activeTab === "CATALOG" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search catalog..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>

                        {hasManagePermission && (
                            <Button
                                size="sm"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => {
                                    setModalGradeTarget({});
                                    setIsAddModalOpen(true);
                                }}
                            >
                                Add Subject to Catalog
                            </Button>
                        )}
                    </div>

                    <Card className="shadow-sm">
                        <CardHeader className="py-4 bg-gray-50/50 border-b border-gray-100">
                            <CardTitle className="text-base font-bold text-gray-900">
                                Organization Master Subject Catalog
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">Subject Code</th>
                                            <th className="px-6 py-3.5 font-semibold">Subject Name</th>
                                            <th className="px-6 py-3.5 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredMasterSubjects.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">
                                                    {sub.code || "N/A"}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900 flex items-center">
                                                    <BookOpen className="w-4 h-4 mr-2 text-[#006b3f]" />
                                                    {sub.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        Master Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Subject Modal */}
            <AddSubjectModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    loadInitialData();
                    if (selectedGradeId) {
                        loadSubjectsForGrade(selectedGradeId);
                    }
                }}
                schoolGradeId={modalGradeTarget.schoolGradeId}
                gradeName={modalGradeTarget.gradeName}
                academicYearId={selectedYearId}
            />
        </div>
    );
}
