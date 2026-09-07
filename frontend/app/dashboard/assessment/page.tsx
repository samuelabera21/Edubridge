"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    FileText, 
    Calendar, 
    Award, 
    TrendingUp, 
    CheckCircle2, 
    XCircle,
    UserCheck,
    BookOpen,
    User,
    Eye,
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Layers,
    BarChart3,
    GraduationCap,
    X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

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

interface OverviewData {
    academicYear: { id: string; name: string; status: string } | null;
    summary: {
        totalAssessments: number;
        studentsWithResults: number;
        totalResults: number;
        averageScore: number;
        passRate: number;
    };
    gradePerformance: Array<{
        gradeId: string;
        gradeName: string;
        students: number;
        results: number;
        average: number;
        passRate: number;
    }>;
    subjectPerformance: Array<{
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        results: number;
        average: number;
        passRate: number;
    }>;
}

interface ResultItem {
    id: string;
    student: {
        id: string;
        studentId: string;
        firstName: string;
        lastName: string;
        fullName: string;
    } | null;
    enrollmentId: string;
    grade: string;
    gradeId?: string;
    section: string;
    sectionId?: string;
    subject: {
        id: string;
        name: string;
        code: string;
    } | null;
    teacher: string;
    assessment: {
        id: string;
        title: string;
        type: string;
        maxScore: number;
        passingScore?: number | null;
        dueDate?: string | null;
    };
    score: number;
    maxScore: number;
    percentage: number;
    isPassing: boolean;
    resultStatus: "PASS" | "FAIL";
    feedback?: string | null;
    academicYear: string;
    createdAt: string;
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

export default function AssessmentOversightPage() {
    const { authData } = useAuth();

    // Filter Options
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [grades, setGrades] = useState<GradeOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [assessments, setAssessments] = useState<AssessmentOption[]>([]);

    // Active Filter Selections
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
    const [searchStudent, setSearchStudent] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Data States
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [results, setResults] = useState<ResultItem[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

    // UI & Loading States
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingResults, setLoadingResults] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Student Detail Modal
    const [selectedEnrollmentForDetail, setSelectedEnrollmentForDetail] = useState<string | null>(null);
    const [studentDetail, setStudentDetail] = useState<StudentDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Active Sections for currently selected grade
    const availableSections = useMemo(() => {
        if (!selectedGradeId) return [];
        const found = grades.find(g => g.id === selectedGradeId);
        return found ? found.sections : [];
    }, [selectedGradeId, grades]);

    // Handle Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchStudent);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchStudent]);

    // 1. Fetch Filter Options
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
            setError(err.message || "Failed to initialize assessment filters");
        } finally {
            setLoadingFilters(false);
        }
    };

    // 2. Fetch Overview Data
    const loadOverview = async () => {
        try {
            setLoadingOverview(true);
            const params = new URLSearchParams();
            if (selectedYearId) params.append("academicYearId", selectedYearId);
            if (selectedGradeId) params.append("schoolGradeId", selectedGradeId);
            if (selectedSectionId) params.append("sectionId", selectedSectionId);
            if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
            if (selectedAssessmentId) params.append("assessmentId", selectedAssessmentId);

            const res = await fetchApi(`/assessment/admin/overview?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load assessment overview");
            const data: OverviewData = await res.json();
            setOverview(data);
        } catch (err: any) {
            console.error("Overview error:", err);
        } finally {
            setLoadingOverview(false);
        }
    };

    // 3. Fetch Paginated Results
    const loadResults = async () => {
        try {
            setLoadingResults(true);
            const params = new URLSearchParams();
            if (selectedYearId) params.append("academicYearId", selectedYearId);
            if (selectedGradeId) params.append("schoolGradeId", selectedGradeId);
            if (selectedSectionId) params.append("sectionId", selectedSectionId);
            if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
            if (selectedAssessmentId) params.append("assessmentId", selectedAssessmentId);
            if (debouncedSearch) params.append("search", debouncedSearch);
            params.append("page", String(pagination.page));
            params.append("limit", String(pagination.limit));

            const res = await fetchApi(`/assessment/admin/results?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load student results");
            const data = await res.json();

            setResults(data.results || []);
            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                totalPages: data.pagination.totalPages
            }));
        } catch (err: any) {
            console.error("Results error:", err);
        } finally {
            setLoadingResults(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadFilterOptions();
    }, []);

    // Fetch Overview & Results when filters change
    useEffect(() => {
        if (!loadingFilters) {
            loadOverview();
            loadResults();
        }
    }, [selectedYearId, selectedGradeId, selectedSectionId, selectedSubjectId, selectedAssessmentId, debouncedSearch, pagination.page, loadingFilters]);

    // Handle Year Change
    const handleYearChange = (newYearId: string) => {
        setSelectedYearId(newYearId);
        setSelectedGradeId("");
        setSelectedSectionId("");
        setSelectedSubjectId("");
        setSelectedAssessmentId("");
        setPagination(prev => ({ ...prev, page: 1 }));
        loadFilterOptions(newYearId);
    };

    // View Student Detail Modal
    const handleOpenStudentDetail = async (enrollmentId: string) => {
        try {
            setSelectedEnrollmentForDetail(enrollmentId);
            setLoadingDetail(true);
            const query = selectedYearId ? `?academicYearId=${selectedYearId}` : "";
            const res = await fetchApi(`/assessment/admin/students/${enrollmentId}${query}`);
            if (!res.ok) throw new Error("Failed to load student assessment detail");
            const data: StudentDetailData = await res.json();
            setStudentDetail(data);
        } catch (err: any) {
            console.error("Student detail error:", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCloseStudentDetail = () => {
        setSelectedEnrollmentForDetail(null);
        setStudentDetail(null);
    };

    if (loadingFilters && !overview) {
        return <LoadingState message="Initializing Assessment & Results Oversight..." />;
    }

    if (error && !overview) {
        return <ErrorState message={error} onRetry={() => loadFilterOptions()} />;
    }

    const summary = overview?.summary || {
        totalAssessments: 0,
        studentsWithResults: 0,
        totalResults: 0,
        averageScore: 0,
        passRate: 0
    };

    return (
        <div className="space-y-8 pb-12">
            {/* 1. Header & Navigation Context */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-[#0c2454] text-white rounded-xl shadow-sm">
                            <GraduationCap className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                Assessment & Results Oversight
                            </h1>
                            <p className="text-sm text-gray-500">
                                Monitor student assessment results and performance distributions across the school.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                            loadOverview();
                            loadResults();
                        }}
                        className="flex items-center space-x-2 text-xs font-semibold"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Data</span>
                    </Button>
                </div>
            </div>

            {/* 2. Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <Filter className="w-3.5 h-3.5 text-[#0c2454]" />
                        <span>Filter & Scope Dimensions</span>
                    </div>
                    {(selectedGradeId || selectedSectionId || selectedSubjectId || selectedAssessmentId || searchStudent) && (
                        <button
                            onClick={() => {
                                setSelectedGradeId("");
                                setSelectedSectionId("");
                                setSelectedSubjectId("");
                                setSelectedAssessmentId("");
                                setSearchStudent("");
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
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

                    {/* Grade Filter */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Grade Level
                        </label>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => {
                                setSelectedGradeId(e.target.value);
                                setSelectedSectionId("");
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full h-9 px-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                        >
                            <option value="">All Grades</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section Filter */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Class Section
                        </label>
                        <select
                            value={selectedSectionId}
                            onChange={(e) => {
                                setSelectedSectionId(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
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

                    {/* Subject Filter */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Subject
                        </label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => {
                                setSelectedSubjectId(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full h-9 px-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code || "SUB"})</option>
                            ))}
                        </select>
                    </div>

                    {/* Assessment Filter */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Assessment
                        </label>
                        <select
                            value={selectedAssessmentId}
                            onChange={(e) => {
                                setSelectedAssessmentId(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full h-9 px-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                        >
                            <option value="">All Assessments</option>
                            {assessments.map(a => (
                                <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
                            ))}
                        </select>
                    </div>

                    {/* Student Search */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Search Student
                        </label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                placeholder="Student name or ID..."
                                className="w-full h-9 pl-8 pr-3 bg-gray-50/80 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0c2454] focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Summary Cards (Real DB Metrics Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Students With Results */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Students With Results
                            </p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {loadingOverview ? "..." : summary.studentsWithResults.toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Unique students graded in scope
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                            <UserCheck className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Assessments in Scope */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Assessments
                            </p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {loadingOverview ? "..." : summary.totalAssessments.toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {summary.totalResults.toLocaleString()} total result records
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Average Score */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Average Score
                            </p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {loadingOverview ? "..." : `${summary.averageScore}%`}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Weighted percentage average
                            </p>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Pass Rate */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Pass Rate
                            </p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {loadingOverview ? "..." : `${summary.passRate}%`}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Meeting passing threshold
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                            <Award className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Grade Performance & Subject Performance Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grade Performance Table */}
                <Card className="border border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3.5 px-5">
                        <div className="flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-[#0c2454]" />
                            <CardTitle className="text-sm font-bold text-gray-800">
                                Grade-Level Performance
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingOverview ? (
                            <div className="p-8 text-center text-xs text-gray-400">Loading grade data...</div>
                        ) : (overview?.gradePerformance || []).length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400">
                                No assessment results available for this academic year.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-2.5 px-4">Grade</th>
                                            <th className="py-2.5 px-4 text-center">Students</th>
                                            <th className="py-2.5 px-4 text-center">Results</th>
                                            <th className="py-2.5 px-4 text-center">Average</th>
                                            <th className="py-2.5 px-4 text-center">Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {overview?.gradePerformance.map(g => (
                                            <tr key={g.gradeId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-2.5 px-4 font-semibold text-gray-900">{g.gradeName}</td>
                                                <td className="py-2.5 px-4 text-center">{g.students}</td>
                                                <td className="py-2.5 px-4 text-center">{g.results}</td>
                                                <td className="py-2.5 px-4 text-center font-bold text-gray-800">{g.average}%</td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        g.passRate >= 70 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                        g.passRate >= 50 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                        "bg-rose-50 text-rose-700 border border-rose-200"
                                                    }`}>
                                                        {g.passRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Subject Performance Table */}
                <Card className="border border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3.5 px-5">
                        <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-[#0c2454]" />
                            <CardTitle className="text-sm font-bold text-gray-800">
                                Subject-Level Performance
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingOverview ? (
                            <div className="p-8 text-center text-xs text-gray-400">Loading subject data...</div>
                        ) : (overview?.subjectPerformance || []).length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400">
                                No subject performance data available in this scope.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-2.5 px-4">Subject</th>
                                            <th className="py-2.5 px-4 text-center">Results</th>
                                            <th className="py-2.5 px-4 text-center">Average</th>
                                            <th className="py-2.5 px-4 text-center">Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {overview?.subjectPerformance.map(s => (
                                            <tr key={s.subjectId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-2.5 px-4 font-semibold text-gray-900">
                                                    {s.subjectName} {s.subjectCode && <span className="text-[10px] text-gray-400 font-normal">({s.subjectCode})</span>}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">{s.results}</td>
                                                <td className="py-2.5 px-4 text-center font-bold text-gray-800">{s.average}%</td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        s.passRate >= 70 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                        s.passRate >= 50 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                        "bg-rose-50 text-rose-700 border border-rose-200"
                                                    }`}>
                                                        {s.passRate}%
                                                    </span>
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

            {/* 5. Main Results Records Table */}
            <Card className="border border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-base font-bold text-gray-900">
                                Student Assessment Results
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Showing teacher-entered marks recorded in the database ({pagination.total.toLocaleString()} total entries).
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loadingResults ? (
                        <div className="p-12 text-center text-xs text-gray-400">Loading student results...</div>
                    ) : results.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800">No assessment results available yet</h4>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                Results entered by teachers for this academic year and selected filters will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="py-3 px-5">Student</th>
                                        <th className="py-3 px-4">Grade</th>
                                        <th className="py-3 px-4">Section</th>
                                        <th className="py-3 px-4">Subject</th>
                                        <th className="py-3 px-4">Assessment</th>
                                        <th className="py-3 px-4 text-center">Score</th>
                                        <th className="py-3 px-4 text-center">Percentage</th>
                                        <th className="py-3 px-4 text-center">Result</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {results.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Student */}
                                            <td className="py-3 px-5">
                                                <div className="font-semibold text-gray-900">
                                                    {r.student ? r.student.fullName : "Unknown Student"}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    ID: {r.student?.studentId || "N/A"}
                                                </div>
                                            </td>

                                            {/* Grade */}
                                            <td className="py-3 px-4 text-gray-800 font-medium">{r.grade}</td>

                                            {/* Section */}
                                            <td className="py-3 px-4 text-gray-800 font-medium">Sec {r.section}</td>

                                            {/* Subject */}
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">
                                                    {r.subject?.name || "N/A"}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    Teacher: {r.teacher}
                                                </div>
                                            </td>

                                            {/* Assessment */}
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">{r.assessment.title}</div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                                                    {r.assessment.type}
                                                </div>
                                            </td>

                                            {/* Score */}
                                            <td className="py-3 px-4 text-center font-bold text-gray-900">
                                                {r.score} <span className="text-gray-400 font-normal">/ {r.maxScore}</span>
                                            </td>

                                            {/* Percentage */}
                                            <td className="py-3 px-4 text-center font-bold text-gray-900">
                                                {r.percentage}%
                                            </td>

                                            {/* Pass / Fail Status */}
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    r.isPassing ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                    "bg-rose-50 text-rose-700 border border-rose-200"
                                                }`}>
                                                    {r.isPassing ? (
                                                        <>
                                                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                            Pass
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-2.5 h-2.5 mr-1" />
                                                            Fail
                                                        </>
                                                    )}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenStudentDetail(r.enrollmentId)}
                                                    className="h-7 px-2.5 text-[11px] font-medium text-blue-700 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    View Detail
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50/50 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                                Showing page <span className="font-semibold text-gray-800">{pagination.page}</span> of{" "}
                                <span className="font-semibold text-gray-800">{pagination.totalPages}</span> ({pagination.total} total)
                            </span>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    Next
                                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 6. Individual Student Result Detail Modal */}
            {selectedEnrollmentForDetail && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
                        {loadingDetail ? (
                            <div className="py-16 text-center text-xs text-gray-500">
                                Loading student performance record...
                            </div>
                        ) : !studentDetail ? (
                            <div className="py-12 text-center text-xs text-gray-500">
                                Student record not found.
                            </div>
                        ) : (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                {studentDetail.enrollment.academicYear}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ID: {studentDetail.student.studentId}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 mt-1">
                                            {studentDetail.student.fullName}
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            {studentDetail.enrollment.grade} — {studentDetail.enrollment.section}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCloseStudentDetail}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Average</p>
                                        <p className="text-xl font-black text-gray-900 mt-0.5">
                                            {studentDetail.summary.overallPercentage}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assessments</p>
                                        <p className="text-xl font-black text-gray-900 mt-0.5">
                                            {studentDetail.summary.totalAssessments}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pass / Fail</p>
                                        <p className="text-xl font-black text-gray-900 mt-0.5">
                                            <span className="text-emerald-600">{studentDetail.summary.passCount}P</span>
                                            {" / "}
                                            <span className="text-rose-600">{studentDetail.summary.failCount}F</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Subject-by-Subject Result Breakdown */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        Subject Results & Assessments
                                    </h4>

                                    {studentDetail.subjects.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No subject results recorded yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {studentDetail.subjects.map(s => (
                                                <div key={s.subjectId} className="border border-gray-200/80 rounded-2xl p-4 space-y-3 bg-white">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h5 className="text-sm font-bold text-gray-900">{s.subjectName}</h5>
                                                            <p className="text-[10px] text-gray-400">Teacher: {s.teacherName}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-black text-gray-900">{s.averagePercentage}%</span>
                                                            <p className="text-[10px] text-gray-400">{s.assessmentsCount} assessment(s)</p>
                                                        </div>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-[11px]">
                                                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                                                                <tr>
                                                                    <th className="py-1.5 px-3">Assessment</th>
                                                                    <th className="py-1.5 px-3">Type</th>
                                                                    <th className="py-1.5 px-3 text-center">Score</th>
                                                                    <th className="py-1.5 px-3 text-center">%</th>
                                                                    <th className="py-1.5 px-3 text-center">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {s.assessments.map(a => (
                                                                    <tr key={a.id}>
                                                                        <td className="py-1.5 px-3 font-medium text-gray-800">{a.title}</td>
                                                                        <td className="py-1.5 px-3 text-gray-500 uppercase text-[10px]">{a.type}</td>
                                                                        <td className="py-1.5 px-3 text-center font-bold text-gray-900">{a.score}/{a.maxScore}</td>
                                                                        <td className="py-1.5 px-3 text-center font-bold">{a.percentage}%</td>
                                                                        <td className="py-1.5 px-3 text-center">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                                a.isPassing ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                                                            }`}>
                                                                                {a.isPassing ? "PASS" : "FAIL"}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" onClick={handleCloseStudentDetail} className="text-xs">
                                        Close
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
