"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ArrowLeft, GraduationCap, Plus, Trash2, CheckSquare, Square, 
    UserCheck, BookOpen, Clock, AlertTriangle, CheckCircle2, 
    Award, ShieldCheck, HelpCircle, Calendar, AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

export default function ManageTeacherAssignmentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTeacherId = searchParams.get("teacherId") || "";
    const initialYearId = searchParams.get("yearId") || "";
    const initialGradeId = searchParams.get("schoolGradeId") || "";
    const initialSectionId = searchParams.get("sectionId") || "";
    const initialSubjectId = searchParams.get("subjectId") || "";

    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>(initialYearId);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId);

    const [teacherSpecializations, setTeacherSpecializations] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [gradeSubjects, setGradeSubjects] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [assignments, setAssignments] = useState<any[]>([]);
    const [specializationMatch, setSpecializationMatch] = useState<any | null>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state for creating assignments
    const [formData, setFormData] = useState({
        subjectId: initialSubjectId,
        schoolGradeId: initialGradeId,
        selectedSectionIds: initialSectionId ? [initialSectionId] : [] as string[],
        assignAllSections: false,
        periodsPerWeek: 5,
        asProposal: false
    });

    const isPrincipalOrAdmin = authData?.access.some(acc => 
        ["PRINCIPAL", "ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name)
    );

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Academic Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            let chosenYearId = initialYearId;
            if (!chosenYearId) {
                const active = yearsData.find(y => y.status === "ACTIVE") || yearsData.find(y => y.status === "PLANNED") || yearsData[0];
                chosenYearId = active ? active.id : "";
            }
            setSelectedYearId(chosenYearId);

            // 2. Fetch Active Teachers
            const teachersRes = await fetchApi("/teacher");
            if (teachersRes.ok) {
                const teacherData = await teachersRes.json();
                setTeachers(teacherData);
                if (!initialTeacherId && teacherData.length > 0) {
                    setSelectedTeacherId(teacherData[0].id);
                }
            }

            // 3. Fetch Grades for chosen Year
            if (chosenYearId) {
                const [gradesRes, assignRes] = await Promise.all([
                    fetchApi(`/academic/years/${chosenYearId}/grades`),
                    fetchApi(`/teacher/assignments?academicYearId=${chosenYearId}`)
                ]);
                if (gradesRes.ok) setGrades(await gradesRes.json());
                if (assignRes.ok) setAssignments(await assignRes.json());
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

    // Year change
    const handleYearChange = async (yearId: string) => {
        setSelectedYearId(yearId);
        try {
            const [gradesRes, assignRes] = await Promise.all([
                fetchApi(`/academic/years/${yearId}/grades`),
                fetchApi(`/teacher/assignments?academicYearId=${yearId}`)
            ]);
            if (gradesRes.ok) setGrades(await gradesRes.json());
            if (assignRes.ok) setAssignments(await assignRes.json());
            setFormData(prev => ({ ...prev, schoolGradeId: "", subjectId: "", selectedSectionIds: [] }));
        } catch (e: any) {
            setError(e.message || "Failed to switch academic year");
        }
    };

    // Load teacher specializations when teacher changes
    useEffect(() => {
        if (selectedTeacherId) {
            fetchApi(`/teacher/${selectedTeacherId}/specializations`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setTeacherSpecializations(data))
                .catch(() => setTeacherSpecializations([]));
        } else {
            setTeacherSpecializations([]);
        }
    }, [selectedTeacherId]);

    // Load Sections & Grade Curriculum Subjects whenever Grade changes
    useEffect(() => {
        if (formData.schoolGradeId) {
            Promise.all([
                fetchApi(`/academic/grades/${formData.schoolGradeId}/sections`),
                fetchApi(`/academic/grades/school-grades/${formData.schoolGradeId}/subjects`)
            ]).then(async ([secRes, subjRes]) => {
                if (secRes.ok) {
                    const secData = await secRes.json();
                    setSections(secData);
                } else {
                    setSections([]);
                }

                if (subjRes.ok) {
                    const subjData = await subjRes.json();
                    setGradeSubjects(subjData);

                    // If subjectId is selected, auto-populate periodsPerWeek
                    if (formData.subjectId) {
                        const match = subjData.find((s: any) => s.subjectId === formData.subjectId);
                        if (match && match.weeklyPeriods) {
                            setFormData(prev => ({ ...prev, periodsPerWeek: match.weeklyPeriods }));
                        }
                    }
                } else {
                    setGradeSubjects([]);
                }
            }).catch(() => {
                setSections([]);
                setGradeSubjects([]);
            });
        } else {
            setSections([]);
            setGradeSubjects([]);
            setFormData(prev => ({ ...prev, selectedSectionIds: [], assignAllSections: false }));
        }
    }, [formData.schoolGradeId]);

    // When subject changes, auto-set weekly periods & evaluate specialization match
    useEffect(() => {
        if (formData.subjectId && gradeSubjects.length > 0) {
            const match = gradeSubjects.find((s: any) => s.subjectId === formData.subjectId);
            if (match && match.weeklyPeriods) {
                setFormData(prev => ({ ...prev, periodsPerWeek: match.weeklyPeriods }));
            }
        }

        if (selectedTeacherId && formData.subjectId && formData.schoolGradeId) {
            const selectedGrade = grades.find(g => g.id === formData.schoolGradeId);
            const level = selectedGrade?.grade?.level || 9;
            fetchApi(`/teacher/staffing/evaluate-match?teacherId=${selectedTeacherId}&subjectId=${formData.subjectId}&gradeLevel=${level}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => setSpecializationMatch(data))
                .catch(() => setSpecializationMatch(null));
        } else {
            setSpecializationMatch(null);
        }
    }, [formData.subjectId, formData.schoolGradeId, selectedTeacherId, gradeSubjects, grades]);

    const selectedYear = useMemo(() => {
        return years.find(y => y.id === selectedYearId) || null;
    }, [years, selectedYearId]);

    const selectedTeacher = useMemo(() => {
        return teachers.find(t => t.id === selectedTeacherId) || null;
    }, [teachers, selectedTeacherId]);

    const teacherAssignments = useMemo(() => {
        return assignments.filter(a => a.teacherId === selectedTeacherId);
    }, [assignments, selectedTeacherId]);

    const currentTeacherPeriods = useMemo(() => {
        return teacherAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 5), 0);
    }, [teacherAssignments]);

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
        if (!selectedTeacherId || !selectedYearId) return;
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
                academicYearId: selectedYearId,
                subjectId: formData.subjectId,
                schoolGradeId: formData.schoolGradeId,
                sectionIds: formData.selectedSectionIds.length > 0 ? formData.selectedSectionIds : undefined,
                sectionId: formData.selectedSectionIds.length === 0 ? undefined : undefined,
                periodsPerWeek: Number(formData.periodsPerWeek) || 5,
                asProposal: formData.asProposal
            };

            const res = await fetchApi("/teacher/assignments", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create teaching assignments");
            }

            setSuccessMessage(
                formData.asProposal 
                    ? "Teaching assignment proposal submitted for Principal approval!" 
                    : "Teaching assignments created and activated successfully!"
            );
            
            // Reload assignments
            const assignRes = await fetchApi(`/teacher/assignments?academicYearId=${selectedYearId}`);
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
        if (!confirm("Are you sure you want to end or remove this assignment? Any student assessments and attendance will remain safely preserved.")) return;

        try {
            const res = await fetchApi(`/teacher/assignments/${assignmentId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete assignment");
            }

            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
            setSuccessMessage("Assignment successfully ended.");
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
                        Back to Staffing Overview
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <GraduationCap className="w-7 h-7 text-[#006b3f]" />
                        <span>Manage Instructional Allocations</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Allocate verified subject periods, match teacher qualifications, and govern workload thresholds
                    </p>
                </div>

                {/* Academic Year Switcher */}
                <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-600">Target Year:</span>
                    <select
                        value={selectedYearId}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="text-xs font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y.id} value={y.id}>
                                {y.name} {y.status === "ACTIVE" ? "(ACTIVE)" : y.status === "PLANNED" ? "(PLANNED)" : `(${y.status})`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Global Alerts */}
            {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm border border-red-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-500 font-bold ml-4">&times;</button>
                </div>
            )}
            {successMessage && (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold ml-4">&times;</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Teacher Profile, Specializations & Current Load */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-4 border-b border-gray-100">
                            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
                                <UserCheck className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Select Faculty Member
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
                                            {t.firstName} {t.lastName} ({t.staffIdCode || t.employeeId || "Staff"})
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
                                            <p className="text-xs text-gray-500">
                                                Staff ID: {selectedTeacher.staffIdCode || selectedTeacher.employeeId || "Staff"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Workload Metric */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100 text-xs">
                                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                            <p className="text-gray-500 font-medium">Assigned Classes</p>
                                            <p className="text-lg font-bold text-[#006b3f]">{teacherAssignments.length}</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                            <p className="text-gray-500 font-medium">Weekly Load</p>
                                            <p className={`text-lg font-bold ${
                                                currentTeacherPeriods > 28 ? "text-red-600" : currentTeacherPeriods < 18 ? "text-amber-600" : "text-[#006b3f]"
                                            }`}>
                                                {currentTeacherPeriods} <span className="text-xs font-normal text-gray-500">p/wk</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Specializations Badges */}
                                    <div className="pt-2 border-t border-emerald-100">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Verified Specializations:
                                        </p>
                                        {teacherSpecializations.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">No formal subject specializations registered.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {teacherSpecializations.map((spec: any) => (
                                                    <span 
                                                        key={spec.subjectId}
                                                        className="text-[10px] px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 flex items-center space-x-1"
                                                    >
                                                        <Award className="w-3 h-3 text-[#006b3f]" />
                                                        <span>{spec.subject?.name}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Active Assignments for selected teacher */}
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Current Allocations ({teacherAssignments.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                            {teacherAssignments.length === 0 ? (
                                <p className="p-4 text-xs text-gray-500 text-center italic">No assignments for this teacher in {selectedYear?.name}.</p>
                            ) : (
                                teacherAssignments.map(a => (
                                    <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900">{a.subject?.name || "Subject"}</p>
                                            <p className="text-xs text-gray-500">
                                                {a.schoolGrade?.grade?.name || "Grade"} &bull; Section: <span className="font-medium text-gray-700">{a.section?.name || "All Sections"}</span>
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                                                    <Clock className="w-3 h-3 mr-1" /> {a.periodsPerWeek || 5} p/wk
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                    a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                }`}>
                                                    {a.status}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAssignment(a.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Safely end assignment (preserves marks)"
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
                                Allocate Teaching Assignment
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                                Select grade, configured curriculum subject, and assign one or multiple sections to {selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : "the faculty member"}.
                            </p>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            <form onSubmit={handleAssign} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Grade Dropdown */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                            Grade Level <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.schoolGradeId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, schoolGradeId: e.target.value, subjectId: "" }))}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                            required
                                        >
                                            <option value="">Select Grade...</option>
                                            {grades.map(g => (
                                                <option key={g.id} value={g.id}>{g.grade?.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Subject Dropdown (Filtered to Grade's Configured Curriculum from Step 2) */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                            Curriculum Subject <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.subjectId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                            required
                                            disabled={!formData.schoolGradeId}
                                        >
                                            <option value="">
                                                {!formData.schoolGradeId ? "Select Grade first..." : "Select Subject..."}
                                            </option>
                                            {gradeSubjects.map(gs => (
                                                <option key={gs.subjectId} value={gs.subjectId}>
                                                    {gs.subject?.name} ({gs.weeklyPeriods || 5} p/wk demand)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Specialization Match Notification */}
                                {specializationMatch && (
                                    <div className={`p-3.5 rounded-xl border flex items-center space-x-3 text-xs ${
                                        specializationMatch.isMatch
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                            : "bg-amber-50 border-amber-200 text-amber-900"
                                    }`}>
                                        {specializationMatch.isMatch ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className="font-bold">
                                                {specializationMatch.isMatch ? "Subject Specialization Matched" : "Unspecialized Assignment Warning"}
                                            </p>
                                            <p className="text-[11px] opacity-90 mt-0.5">
                                                {specializationMatch.details}
                                            </p>
                                        </div>
                                    </div>
                                )}

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
                                            Please select a Grade Level above to view sections.
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

                                {/* Weekly Periods and Assignment Mode */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                            Weekly Periods per Section
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="25"
                                            value={formData.periodsPerWeek}
                                            onChange={(e) => setFormData(prev => ({ ...prev, periodsPerWeek: Number(e.target.value) }))}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                            required
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Auto-derived from Step 2 Grade curriculum policy.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                                            Lifecycle Status
                                        </label>
                                        <div className="flex items-center space-x-3 pt-2">
                                            <label className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="lifecycle"
                                                    checked={!formData.asProposal}
                                                    onChange={() => setFormData(prev => ({ ...prev, asProposal: false }))}
                                                    className="text-[#006b3f] focus:ring-[#006b3f]"
                                                />
                                                <span className="font-semibold">Direct Activation (Active)</span>
                                            </label>

                                            <label className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="lifecycle"
                                                    checked={formData.asProposal}
                                                    onChange={() => setFormData(prev => ({ ...prev, asProposal: true }))}
                                                    className="text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="font-semibold text-amber-900">Submit as Proposal</span>
                                            </label>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Vice Principals submit proposals for Principal approval.
                                        </p>
                                    </div>
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
                                        {formData.asProposal ? "Submit Teaching Proposal" : "Save & Activate Assignment"}
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
