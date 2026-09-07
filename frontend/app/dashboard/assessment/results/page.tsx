"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    FileText, 
    User, 
    Award, 
    BookOpen, 
    CheckCircle2, 
    XCircle, 
    Search,
    Filter,
    Layers,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    RefreshCw,
    TrendingUp,
    Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

interface AcademicYearOption {
    id: string;
    name: string;
    status: string;
}

interface GradeOption {
    id: string;
    name: string;
    sections: Array<{ id: string; name: string }>;
}

interface SubjectOption {
    id: string;
    name: string;
    code: string;
}

interface AssessmentOption {
    id: string;
    title: string;
    type: string;
    maxScore: number;
}

interface StudentDetailData {
    student: {
        id: string;
        studentId: string;
        firstName: string;
        lastName: string;
        fullName: string;
        gender?: string;
        emergencyContactPhone?: string;
    };
    enrollment: {
        id: string;
        grade: string;
        section: string;
        academicYear: string;
    };
    summary: {
        totalAssessments: number;
        totalScore: number;
        totalMax: number;
        overallPercentage: number;
        passCount: number;
        failCount: number;
        status: "PASS" | "FAIL" | "NO_RESULTS";
    };
    subjects: Array<{
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        teacherName: string;
        averagePercentage: number;
        assessmentsCount: number;
        assessments: Array<{
            id: string;
            title: string;
            type: string;
            score: number;
            maxScore: number;
            percentage: number;
            isPassing: boolean;
            feedback: string | null;
            date: string | null;
        }>;
    }>;
}

export default function StudentResultsPage() {
    const { authData } = useAuth();

    // Filters
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [grades, setGrades] = useState<GradeOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [assessments, setAssessments] = useState<AssessmentOption[]>([]);

    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
    const [searchStudent, setSearchStudent] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Student Selection
    const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
    const [studentDetail, setStudentDetail] = useState<StudentDetailData | null>(null);

    // States
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableSections = useMemo(() => {
        if (!selectedGradeId) return [];
        const found = grades.find(g => g.id === selectedGradeId);
        return found ? found.sections : [];
    }, [selectedGradeId, grades]);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchStudent);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchStudent]);

    // 1. Initial Filter Load
    const loadFilterOptions = async (yearId?: string) => {
        try {
            setLoadingFilters(true);
            const query = yearId ? `?academicYearId=${yearId}` : "";
            const res = await fetchApi(`/assessment/admin/filters${query}`);
            if (!res.ok) throw new Error("Failed to load filter options");
            const data = await res.json();

            setAcademicYears(data.academicYears || []);
            setGrades(data.grades || []);
            setSubjects(data.subjects || []);
            setAssessments(data.assessments || []);

            if (!selectedYearId && data.activeAcademicYear) {
                setSelectedYearId(data.activeAcademicYear.id);
            }
            setError(null);
        } catch (err: any) {
            console.error("Filter loading error:", err);
            setError(err.message || "Failed to load assessment filters");
        } finally {
            setLoadingFilters(false);
        }
    };

    // 2. Fetch Enrollments in selected Section/Grade/Year
    const loadEnrollments = async () => {
        try {
            setLoadingStudents(true);
            const params = new URLSearchParams();
            if (selectedYearId) params.append("academicYearId", selectedYearId);
            if (selectedGradeId) params.append("schoolGradeId", selectedGradeId);
            if (selectedSectionId) params.append("sectionId", selectedSectionId);
            if (debouncedSearch) params.append("search", debouncedSearch);

            const res = await fetchApi(`/assessment/admin/roster?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const filtered = Array.isArray(data) ? data : (data.enrollments || data.data || []);
                setEnrolledStudents(filtered);
                if (filtered.length > 0) {
                    if (!filtered.some((e: any) => e.id === selectedEnrollmentId)) {
                        setSelectedEnrollmentId(filtered[0].id);
                    }
                } else {
                    setSelectedEnrollmentId("");
                    setStudentDetail(null);
                }
            }
        } catch (err) {
            console.error("Failed to load enrollments", err);
        } finally {
            setLoadingStudents(false);
        }
    };

    // Instant client-side search and filter on the loaded roster
    const displayedStudents = useMemo(() => {
        return enrolledStudents.filter(env => {
            const student = env.student;
            if (!student) return false;

            if (selectedGradeId) {
                const gradeId = env.schoolGradeId || env.schoolGrade?.id;
                if (gradeId && gradeId !== selectedGradeId) return false;
            }

            if (selectedSectionId) {
                const sectionId = env.sectionId || env.section?.id;
                if (sectionId && sectionId !== selectedSectionId) return false;
            }

            if (searchStudent.trim()) {
                const query = searchStudent.toLowerCase().trim();
                const fullName = `${student.firstName || ""} ${student.lastName || ""} ${student.fatherName || ""}`.toLowerCase();
                const studentId = (student.studentId || "").toLowerCase();
                if (!fullName.includes(query) && !studentId.includes(query)) {
                    return false;
                }
            }

            return true;
        });
    }, [enrolledStudents, selectedGradeId, selectedSectionId, searchStudent]);

    // Keep selected student synchronized with filtered roster
    useEffect(() => {
        if (displayedStudents.length > 0) {
            if (!displayedStudents.some((e: any) => e.id === selectedEnrollmentId)) {
                setSelectedEnrollmentId(displayedStudents[0].id);
            }
        } else {
            setSelectedEnrollmentId("");
            setStudentDetail(null);
        }
    }, [displayedStudents, selectedEnrollmentId]);

    // 3. Fetch Selected Student Detail
    const loadStudentDetail = async (enrollmentId: string) => {
        if (!enrollmentId) return;
        try {
            setLoadingDetail(true);
            const query = selectedYearId ? `?academicYearId=${selectedYearId}` : "";
            const res = await fetchApi(`/assessment/admin/students/${enrollmentId}${query}`);
            if (!res.ok) throw new Error("Failed to fetch student results");
            const data: StudentDetailData = await res.json();
            setStudentDetail(data);
        } catch (err: any) {
            console.error("Student results detail error:", err);
            setStudentDetail(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        loadFilterOptions();
    }, []);

    useEffect(() => {
        if (!loadingFilters) {
            loadEnrollments();
        }
    }, [selectedYearId, selectedGradeId, selectedSectionId, debouncedSearch, loadingFilters]);

    useEffect(() => {
        if (selectedEnrollmentId) {
            loadStudentDetail(selectedEnrollmentId);
        } else {
            setStudentDetail(null);
        }
    }, [selectedEnrollmentId, selectedYearId]);

    const handleYearChange = (newYearId: string) => {
        setSelectedYearId(newYearId);
        setSelectedGradeId("");
        setSelectedSectionId("");
        setSelectedEnrollmentId("");
        setStudentDetail(null);
        loadFilterOptions(newYearId);
    };

    if (loadingFilters && !studentDetail) {
        return <LoadingState message="Loading Student Results..." />;
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-[#0c2454] text-white rounded-xl shadow-sm">
                            <BookOpen className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                Student Assessment Results
                            </h1>
                            <p className="text-sm text-gray-500">
                                Detailed student-level marks, subject breakdowns, and assessment records.
                            </p>
                        </div>
                    </div>
                </div>

                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                        loadEnrollments();
                        if (selectedEnrollmentId) loadStudentDetail(selectedEnrollmentId);
                    }}
                    className="flex items-center space-x-2 text-xs font-semibold"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <Filter className="w-3.5 h-3.5 text-[#0c2454]" />
                        <span>Filter Student Scope</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Academic Year */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Academic Year
                        </label>
                        <select
                            value={selectedYearId}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full h-9 px-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                        >
                            {academicYears.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(Current)" : "(Archived)"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Grade Level */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Grade Level
                        </label>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => {
                                setSelectedGradeId(e.target.value);
                                setSelectedSectionId("");
                                setSelectedEnrollmentId("");
                            }}
                            className="w-full h-9 px-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                        >
                            <option value="">All Grades</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Section
                        </label>
                        <select
                            value={selectedSectionId}
                            onChange={(e) => {
                                setSelectedSectionId(e.target.value);
                                setSelectedEnrollmentId("");
                            }}
                            disabled={!selectedGradeId || availableSections.length === 0}
                            className="w-full h-9 px-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <option value="">All Sections</option>
                            {availableSections.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Student Search
                        </label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                placeholder="Search student name or ID..."
                                className="w-full h-9 pl-8 pr-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout: Student Roster Sidebar + Student Result Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Student Selector List */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Students ({displayedStudents.length})
                        </span>
                    </div>

                    {loadingStudents ? (
                        <div className="p-8 text-center text-xs text-gray-400">Loading student roster...</div>
                    ) : displayedStudents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-400">
                            No students found matching filters.
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                            {displayedStudents.map(env => {
                                const student = env.student;
                                const isSelected = env.id === selectedEnrollmentId;
                                return (
                                    <button
                                        key={env.id}
                                        onClick={() => setSelectedEnrollmentId(env.id)}
                                        className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between ${
                                            isSelected
                                                ? "bg-[#0c2454] text-white shadow-sm font-semibold"
                                                : "hover:bg-gray-50 text-gray-800 border border-transparent hover:border-gray-200"
                                        }`}
                                    >
                                        <div>
                                            <div className="font-bold">
                                                {student ? `${student.firstName} ${student.lastName}` : "Unknown Student"}
                                            </div>
                                            <div className={`text-[10px] ${isSelected ? "text-slate-300" : "text-gray-400"}`}>
                                                ID: {student?.studentId || "N/A"} • {env.schoolGrade?.grade?.name || "Grade"}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Detailed Performance Breakdown */}
                <div className="lg:col-span-8">
                    {loadingDetail ? (
                        <div className="bg-white rounded-2xl border border-gray-200/80 p-16 text-center text-xs text-gray-400">
                            Loading student performance details...
                        </div>
                    ) : !studentDetail ? (
                        <div className="bg-white rounded-2xl border border-gray-200/80 p-16 text-center space-y-3">
                            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                <User className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800">Select a student</h4>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                Select a student from the list to view their full assessment records and subject performance.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                            {studentDetail.enrollment.academicYear}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">
                                            Student ID: {studentDetail.student.studentId}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mt-1">
                                        {studentDetail.student.fullName}
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        {studentDetail.enrollment.grade} — {studentDetail.enrollment.section}
                                    </p>
                                </div>

                                <div className="flex items-center space-x-4 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Average</p>
                                        <p className="text-xl font-black text-gray-900">
                                            {studentDetail.summary.overallPercentage}%
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        studentDetail.summary.totalAssessments === 0 || studentDetail.summary.status === "NO_RESULTS"
                                            ? "bg-gray-100 text-gray-700 border border-gray-200"
                                            : studentDetail.summary.status === "PASS"
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                : "bg-rose-100 text-rose-800 border border-rose-200"
                                    }`}>
                                        {studentDetail.summary.totalAssessments === 0 || studentDetail.summary.status === "NO_RESULTS" 
                                            ? "NO RESULTS YET" 
                                            : studentDetail.summary.status}
                                    </span>
                                </div>
                            </div>

                            {/* Subject Assessments Breakdown */}
                            {studentDetail.subjects.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-xs text-gray-400">
                                    No assessment marks recorded by teachers for this student yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {studentDetail.subjects.map(subj => (
                                        <Card key={subj.subjectId} className="border border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
                                            <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-3 px-5 flex flex-row items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-sm font-bold text-gray-900">
                                                        {subj.subjectName} {subj.subjectCode && <span className="text-xs text-gray-400 font-normal">({subj.subjectCode})</span>}
                                                    </CardTitle>
                                                    <p className="text-[10px] text-gray-400">Teacher: {subj.teacherName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-gray-900">{subj.averagePercentage}%</span>
                                                    <p className="text-[10px] text-gray-400">{subj.assessmentsCount} assessment(s)</p>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-gray-50/40 text-gray-500 font-semibold border-b border-gray-100">
                                                            <tr>
                                                                <th className="py-2 px-4">Assessment Title</th>
                                                                <th className="py-2 px-3">Type</th>
                                                                <th className="py-2 px-3 text-center">Score</th>
                                                                <th className="py-2 px-3 text-center">Percentage</th>
                                                                <th className="py-2 px-3 text-center">Status</th>
                                                                <th className="py-2 px-3">Feedback</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 text-gray-700">
                                                            {subj.assessments.map(a => (
                                                                <tr key={a.id} className="hover:bg-gray-50/50">
                                                                    <td className="py-2 px-4 font-medium text-gray-900">{a.title}</td>
                                                                    <td className="py-2 px-3 text-[10px] uppercase text-gray-400">{a.type}</td>
                                                                    <td className="py-2 px-3 text-center font-bold text-gray-900">
                                                                        {a.score} / {a.maxScore}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-center font-bold">{a.percentage}%</td>
                                                                    <td className="py-2 px-3 text-center">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            a.isPassing ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                                                        }`}>
                                                                            {a.isPassing ? "PASS" : "FAIL"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2 px-3 text-gray-500 text-[11px] italic">
                                                                        {a.feedback || "—"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
