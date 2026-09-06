"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Calendar, 
    Plus, 
    Search, 
    Clock, 
    BookOpen, 
    CheckCircle2, 
    AlertCircle, 
    FileText, 
    Users, 
    Filter,
    X,
    Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

type AssessmentType = "EXAM" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "OTHER";

export default function ExamSchedulesPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Filters
    const [selectedType, setSelectedType] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Schedule Exam Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        teachingAssignmentId: "",
        type: "EXAM" as AssessmentType,
        maxScore: "100",
        passingScore: "50",
        dueDate: new Date().toISOString().split("T")[0],
        description: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            // 2. Fetch Teaching Assignments
            const assignRes = await fetchApi("/teacher/assignments");
            if (assignRes.ok) {
                const assignData = await assignRes.json();
                setTeachingAssignments(Array.isArray(assignData) ? assignData : []);
            }

            // 3. Fetch Master Assessments / Exams
            const assessRes = await fetchApi("/assessment");
            if (assessRes.ok) {
                const assessData = await assessRes.json();
                setAssessments(Array.isArray(assessData) ? assessData : []);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load master exam schedules.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.teachingAssignmentId || !formData.dueDate) {
            setError("Title, teaching assignment, and exam date are required.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            if (!activeYear?.id) {
                setError("No active academic year found. Please activate an academic year first.");
                return;
            }

            const payload = {
                academicYearId: activeYear.id,
                title: formData.title.trim(),
                teachingAssignmentId: formData.teachingAssignmentId,
                type: formData.type,
                maxScore: parseFloat(formData.maxScore) || 100,
                passingScore: parseFloat(formData.passingScore) || 50,
                dueDate: formData.dueDate,
                description: formData.description.trim() || undefined
            };

            const response = await fetchApi("/assessment", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || "Failed to schedule exam.");
            }

            setSuccessMsg(`Exam "${formData.title}" scheduled successfully.`);
            setIsModalOpen(false);
            setFormData({
                title: "",
                teachingAssignmentId: "",
                type: "EXAM",
                maxScore: "100",
                passingScore: "50",
                dueDate: new Date().toISOString().split("T")[0],
                description: ""
            });
            loadData();
        } catch (err: any) {
            setError(err.message || "An error occurred while scheduling exam.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter Logic
    const filteredAssessments = useMemo(() => {
        return assessments.filter(item => {
            const matchesType = selectedType === "ALL" || item.type === selectedType;
            const matchesSearch = !searchQuery.trim() ||
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.teachingAssignment?.subject?.name && item.teachingAssignment.subject.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.teachingAssignment?.schoolGrade?.grade?.name && item.teachingAssignment.schoolGrade.grade.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesType && matchesSearch;
        });
    }, [assessments, selectedType, searchQuery]);

    // Metrics
    const totalExams = assessments.filter(a => a.type === "EXAM").length;
    const totalQuizzes = assessments.filter(a => a.type === "QUIZ" || a.type === "ASSIGNMENT").length;
    const upcomingCount = assessments.filter(a => new Date(a.dueDate) >= new Date()).length;

    if (loading && assessments.length === 0) {
        return <LoadingState message="Loading master exam and assessment schedules..." />;
    }

    return (
        <div className="space-y-6 text-black">
            {/* Context SRS Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 8: Master Exam & Assessment Scheduling
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Fills This:</strong> School Principal & Vice-Principals create master Mid-Term/Final Exam timetables; Subject Teachers schedule quizzes.
                        <br />
                        <strong>Data Source:</strong> Saved in `Assessment` table joined with `TeachingAssignment` (Subject, Grade, Section & Teacher).
                        <br />
                        <strong>Who Uses This:</strong> Principals, Teachers, Students & Parents to prepare for scheduled exam dates & passing thresholds.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Calendar className="w-7 h-7 text-[#006b3f]" />
                        <span>Master Exam & Assessment Schedules</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage school-wide exam timetables, passing score thresholds, and assessment dates.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Schedule Exam / Assessment
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Scheduled</p>
                            <p className="text-xl font-bold text-gray-900">{assessments.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Mid-Term & Final Exams</p>
                            <p className="text-xl font-bold text-purple-900">{totalExams}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Quizzes & Assignments</p>
                            <p className="text-xl font-bold text-blue-900">{totalQuizzes}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Upcoming Exams</p>
                            <p className="text-xl font-bold text-amber-900">{upcomingCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notification messages */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}
            {error && (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><AlertCircle className="w-4 h-4 text-red-600" /><span>{error}</span></span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Filter Tabs & Search */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
                        {["ALL", "EXAM", "QUIZ", "ASSIGNMENT", "PROJECT"].map(t => (
                            <button
                                key={t}
                                onClick={() => setSelectedType(t)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedType === t
                                        ? "bg-[#006b3f] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {t.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search exam title or subject..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredAssessments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p className="font-semibold text-gray-700">No scheduled exams found</p>
                            <p className="text-xs text-gray-400 mt-1">Schedule Mid-Term or Final Exams to populate the master assessment calendar.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Assessment Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Subject & Grade</th>
                                        <th className="px-6 py-3.5 font-semibold">Exam Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Pass Threshold</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredAssessments.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <p>{item.title}</p>
                                                {item.description && <p className="text-xs font-normal text-gray-500">{item.description}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.type === "EXAM" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                        EXAM
                                                    </span>
                                                ) : item.type === "QUIZ" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                        QUIZ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {item.type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700">
                                                <p className="font-semibold text-gray-900">{item.teachingAssignment?.subject?.name || "Subject"}</p>
                                                <p className="text-gray-500">
                                                    {item.teachingAssignment?.schoolGrade?.grade?.name || "Grade"}
                                                    {item.teachingAssignment?.section && ` — Sec ${item.teachingAssignment.section.name}`}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-900">
                                                {new Date(item.dueDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">
                                                {item.passingScore || 50} / {item.maxScore || 100} Marks
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="ghost">View Details</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Schedule Exam Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Schedule Exam / Assessment</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExam} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Assessment Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. 2026 Semester 1 Final Exam"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Subject & Grade Assignment *</label>
                                <select
                                    required
                                    value={formData.teachingAssignmentId}
                                    onChange={(e) => setFormData({ ...formData, teachingAssignmentId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="">Select Subject & Grade...</option>
                                    {teachingAssignments.map(ta => (
                                        <option key={ta.id} value={ta.id}>
                                            {ta.subject?.name} — {ta.schoolGrade?.grade?.name} {ta.section ? `(Sec ${ta.section.name})` : "(All Sections)"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="EXAM">Mid-Term / Final Exam</option>
                                        <option value="QUIZ">Continuous Assessment / Quiz</option>
                                        <option value="ASSIGNMENT">Assignment</option>
                                        <option value="PROJECT">Project</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Exam Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Max Score</label>
                                    <input
                                        type="number"
                                        value={formData.maxScore}
                                        onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                                        placeholder="100"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Passing Mark</label>
                                    <input
                                        type="number"
                                        value={formData.passingScore}
                                        onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                                        placeholder="50"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description / Instructions</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Instructions for students & exam hall supervisors..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                    Schedule Exam
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
