"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, GraduationCap, Plus, Trash2, CheckSquare, Square, UserCheck, BookOpen, Layers, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

export default function ManageTeacherAssignmentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTeacherId = searchParams.get("teacherId") || "";

    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId);

    const [subjects, setSubjects] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [assignments, setAssignments] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state for creating assignments
    const [formData, setFormData] = useState({
        subjectId: "",
        schoolGradeId: "",
        selectedSectionIds: [] as string[],
        assignAllSections: false,
        periodsPerWeek: 5
    });

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Academic Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            // 2. Fetch Active Teachers
            const teachersRes = await fetchApi("/teacher");
            if (teachersRes.ok) {
                const teacherData = await teachersRes.json();
                setTeachers(teacherData);
                if (!initialTeacherId && teacherData.length > 0) {
                    setSelectedTeacherId(teacherData[0].id);
                }
            }

            // 3. Fetch All Assignments for Academic Year
            const assignRes = await fetchApi("/teacher/assignments");
            if (assignRes.ok) {
                setAssignments(await assignRes.json());
            }

            // 4. Fetch Subjects & Grades
            if (active) {
                const [subjRes, gradesRes] = await Promise.all([
                    fetchApi("/academic/subjects"),
                    fetchApi(`/academic/years/${active.id}/grades`)
                ]);
                if (subjRes.ok) setSubjects(await subjRes.json());
                if (gradesRes.ok) setGrades(await gradesRes.json());
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

    // Load Sections whenever Grade changes
    useEffect(() => {
        if (formData.schoolGradeId) {
            fetchApi(`/academic/grades/${formData.schoolGradeId}/sections`)
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    setSections(data);
                    setFormData(prev => ({ ...prev, selectedSectionIds: [], assignAllSections: false }));
                })
                .catch(() => setSections([]));
        } else {
            setSections([]);
            setFormData(prev => ({ ...prev, selectedSectionIds: [], assignAllSections: false }));
        }
    }, [formData.schoolGradeId]);

    const selectedTeacher = useMemo(() => {
        return teachers.find(t => t.id === selectedTeacherId) || null;
    }, [teachers, selectedTeacherId]);

    const teacherAssignments = useMemo(() => {
        return assignments.filter(a => a.teacherId === selectedTeacherId);
    }, [assignments, selectedTeacherId]);

    const handleSelectAllSections = (checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            assignAllSections: checked,
            selectedSectionIds: checked ? sections.map(s => s.id) : []
        }));
    };

    const handleSectionToggle = (sectionId: string) => {
        setFormData(prev => {
            const exists = prev.selectedSectionIds.includes(sectionId);
            const updated = exists 
                ? prev.selectedSectionIds.filter(id => id !== sectionId)
                : [...prev.selectedSectionIds, sectionId];
            return {
                ...prev,
                selectedSectionIds: updated,
                assignAllSections: updated.length === sections.length && sections.length > 0
            };
        });
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacherId || !activeYear) return;
        if (!formData.subjectId || !formData.schoolGradeId) {
            setError("Please select both a Subject and a Grade.");
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = {
                teacherId: selectedTeacherId,
                academicYearId: activeYear.id,
                subjectId: formData.subjectId,
                schoolGradeId: formData.schoolGradeId,
                sectionIds: formData.selectedSectionIds.length > 0 ? formData.selectedSectionIds : undefined,
                sectionId: formData.selectedSectionIds.length === 0 ? undefined : undefined,
                periodsPerWeek: Number(formData.periodsPerWeek) || 5
            };

            const res = await fetchApi("/teacher/assignments", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create teaching assignments");
            }

            setSuccessMessage("Teaching assignments created successfully!");
            
            // Reload assignments
            const assignRes = await fetchApi("/teacher/assignments");
            if (assignRes.ok) {
                setAssignments(await assignRes.json());
            }

            // Reset form selections
            setFormData(prev => ({
                ...prev,
                subjectId: "",
                selectedSectionIds: [],
                assignAllSections: false
            }));
        } catch (err: any) {
            setError(err.message || "Failed to create assignment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (!confirm("Are you sure you want to remove this assignment?")) return;

        try {
            const res = await fetchApi(`/teacher/assignments/${assignmentId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete assignment");
            }

            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
            setSuccessMessage("Assignment removed.");
        } catch (err: any) {
            setError(err.message || "Failed to delete assignment");
        }
    };

    if (loading) {
        return <LoadingState message="Loading teacher assignments manager..." />;
    }

    if (error && teachers.length === 0) {
        return <ErrorState message={error} onRetry={loadInitialData} />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push("/dashboard/teachers/assignments")}
                        className="mb-2 text-gray-500 hover:text-gray-900"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Back to All Assignments
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <GraduationCap className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Manage Teacher Assignments
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Assign teachers to multiple grades, sections, and subjects for <span className="font-semibold text-[#006b3f]">{activeYear?.name}</span>
                    </p>
                </div>
            </div>

            {/* Global Alerts */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 font-bold ml-4">&times;</button>
                </div>
            )}
            {successMessage && (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-200 flex items-center justify-between">
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold ml-4">&times;</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Teacher Selection & Summary Card */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-4 border-b border-gray-100">
                            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
                                <UserCheck className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Select Teacher
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                    Teacher Name
                                </label>
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none font-medium"
                                >
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.firstName} {t.lastName} ({t.staffIdCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedTeacher && (
                                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-[#006b3f] text-white flex items-center justify-center font-bold text-lg">
                                            {selectedTeacher.firstName[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {selectedTeacher.firstName} {selectedTeacher.lastName}
                                            </h3>
                                            <p className="text-xs text-gray-500">Staff ID: {selectedTeacher.staffIdCode}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100 text-xs">
                                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                            <p className="text-gray-500 font-medium">Assigned Classes</p>
                                            <p className="text-lg font-bold text-[#006b3f]">{teacherAssignments.length}</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                            <p className="text-gray-500 font-medium">Total Weekly Periods</p>
                                            <p className="text-lg font-bold text-[#006b3f]">
                                                {teacherAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 5), 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Current Assigned Summary for selected teacher */}
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Active Assignments ({teacherAssignments.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                            {teacherAssignments.length === 0 ? (
                                <p className="p-4 text-xs text-gray-500 text-center italic">No assignments for this teacher yet.</p>
                            ) : (
                                teacherAssignments.map(a => (
                                    <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900">{a.subject?.name || "Subject"}</p>
                                            <p className="text-xs text-gray-500">
                                                {a.schoolGrade?.grade?.name || "Grade"} • Section: <span className="font-medium text-gray-700">{a.section?.name || "All Sections"}</span>
                                            </p>
                                            <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium mt-1">
                                                <Clock className="w-3 h-3 mr-1" /> {a.periodsPerWeek || 5} Periods/Week
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAssignment(a.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Remove assignment"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Multi-Grade & Multi-Section Assignment Form */}
                <div className="lg:col-span-8">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-4 border-b border-gray-100">
                            <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                                <Plus className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Add Teaching Assignments
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                                Select a subject, grade, and pick multiple sections at once to assign {selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : "this teacher"}.
                            </p>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            <form onSubmit={handleAssign} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Subject Dropdown */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                            Subject <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.subjectId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                            required
                                        >
                                            <option value="">Select Subject...</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.code || "Core"})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Grade Dropdown */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                            Grade <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.schoolGradeId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, schoolGradeId: e.target.value }))}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                            required
                                        >
                                            <option value="">Select Grade...</option>
                                            {grades.map(g => (
                                                <option key={g.id} value={g.id}>{g.grade?.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Section Multi-Select Area */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-semibold uppercase text-gray-700">
                                            Assign Sections
                                        </label>
                                        {sections.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleSelectAllSections(!formData.assignAllSections)}
                                                className="text-xs text-[#006b3f] font-semibold hover:underline flex items-center"
                                            >
                                                {formData.assignAllSections ? (
                                                    <><CheckSquare className="w-3.5 h-3.5 mr-1" /> Deselect All</>
                                                ) : (
                                                    <><Square className="w-3.5 h-3.5 mr-1" /> Select All Sections</>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {!formData.schoolGradeId ? (
                                        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-500">
                                            Please select a Grade above to view and assign sections.
                                        </div>
                                    ) : sections.length === 0 ? (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center text-xs text-yellow-700">
                                            No sections configured for this grade. The assignment will apply to <b>All Sections</b> by default.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
                                            {sections.map(sec => {
                                                const isSelected = formData.selectedSectionIds.includes(sec.id);
                                                return (
                                                    <div
                                                        key={sec.id}
                                                        onClick={() => handleSectionToggle(sec.id)}
                                                        className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                                                            isSelected 
                                                                ? "bg-emerald-50 border-[#006b3f] text-[#006b3f] font-bold shadow-sm" 
                                                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                                        }`}
                                                    >
                                                        <span className="text-sm">Section {sec.name}</span>
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-[#006b3f]" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Weekly Periods */}
                                <div className="max-w-xs">
                                    <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                        Required Weekly Periods per Section
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.periodsPerWeek}
                                        onChange={(e) => setFormData(prev => ({ ...prev, periodsPerWeek: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                        required
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">Default is 5 periods/week.</p>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push("/dashboard/teachers/assignments")}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        isLoading={submitting}
                                        disabled={!selectedTeacherId || !formData.subjectId || !formData.schoolGradeId}
                                        className="bg-[#006b3f] hover:bg-[#005432] text-white"
                                    >
                                        Save Teaching Assignments
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
