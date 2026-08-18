"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    FileText, 
    Plus, 
    Calendar, 
    Award, 
    TrendingUp, 
    CheckCircle2, 
    XCircle,
    UserCheck,
    BookOpen,
    User,
    Eye,
    Save,
    Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

type AssessmentType = "EXAM" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "OTHER";

export default function AssessmentsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);

    // Selection States
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");

    // Modal & Gradebook Inspection States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAssessmentForGradebook, setSelectedAssessmentForGradebook] = useState<any>(null);
    const [gradebookRoster, setGradebookRoster] = useState<any[]>([]);
    const [loadingGradebook, setLoadingGradebook] = useState(false);
    const [savingGradebook, setSavingGradebook] = useState(false);

    // Form State
    const [createForm, setCreateForm] = useState({
        teachingAssignmentId: "",
        title: "",
        type: "EXAM" as AssessmentType,
        maxScore: "100",
        passingScore: "50",
        dueDate: new Date().toISOString().split("T")[0],
        description: ""
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Initial Load
    const loadInitialData = async () => {
        try {
            setLoading(true);
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            if (active) {
                // Fetch SchoolGrades
                let sgData: any[] = [];
                const sgRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (sgRes.ok) sgData = await sgRes.json();
                setSchoolGrades(sgData);
                if (sgData.length > 0) {
                    setSelectedGradeId(sgData[0].id);
                }

                // Fetch Teaching Assignments for creating test assessments
                const taRes = await fetchApi("/teacher/assignments");
                if (taRes.ok) {
                    const taData = await taRes.json();
                    setTeachingAssignments(taData);
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
        loadInitialData();
    }, []);

    // 2. Sections update on Grade change
    useEffect(() => {
        if (!selectedGradeId) {
            setSections([]);
            setSelectedSectionId("");
            return;
        }

        const currentSG = schoolGrades.find(sg => sg.id === selectedGradeId);
        if (currentSG && currentSG.sections && currentSG.sections.length > 0) {
            setSections(currentSG.sections);
            setSelectedSectionId(currentSG.sections[0].id);
        } else {
            setSections([]);
            setSelectedSectionId("");
        }
    }, [selectedGradeId, schoolGrades]);

    // 3. Fetch Assessments for Selected Section
    const loadAssessments = async () => {
        if (!selectedSectionId || !activeYear) {
            setAssessments([]);
            return;
        }

        try {
            const res = await fetchApi(`/assessment?sectionId=${selectedSectionId}&academicYearId=${activeYear.id}`);
            if (res.ok) {
                const data = await res.json();
                setAssessments(data);
            }
        } catch (err) {
            console.error("Failed to load assessments", err);
        }
    };

    useEffect(() => {
        loadAssessments();
    }, [selectedSectionId, activeYear]);

    // Available Teaching Assignments for selected section
    const availableAssignmentsForSection = useMemo(() => {
        if (!selectedSectionId) return [];
        return teachingAssignments.filter(ta => ta.sectionId === selectedSectionId);
    }, [selectedSectionId, teachingAssignments]);

    // Open Gradebook Inspector for an Assessment
    const handleOpenGradebook = async (assessment: any) => {
        setSelectedAssessmentForGradebook(assessment);
        try {
            setLoadingGradebook(true);
            const res = await fetchApi(`/assessment/${assessment.id}/results`);
            if (res.ok) {
                const data = await res.json();
                const roster = data.rosterResults.map((item: any) => ({
                    enrollmentId: item.enrollment.id,
                    studentName: `${item.enrollment.student?.firstName || ""} ${item.enrollment.student?.lastName || ""}`.trim(),
                    studentIdCode: item.enrollment.studentIdCode || "N/A",
                    score: item.result ? item.result.score : "",
                    feedback: item.result ? item.result.feedback || "" : ""
                }));
                setGradebookRoster(roster);
            }
        } catch (err) {
            console.error("Error loading gradebook roster", err);
        } finally {
            setLoadingGradebook(false);
        }
    };

    // Save Gradebook Marks (Admin Test / Override)
    const handleSaveGradebook = async () => {
        if (!selectedAssessmentForGradebook) return;

        const validResults = gradebookRoster
            .filter(r => r.score !== "" && !isNaN(Number(r.score)))
            .map(r => ({
                enrollmentId: r.enrollmentId,
                score: Number(r.score),
                feedback: r.feedback
            }));

        if (validResults.length === 0) {
            alert("Please enter a valid numeric score for at least one student.");
            return;
        }

        try {
            setSavingGradebook(true);
            const res = await fetchApi("/assessment/results/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assessmentId: selectedAssessmentForGradebook.id,
                    results: validResults
                })
            });

            if (!res.ok) throw new Error("Failed to save gradebook marks");

            alert("Successfully saved student assessment marks!");
            setSelectedAssessmentForGradebook(null);
            loadAssessments();
        } catch (err: any) {
            alert(err.message || "Failed to save marks");
        } finally {
            setSavingGradebook(false);
        }
    };

    // Create Assessment Handler (Admin Test Creation)
    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeYear || !createForm.teachingAssignmentId || !createForm.title) return;

        try {
            const res = await fetchApi("/assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: activeYear.id,
                    teachingAssignmentId: createForm.teachingAssignmentId,
                    title: createForm.title,
                    type: createForm.type,
                    maxScore: Number(createForm.maxScore),
                    passingScore: Number(createForm.passingScore),
                    dueDate: createForm.dueDate,
                    description: createForm.description
                })
            });

            if (!res.ok) throw new Error("Failed to create assessment");

            setIsCreateModalOpen(false);
            setCreateForm({
                teachingAssignmentId: "",
                title: "",
                type: "EXAM",
                maxScore: "100",
                passingScore: "50",
                dueDate: new Date().toISOString().split("T")[0],
                description: ""
            });
            loadAssessments();
        } catch (err: any) {
            alert(err.message || "Failed to create assessment");
        }
    };

    // Calculate Class Metrics
    const metrics = useMemo(() => {
        const total = assessments.length;
        let totalScoreSum = 0;
        let totalMaxSum = 0;
        let totalGradedCount = 0;

        assessments.forEach(a => {
            if (a.results && a.results.length > 0) {
                a.results.forEach((r: any) => {
                    totalScoreSum += r.score;
                    totalMaxSum += a.maxScore;
                    totalGradedCount++;
                });
            }
        });

        const classAverage = totalMaxSum > 0 ? Math.round((totalScoreSum / totalMaxSum) * 100) : 0;

        return { total, classAverage, totalGradedCount };
    }, [assessments]);

    if (loading) return <LoadingState message="Loading assessment oversight dashboard..." />;
    if (error) return <ErrorState message={error} onRetry={loadInitialData} />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Assessment & Gradebook Oversight
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitor published exams, quizzes, and continuous grades submitted by teachers for <span className="font-semibold text-[#006b3f]">{activeYear?.name}</span>
                    </p>
                </div>

                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="bg-[#006b3f] hover:bg-[#005432]"
                >
                    Create Test Assessment
                </Button>
            </div>

            {/* Filter Bar */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            School Grade
                        </label>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition font-medium text-gray-900"
                        >
                            {schoolGrades.map((sg) => (
                                <option key={sg.id} value={sg.id}>
                                    {sg.grade?.name || "Grade"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Class Section
                        </label>
                        <select
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition font-medium text-gray-900"
                        >
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    Section {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Assessments</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-[#006b3f]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-700 font-semibold uppercase">Section Avg Score</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.classAverage}%</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-700 font-semibold uppercase">Graded Records</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{metrics.totalGradedCount}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Award className="w-5 h-5 text-blue-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assessments Table */}
            {assessments.length === 0 ? (
                <EmptyState 
                    title="No Assessments Published" 
                    message="There are no exams or quizzes created for this section yet. Click 'Create Test Assessment' above to test!" 
                />
            ) : (
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/70 border-b border-gray-200 py-4">
                        <CardTitle className="text-base font-semibold text-gray-900">
                            Section Assessments & Gradebook Status
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Title & Type</th>
                                        <th className="px-6 py-3.5 font-semibold">Subject & Teacher</th>
                                        <th className="px-6 py-3.5 font-semibold">Max Score</th>
                                        <th className="px-6 py-3.5 font-semibold">Due Date</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {assessments.map((assessment) => (
                                        <tr key={assessment.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{assessment.title}</p>
                                                <span className="inline-block mt-0.5 text-xs font-semibold bg-emerald-50 text-[#006b3f] px-2 py-0.5 rounded">
                                                    {assessment.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-800">
                                                    {assessment.teachingAssignment?.subject?.name || "Subject"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Teacher: {assessment.teachingAssignment?.teacher ? `${assessment.teachingAssignment.teacher.firstName} ${assessment.teachingAssignment.teacher.lastName}` : "Unassigned"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-[#006b3f]">
                                                {assessment.maxScore} pts
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : "No due date"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleOpenGradebook(assessment)}
                                                    leftIcon={<Eye className="w-4 h-4" />}
                                                >
                                                    Inspect Gradebook
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

            {/* Gradebook Inspector Modal */}
            {selectedAssessmentForGradebook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Gradebook Inspector: {selectedAssessmentForGradebook.title}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Subject: {selectedAssessmentForGradebook.teachingAssignment?.subject?.name} | Max Score: {selectedAssessmentForGradebook.maxScore} pts
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedAssessmentForGradebook(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {loadingGradebook ? (
                            <LoadingState message="Loading roster scores..." />
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-2.5">Student</th>
                                                <th className="px-4 py-2.5">Score (out of {selectedAssessmentForGradebook.maxScore})</th>
                                                <th className="px-4 py-2.5">Feedback / Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {gradebookRoster.map((row, idx) => (
                                                <tr key={row.enrollmentId}>
                                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                                        {row.studentName}
                                                        <span className="block text-xs font-mono text-gray-500 font-normal">{row.studentIdCode}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            max={selectedAssessmentForGradebook.maxScore}
                                                            min={0}
                                                            value={row.score}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setGradebookRoster(prev => prev.map((item, i) => i === idx ? { ...item, score: val } : item));
                                                            }}
                                                            placeholder={`0 - ${selectedAssessmentForGradebook.maxScore}`}
                                                            className="w-28 h-9 px-3 border border-gray-300 rounded-md text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#006b3f]"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={row.feedback}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setGradebookRoster(prev => prev.map((item, i) => i === idx ? { ...item, feedback: val } : item));
                                                            }}
                                                            placeholder="Optional comment..."
                                                            className="w-full h-9 px-3 border border-gray-200 rounded-md text-xs outline-none focus:border-[#006b3f]"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end space-x-3 pt-2">
                                    <Button variant="outline" onClick={() => setSelectedAssessmentForGradebook(null)}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleSaveGradebook} 
                                        isLoading={savingGradebook}
                                        leftIcon={<Save className="w-4 h-4" />}
                                        className="bg-[#006b3f] hover:bg-[#005432]"
                                    >
                                        Save All Marks
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Assessment Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={handleCreateAssessment} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
                            Create Test Assessment
                        </h3>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Subject & Teacher Assignment
                            </label>
                            <select
                                required
                                value={createForm.teachingAssignmentId}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, teachingAssignmentId: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] outline-none"
                            >
                                <option value="">-- Select Subject & Teacher --</option>
                                {availableAssignmentsForSection.map((ta) => (
                                    <option key={ta.id} value={ta.id}>
                                        {ta.subject?.name} - Teacher: {ta.teacher?.firstName} {ta.teacher?.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Assessment Title
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Midterm Exam, Quiz 1"
                                value={createForm.title}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                    Type
                                </label>
                                <select
                                    value={createForm.type}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value as AssessmentType }))}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f]"
                                >
                                    <option value="EXAM">EXAM</option>
                                    <option value="QUIZ">QUIZ</option>
                                    <option value="ASSIGNMENT">ASSIGNMENT</option>
                                    <option value="PROJECT">PROJECT</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                    Max Score
                                </label>
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    value={createForm.maxScore}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxScore: e.target.value }))}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-[#006b3f] hover:bg-[#005432]">
                                Publish Assessment
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
