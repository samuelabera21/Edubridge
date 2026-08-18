"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    FileText, 
    User, 
    Award, 
    BookOpen, 
    CheckCircle2, 
    AlertCircle, 
    Search,
    Printer
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

export default function StudentResultsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);

    // Selection States
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");

    // Report Card State
    const [reportCard, setReportCard] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingReport, setLoadingReport] = useState(false);
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
                const sgRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (sgRes.ok) {
                    const sgData = await sgRes.json();
                    setSchoolGrades(sgData);
                    if (sgData.length > 0) {
                        setSelectedGradeId(sgData[0].id);
                    }
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

    // 3. Fetch Enrolled Students for Selected Section
    useEffect(() => {
        if (!selectedSectionId) {
            setEnrollments([]);
            setSelectedEnrollmentId("");
            return;
        }

        const fetchEnrollments = async () => {
            try {
                const res = await fetchApi("/student/enrollments");
                if (res.ok) {
                    const data = await res.json();
                    const sectionEnrollments = data.filter((e: any) => e.sectionId === selectedSectionId);
                    setEnrollments(sectionEnrollments);
                    if (sectionEnrollments.length > 0) {
                        setSelectedEnrollmentId(sectionEnrollments[0].id);
                    } else {
                        setSelectedEnrollmentId("");
                    }
                }
            } catch (err) {
                console.error("Failed to load enrollments", err);
            }
        };

        fetchEnrollments();
    }, [selectedSectionId]);

    // 4. Fetch Student Report Card
    useEffect(() => {
        if (!selectedEnrollmentId) {
            setReportCard(null);
            return;
        }

        const fetchReportCard = async () => {
            try {
                setLoadingReport(true);
                const res = await fetchApi(`/assessment/student/${selectedEnrollmentId}/report-card`);
                if (res.ok) {
                    const data = await res.json();
                    setReportCard(data);
                } else {
                    setReportCard(null);
                }
            } catch (err) {
                console.error("Error loading report card", err);
                setReportCard(null);
            } finally {
                setLoadingReport(false);
            }
        };

        fetchReportCard();
    }, [selectedEnrollmentId]);

    if (loading) return <LoadingState message="Loading student results..." />;
    if (error) return <ErrorState message={error} onRetry={loadInitialData} />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Student Academic Report Cards
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View assessment grades and report cards for <span className="font-semibold text-[#006b3f]">{activeYear?.name}</span>
                    </p>
                </div>

                {reportCard && (
                    <Button 
                        variant="outline" 
                        onClick={() => window.print()}
                        leftIcon={<Printer className="w-4 h-4" />}
                    >
                        Print Report Card
                    </Button>
                )}
            </div>

            {/* Filter Controls */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Grade
                        </label>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] outline-none font-medium text-gray-900"
                        >
                            {schoolGrades.map((sg) => (
                                <option key={sg.id} value={sg.id}>
                                    {sg.grade?.name || "Grade"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Section
                        </label>
                        <select
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] outline-none font-medium text-gray-900"
                        >
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    Section {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Select Student
                        </label>
                        <select
                            value={selectedEnrollmentId}
                            onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] outline-none font-medium text-gray-900"
                        >
                            {enrollments.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.student?.firstName} {e.student?.lastName} ({e.studentIdCode || "N/A"})
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Report Card Display */}
            {loadingReport ? (
                <LoadingState message="Generating student report card..." />
            ) : !reportCard ? (
                <EmptyState 
                    title="No Student Selected" 
                    message="Select a grade, section, and student above to generate the academic report card." 
                />
            ) : (
                <div className="space-y-6">
                    {/* Student Overview Header Card */}
                    <Card className="bg-gradient-to-r from-emerald-900 via-[#006b3f] to-emerald-800 text-white shadow-md border-0">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                                    <User className="w-7 h-7 text-emerald-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {reportCard.student?.firstName} {reportCard.student?.lastName}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-emerald-200 mt-1">
                                        <span>ID: <strong className="text-white font-mono">{reportCard.enrollment?.studentIdCode}</strong></span>
                                        <span>•</span>
                                        <span>{reportCard.enrollment?.schoolGrade?.grade?.name} - Section {reportCard.enrollment?.section?.name}</span>
                                        <span>•</span>
                                        <span>{reportCard.enrollment?.academicYear?.name}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10 self-stretch sm:self-auto justify-between sm:justify-start">
                                <div>
                                    <p className="text-xs font-semibold text-emerald-200 uppercase">Overall Mark</p>
                                    <p className="text-2xl font-bold text-white mt-0.5">
                                        {reportCard.totalEarned} / {reportCard.totalMax}
                                    </p>
                                </div>
                                <div className="pl-4 border-l border-white/20 text-right">
                                    <p className="text-xs font-semibold text-emerald-200 uppercase">Average</p>
                                    <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-bold ${
                                        reportCard.status === "PASS" ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"
                                    }`}>
                                        {reportCard.overallPercentage}% ({reportCard.status})
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subject Performance Breakdown Table */}
                    {reportCard.subjectSummaries.length === 0 ? (
                        <EmptyState 
                            title="No Assessment Grades Recorded" 
                            message="This student has no graded exams or quizzes for the selected academic period yet." 
                        />
                    ) : (
                        <Card className="border-gray-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-gray-50/70 border-b border-gray-200 py-4">
                                <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
                                    <BookOpen className="w-5 h-5 mr-2 text-[#006b3f]" />
                                    Subject Academic Performance Breakdown
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-200">
                                    {reportCard.subjectSummaries.map((subj: any) => (
                                        <div key={subj.subjectName} className="p-6 space-y-3 bg-white hover:bg-gray-50/50 transition">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                                                <div>
                                                    <h4 className="text-base font-bold text-gray-900">{subj.subjectName}</h4>
                                                    <p className="text-xs text-gray-500">Subject Teacher: {subj.teacherName}</p>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        Total: {subj.totalEarned} / {subj.totalMax} pts
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                                                        subj.averagePercentage >= 50 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                                                    }`}>
                                                        {subj.averagePercentage}% Avg
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Assessments List for Subject */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="text-gray-500 bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 font-semibold">Assessment Title</th>
                                                            <th className="px-4 py-2 font-semibold">Type</th>
                                                            <th className="px-4 py-2 font-semibold">Score Earned</th>
                                                            <th className="px-4 py-2 font-semibold">Percentage</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {subj.assessments.map((a: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 font-medium text-gray-900">{a.title}</td>
                                                                <td className="px-4 py-2 text-gray-600">{a.type}</td>
                                                                <td className="px-4 py-2 font-semibold text-[#006b3f]">{a.score} / {a.maxScore}</td>
                                                                <td className="px-4 py-2 font-medium text-gray-700">{a.percentage}%</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
