"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    BookOpen, Plus, Search, Clock, Layers, Trash2, 
    GraduationCap, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2,
    Edit2
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";
import Link from "next/link";
import { AddSubjectModal } from "./components/AddSubjectModal";
import { EditSubjectPeriodsModal } from "../grades/components/EditSubjectPeriodsModal";

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

function SubjectsPageContent() {
    const searchParams = useSearchParams();
    const urlGradeId = searchParams.get("gradeId");
    const urlYearId = searchParams.get("yearId");

    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>(urlYearId || "");
    const [activeTab, setActiveTab] = useState<"CURRICULUM" | "CATALOG">("CURRICULUM");

    // Master Catalog State
    const [masterSubjects, setMasterSubjects] = useState<MasterSubject[]>([]);
    const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");

    // Grade Allocation State
    const [schoolGrades, setSchoolGrades] = useState<SchoolGradeItem[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<string>(urlGradeId || "");
    const [gradeSubjects, setGradeSubjects] = useState<SchoolGradeSubjectItem[]>([]);
    const [gradeLoading, setGradeLoading] = useState(false);
    const [curriculumSearchQuery, setCurriculumSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<"name_asc" | "periods_desc" | "code">("name_asc");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalGradeTarget, setModalGradeTarget] = useState<{ schoolGradeId?: string; gradeName?: string }>({});
    const [editSubjectModal, setEditSubjectModal] = useState<{
        isOpen: boolean;
        gradeSubject: SchoolGradeSubjectItem | null;
    }>({ isOpen: false, gradeSubject: null });

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

            let chosenYearId = selectedYearId || urlYearId || "";
            if (!chosenYearId && yearsData.length > 0) {
                const active = yearsData.find(y => y.status === "ACTIVE");
                chosenYearId = active ? active.id : yearsData[0].id;
            }
            setSelectedYearId(chosenYearId);

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
                if (urlGradeId && gradesData.some(g => g.id === urlGradeId)) {
                    setSelectedGradeId(urlGradeId);
                } else if (gradesData.length > 0) {
                    setSelectedGradeId(prev => (prev && gradesData.some(g => g.id === prev)) ? prev : gradesData[0].id);
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

    // Filtered lists
    const filteredMasterSubjects = useMemo(() => {
        return masterSubjects.filter(s => {
            if (!catalogSearchQuery.trim()) return true;
            const q = catalogSearchQuery.toLowerCase();
            return (
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.code && s.code.toLowerCase().includes(q))
            );
        });
    }, [masterSubjects, catalogSearchQuery]);

    const filteredGradeSubjects = useMemo(() => {
        let result = gradeSubjects.filter(s => {
            if (!curriculumSearchQuery.trim()) return true;
            const q = curriculumSearchQuery.toLowerCase();
            return (
                (s.subject?.name && s.subject.name.toLowerCase().includes(q)) ||
                (s.subject?.code && s.subject.code.toLowerCase().includes(q))
            );
        });

        result.sort((a, b) => {
            if (sortBy === "name_asc") {
                return (a.subject?.name || "").localeCompare(b.subject?.name || "");
            }
            if (sortBy === "periods_desc") {
                return (b.weeklyPeriods || 0) - (a.weeklyPeriods || 0);
            }
            if (sortBy === "code") {
                return (a.subject?.code || "").localeCompare(b.subject?.code || "");
            }
            return 0;
        });

        return result;
    }, [gradeSubjects, curriculumSearchQuery, sortBy]);

    const totalWeeklyPeriods = gradeSubjects.reduce((acc, curr) => acc + (curr.weeklyPeriods || 0), 0);
    const avgPeriodsPerSubject = gradeSubjects.length > 0 ? (totalWeeklyPeriods / gradeSubjects.length).toFixed(1) : "0";

    if (loading && years.length === 0) {
        return <LoadingState message="Loading curriculum subjects and grade allocations..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadInitialData} />;
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-gray-900">Academics</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Curriculum Subjects</span>
            </div>

            {/* Clean Header Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                        Curriculum & Subjects
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manage grade-level subject allocations and weekly instructional periods.
                    </p>
                </div>

                <div className="flex items-center space-x-2.5">
                    {/* Compact Session Dropdown */}
                    {years.length > 0 && (
                        <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs">
                            <span className="text-gray-500 text-[11px] font-medium">Session:</span>
                            <select
                                value={selectedYearId}
                                onChange={(e) => setSelectedYearId(e.target.value)}
                                className="bg-transparent text-gray-900 font-semibold outline-none cursor-pointer"
                            >
                                {years.map(y => (
                                    <option key={y.id} value={y.id}>
                                        {y.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {hasManagePermission && (
                        <button
                            onClick={() => {
                                if (activeTab === "CURRICULUM" && currentGrade) {
                                    setModalGradeTarget({
                                        schoolGradeId: currentGrade.id,
                                        gradeName: currentGrade.grade?.name
                                    });
                                } else {
                                    setModalGradeTarget({});
                                }
                                setIsAddModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors shadow-xs cursor-pointer flex-shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{activeTab === "CURRICULUM" && currentGrade ? `Assign to ${currentGrade.grade?.name}` : "Add Subject"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Clean Data Stats on Normal Background (No Cards) */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 px-1 py-1 text-xs">
                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Catalog Subjects:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{masterSubjects.length}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Allocated Grades:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{schoolGrades.length}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">
                        {currentGrade ? `${currentGrade.grade?.name} Load:` : "Grade Load:"}
                    </span>
                    <span className="font-bold text-gray-900 text-sm font-mono">
                        {totalWeeklyPeriods} <span className="text-xs font-normal text-gray-500">p/wk</span>
                    </span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Avg Subject Load:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">
                        {avgPeriodsPerSubject} <span className="text-xs font-normal text-gray-500">p/wk</span>
                    </span>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex border-b border-gray-200 bg-white px-3 pt-2 rounded-t-xl border-t border-x gap-1">
                <button
                    onClick={() => setActiveTab("CURRICULUM")}
                    className={`py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
                        activeTab === "CURRICULUM"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    <span>Grade Curriculum</span>
                </button>
                <button
                    onClick={() => setActiveTab("CATALOG")}
                    className={`py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
                        activeTab === "CATALOG"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Master Catalog ({masterSubjects.length})</span>
                </button>
            </div>

            {/* TAB 1: GRADE CURRICULUM ALLOCATION */}
            {activeTab === "CURRICULUM" && (
                <div className="space-y-3">
                    {schoolGrades.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 space-y-3">
                            <p className="font-semibold text-gray-900">No Grades Configured for {selectedYear?.name || "this Academic Session"}</p>
                            <p>Please configure grade levels in Grades & Sections before allocating curriculum subjects.</p>
                            <Link href="/dashboard/academics/grades">
                                <button className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors shadow-xs cursor-pointer">
                                    <span>Configure Grades & Sections &rarr;</span>
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Integrated Filter Toolbar */}
                            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade:</span>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => setSelectedGradeId(e.target.value)}
                                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg px-2.5 py-1.5 font-bold cursor-pointer outline-none focus:ring-1 focus:ring-[#4085b3]"
                                    >
                                        {schoolGrades.map(sg => (
                                            <option key={sg.id} value={sg.id}>
                                                {sg.grade?.name} (Level {sg.grade?.level})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md justify-end">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search subjects..."
                                            value={curriculumSearchQuery}
                                            onChange={(e) => setCurriculumSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                        />
                                    </div>

                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                                    >
                                        <option value="name_asc">Name (A - Z)</option>
                                        <option value="periods_desc">Load (High to Low)</option>
                                        <option value="code">Subject Code</option>
                                    </select>

                                    {curriculumSearchQuery && (
                                        <button
                                            onClick={() => setCurriculumSearchQuery("")}
                                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 transition-colors cursor-pointer"
                                            title="Clear search"
                                        >
                                            <RotateCcw className="w-3 h-3 text-gray-400" />
                                            <span>Clear</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Grade Subject Table */}
                            <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        {currentGrade?.grade?.name} Curriculum
                                    </h2>
                                    <span className="text-xs text-gray-500 font-mono">
                                        {filteredGradeSubjects.length} subjects &bull; {totalWeeklyPeriods} Total Weekly Periods
                                    </span>
                                </div>

                                {gradeLoading ? (
                                    <div className="p-12 text-center text-xs text-gray-500">
                                        <LoadingState message="Loading curriculum..." />
                                    </div>
                                ) : filteredGradeSubjects.length === 0 ? (
                                    <div className="py-16 text-center text-xs text-gray-500 space-y-2">
                                        <p>
                                            {curriculumSearchQuery 
                                                ? "No allocated subjects match your filter." 
                                                : `No subjects allocated to ${currentGrade?.grade?.name || "this grade"} yet.`}
                                        </p>
                                        {hasManagePermission && currentGrade && !curriculumSearchQuery && (
                                            <button
                                                onClick={() => {
                                                    setModalGradeTarget({
                                                        schoolGradeId: currentGrade.id,
                                                        gradeName: currentGrade.grade?.name
                                                    });
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors shadow-xs cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Assign First Subject</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs text-gray-700">
                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                                                <tr>
                                                    <th className="px-4 py-3 w-12 text-center">#</th>
                                                    <th className="px-5 py-3 w-40">Subject Code</th>
                                                    <th className="px-5 py-3">Subject Name</th>
                                                    <th className="px-5 py-3 w-48 text-center">Weekly Load</th>
                                                    <th className="px-5 py-3 w-28 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredGradeSubjects.map((item, idx) => (
                                                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                                                        <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-[11px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-5 py-3.5 font-mono text-gray-600 font-semibold">
                                                            {item.subject?.code || "N/A"}
                                                        </td>
                                                        <td className="px-5 py-3.5 font-bold text-gray-900">
                                                            <div className="flex items-center space-x-2">
                                                                <BookOpen className="w-4 h-4 text-[#4085b3]" />
                                                                <span>{item.subject?.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-800 font-mono text-xs">
                                                                <Clock className="w-3 h-3 text-[#4085b3]" />
                                                                <span>{item.weeklyPeriods ?? 5} Periods / Wk</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            {hasManagePermission && (
                                                                <div className="flex items-center justify-end space-x-1">
                                                                    <button
                                                                        onClick={() => setEditSubjectModal({ isOpen: true, gradeSubject: item })}
                                                                        className="text-gray-400 hover:text-[#4085b3] p-1 rounded hover:bg-sky-50 transition-colors cursor-pointer"
                                                                        title="Update weekly periods"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveSubjectFromGrade(item.subjectId, item.subject?.name)}
                                                                        className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                                                        title="Remove from grade curriculum"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* TAB 2: MASTER CATALOG */}
            {activeTab === "CATALOG" && (
                <div className="space-y-3">
                    {/* Catalog Filter Toolbar */}
                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search master subjects by name or code..."
                                    value={catalogSearchQuery}
                                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>

                            {catalogSearchQuery && (
                                <button
                                    onClick={() => setCatalogSearchQuery("")}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3 text-gray-400" />
                                    <span>Clear</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Master Subjects Table */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Master Subject Register
                            </h2>
                            <span className="text-xs text-gray-500 font-mono">
                                {filteredMasterSubjects.length} {filteredMasterSubjects.length === 1 ? "subject" : "subjects"}
                            </span>
                        </div>

                        {filteredMasterSubjects.length === 0 ? (
                            <div className="py-16 text-center text-xs text-gray-500 space-y-2">
                                <p>{catalogSearchQuery ? "No catalog subjects match your search." : "No master subjects registered."}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-700">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-5 py-3 w-40">Subject Code</th>
                                            <th className="px-5 py-3">Subject Name</th>
                                            <th className="px-5 py-3 w-36 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredMasterSubjects.map((sub, idx) => (
                                            <tr key={sub.id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-[11px]">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-gray-700 font-semibold">
                                                    {sub.code || "N/A"}
                                                </td>
                                                <td className="px-5 py-3.5 font-bold text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <BookOpen className="w-4 h-4 text-[#4085b3]" />
                                                        <span>{sub.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
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
                existingSubjectIds={gradeSubjects.map(s => s.subjectId)}
            />

            {/* Edit Subject Periods Modal */}
            <EditSubjectPeriodsModal
                isOpen={editSubjectModal.isOpen}
                onClose={() => setEditSubjectModal({ isOpen: false, gradeSubject: null })}
                onSuccess={() => {
                    if (selectedGradeId) {
                        loadSubjectsForGrade(selectedGradeId);
                    }
                }}
                schoolGradeId={selectedGradeId}
                gradeSubject={editSubjectModal.gradeSubject as any}
            />
        </div>
    );
}

export default function SubjectsPage() {
    return (
        <Suspense fallback={<LoadingState message="Loading curriculum subjects..." />}>
            <SubjectsPageContent />
        </Suspense>
    );
}
