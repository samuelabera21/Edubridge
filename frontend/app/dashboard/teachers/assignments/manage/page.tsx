"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ArrowLeft, CheckSquare, Square, 
    Trash2, CheckCircle2, AlertTriangle, Calendar, AlertCircle, Search,
    ArrowRightLeft, ChevronLeft, ChevronRight
} from "lucide-react";
import { AcademicYear } from "@/types/api";

export default function ManageTeacherAssignmentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTeacherId = searchParams.get("teacherId") || "";
    const initialYearId = searchParams.get("yearId") || "";
    const initialGradeId = searchParams.get("schoolGradeId") || "";
    const initialSectionId = searchParams.get("sectionId") || "";
    const initialSubjectId = searchParams.get("subjectId") || "";
    const initialOldAssignmentId = searchParams.get("oldAssignmentId") || "";

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
    const [allocationSearch, setAllocationSearch] = useState<string>("");

    // Pagination state for Current Allocations table
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(8);

    // Reassignment state (when replacing an existing teacher on a section)
    const [reassignNotice, setReassignNotice] = useState<{
        oldAssignmentId: string;
        subjectName?: string;
        gradeName?: string;
        sectionName?: string;
        oldTeacherName?: string;
    } | null>(null);

    // Form state
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
            let teacherList: any[] = [];
            if (teachersRes.ok) {
                teacherList = await teachersRes.json();
                setTeachers(teacherList);
                if (initialTeacherId) {
                    setSelectedTeacherId(initialTeacherId);
                } else if (initialSubjectId && teacherList.length > 0) {
                    const specialist = teacherList.find(t => 
                        t.specializations?.some((s: any) => s.subjectId === initialSubjectId || s.subject?.id === initialSubjectId)
                    );
                    if (specialist) {
                        setSelectedTeacherId(specialist.id);
                    } else if (teacherList.length === 1) {
                        setSelectedTeacherId(teacherList[0].id);
                    }
                } else if (teacherList.length === 1) {
                    setSelectedTeacherId(teacherList[0].id);
                } else if (!initialSubjectId && teacherList.length > 0) {
                    setSelectedTeacherId(teacherList[0].id);
                }
            }

            // 3. Fetch Grades & Assignments for chosen Year
            if (chosenYearId) {
                const [gradesRes, assignRes] = await Promise.all([
                    fetchApi(`/academic/years/${chosenYearId}/grades`),
                    fetchApi(`/teacher/assignments?academicYearId=${chosenYearId}`)
                ]);
                if (gradesRes.ok) setGrades(await gradesRes.json());
                if (assignRes.ok) {
                    const allAssign = await assignRes.json();
                    setAssignments(allAssign);

                    // Check if redirect was for an existing assignment to reassign
                    if (initialOldAssignmentId) {
                        const target = allAssign.find((a: any) => a.id === initialOldAssignmentId);
                        if (target) {
                            setReassignNotice({
                                oldAssignmentId: target.id,
                                subjectName: target.subject?.name,
                                gradeName: target.schoolGrade?.grade?.name,
                                sectionName: target.section?.name || "All",
                                oldTeacherName: target.teacher ? `${target.teacher.firstName} ${target.teacher.lastName}` : "previous teacher"
                            });
                        }
                    }
                }
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // Sync query params if they change
    useEffect(() => {
        if (initialSubjectId && formData.subjectId !== initialSubjectId) {
            setFormData(prev => ({ ...prev, subjectId: initialSubjectId }));
        }
    }, [initialSubjectId]);

    useEffect(() => {
        if (initialGradeId && formData.schoolGradeId !== initialGradeId) {
            setFormData(prev => ({ ...prev, schoolGradeId: initialGradeId }));
        }
    }, [initialGradeId]);

    useEffect(() => {
        if (initialSectionId && !formData.selectedSectionIds.includes(initialSectionId)) {
            setFormData(prev => ({ ...prev, selectedSectionIds: [initialSectionId] }));
        }
    }, [initialSectionId]);

    // Load teacher specializations when selected teacher changes
    useEffect(() => {
        if (!selectedTeacherId) return;
        const fetchSpecs = async () => {
            try {
                const res = await fetchApi(`/teacher/${selectedTeacherId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTeacherSpecializations(data.specializations || []);
                }
            } catch (e) {}
        };
        fetchSpecs();
    }, [selectedTeacherId]);

    // Load subjects and sections when grade changes
    useEffect(() => {
        if (!formData.schoolGradeId || !selectedYearId) {
            setGradeSubjects([]);
            setSections([]);
            return;
        }

        const fetchGradeDetails = async () => {
            try {
                const [subjectsRes, sectionsRes] = await Promise.all([
                    fetchApi(`/academic/grades/school-grades/${formData.schoolGradeId}/subjects`).then(async res => {
                        if (res.ok) return res;
                        return fetchApi(`/academic/grades/${formData.schoolGradeId}/subjects`);
                    }),
                    fetchApi(`/academic/grades/${formData.schoolGradeId}/sections`)
                ]);
                if (subjectsRes.ok) {
                    const subs = await subjectsRes.json();
                    setGradeSubjects(subs);
                }
                if (sectionsRes.ok) {
                    const secs = await sectionsRes.json();
                    setSections(secs);
                }
            } catch (e) {}
        };
        fetchGradeDetails();
    }, [formData.schoolGradeId, selectedYearId]);

    // Auto-update periodsPerWeek when subject changes
    useEffect(() => {
        if (!formData.subjectId || gradeSubjects.length === 0) return;
        const found = gradeSubjects.find(s => (s.subjectId || s.subject?.id) === formData.subjectId);
        if (found && found.weeklyPeriods) {
            setFormData(prev => ({ ...prev, periodsPerWeek: found.weeklyPeriods }));
        }
    }, [formData.subjectId, gradeSubjects]);

    // Check Specialization Match
    useEffect(() => {
        if (!selectedTeacherId || !formData.subjectId || !formData.schoolGradeId) {
            setSpecializationMatch(null);
            return;
        }

        const checkMatch = async () => {
            try {
                const res = await fetchApi(
                    `/teacher/staffing/match-check?teacherId=${selectedTeacherId}&subjectId=${formData.subjectId}&schoolGradeId=${formData.schoolGradeId}`
                );
                if (res.ok) {
                    setSpecializationMatch(await res.json());
                }
            } catch (e) {}
        };
        checkMatch();
    }, [selectedTeacherId, formData.subjectId, formData.schoolGradeId]);

    const selectedTeacher = useMemo(() => {
        return teachers.find(t => t.id === selectedTeacherId) || null;
    }, [teachers, selectedTeacherId]);

    const teacherAssignments = useMemo(() => {
        return assignments.filter(a => a.teacherId === selectedTeacherId);
    }, [assignments, selectedTeacherId]);

    const filteredTeacherAssignments = useMemo(() => {
        if (!allocationSearch.trim()) return teacherAssignments;
        const query = allocationSearch.toLowerCase();
        return teacherAssignments.filter(a => 
            (a.subject?.name && a.subject.name.toLowerCase().includes(query)) ||
            (a.schoolGrade?.grade?.name && a.schoolGrade.grade.name.toLowerCase().includes(query)) ||
            (a.section?.name && a.section.name.toLowerCase().includes(query))
        );
    }, [teacherAssignments, allocationSearch]);

    // Reset pagination when filter or teacher changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedTeacherId, allocationSearch, pageSize]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTeacherAssignments.length / pageSize));
    const paginatedAssignments = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredTeacherAssignments.slice(startIndex, startIndex + pageSize);
    }, [filteredTeacherAssignments, currentPage, pageSize]);

    const currentTeacherPeriods = useMemo(() => {
        return teacherAssignments.reduce((acc, a) => acc + (a.periodsPerWeek || 0), 0);
    }, [teacherAssignments]);

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
        } catch (e) {}
    };

    const handleSectionToggle = (sectionId: string) => {
        setFormData(prev => {
            const exists = prev.selectedSectionIds.includes(sectionId);
            const next = exists 
                ? prev.selectedSectionIds.filter(id => id !== sectionId)
                : [...prev.selectedSectionIds, sectionId];
            return {
                ...prev,
                selectedSectionIds: next,
                assignAllSections: next.length === sections.length
            };
        });
    };

    const handleSelectAllSections = (selectAll: boolean) => {
        setFormData(prev => ({
            ...prev,
            assignAllSections: selectAll,
            selectedSectionIds: selectAll ? sections.map(s => s.id) : []
        }));
    };

    // Reassign action: prefill form and clear teacher so admin assigns a new teacher
    const handleReassign = (assignment: any) => {
        const oldTeacherName = selectedTeacher 
            ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` 
            : "current teacher";

        setReassignNotice({
            oldAssignmentId: assignment.id,
            subjectName: assignment.subject?.name,
            gradeName: assignment.schoolGrade?.grade?.name,
            sectionName: assignment.section?.name || "All",
            oldTeacherName
        });

        setFormData({
            schoolGradeId: assignment.schoolGradeId,
            subjectId: assignment.subjectId,
            selectedSectionIds: assignment.sectionId ? [assignment.sectionId] : [],
            assignAllSections: false,
            periodsPerWeek: assignment.periodsPerWeek || 5,
            asProposal: false
        });

        // Clear current teacher selection so user picks replacement teacher
        setSelectedTeacherId("");

        // Scroll to the assignment form smoothly
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedTeacherId) {
            setError("Please select a teacher to assign.");
            return;
        }
        if (!formData.schoolGradeId || !formData.subjectId) {
            setError("Please select both Grade and Subject.");
            return;
        }
        if (sections.length > 0 && formData.selectedSectionIds.length === 0) {
            setError("Please select at least one section.");
            return;
        }

        try {
            setSubmitting(true);

            // If this is a reassignment, remove the previous teacher's assignment first
            if (reassignNotice?.oldAssignmentId) {
                try {
                    await fetchApi(`/teacher/assignments/${reassignNotice.oldAssignmentId}`, { method: "DELETE" });
                } catch (e) {
                    console.error("Failed to delete previous assignment during reassignment:", e);
                }
            }

            const payload = {
                teacherId: selectedTeacherId,
                academicYearId: selectedYearId,
                subjectId: formData.subjectId,
                schoolGradeId: formData.schoolGradeId,
                sectionIds: formData.selectedSectionIds.length > 0 ? formData.selectedSectionIds : undefined,
                periodsPerWeek: Number(formData.periodsPerWeek) || 5,
                asProposal: formData.asProposal
            };

            const res = await fetchApi("/teacher/assignments", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create assignment");
            }

            setSuccessMessage(
                reassignNotice 
                    ? `Reassigned ${reassignNotice.subjectName} (Section ${reassignNotice.sectionName}) to ${selectedTeacher?.firstName} ${selectedTeacher?.lastName}.`
                    : formData.asProposal 
                        ? "Proposal submitted successfully." 
                        : "Assignment saved successfully."
            );
            
            // Reload assignments
            const assignRes = await fetchApi(`/teacher/assignments?academicYearId=${selectedYearId}`);
            if (assignRes.ok) {
                setAssignments(await assignRes.json());
            }

            // Clear reassign notice & reset form
            setReassignNotice(null);
            setFormData(prev => ({
                ...prev,
                subjectId: "",
                selectedSectionIds: [],
                assignAllSections: false
            }));
            setTimeout(() => setSuccessMessage(null), 3500);
        } catch (err: any) {
            setError(err.message || "Failed to create assignment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (!confirm("Are you sure you want to end this teaching assignment?")) return;

        try {
            const res = await fetchApi(`/teacher/assignments/${assignmentId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to end assignment");
            }

            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
            setSuccessMessage("Assignment removed.");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to end assignment");
        }
    };

    if (loading) {
        return (
            <div className="py-24 text-center text-sm text-gray-500">
                Loading teacher allocation...
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/teachers" className="hover:text-gray-900">Teachers</Link>
                <span>/</span>
                <Link href="/dashboard/teachers/assignments" className="hover:text-gray-900">Assignments</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Allocate</span>
            </div>

            {/* Clean Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => router.push("/dashboard/teachers/assignments")}
                        className="inline-flex items-center space-x-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Overview</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            Teacher Section Allocation
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Assign teachers to specific subjects and class sections.
                        </p>
                    </div>
                </div>

                {/* Academic Year Selector */}
                <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-500">Session:</span>
                    <select
                        value={selectedYearId}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y.id} value={y.id}>
                                {y.name} {y.status === "ACTIVE" ? "(Active)" : y.status === "PLANNED" ? "(Planned)" : `(${y.status})`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reassign Active Banner */}
            {reassignNotice && (
                <div className="bg-amber-50 border border-amber-300 rounded-md p-3.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                        <ArrowRightLeft className="w-4 h-4 text-amber-700 flex-shrink-0" />
                        <div>
                            <span className="font-bold">Reassigning Section:</span>{" "}
                            <span className="font-medium">{reassignNotice.gradeName} &bull; Section {reassignNotice.sectionName} &bull; {reassignNotice.subjectName}</span>
                            <span className="text-amber-800 block text-[11px] mt-0.5">
                                Currently assigned to <strong>{reassignNotice.oldTeacherName}</strong>. Choose a replacement teacher in the form below to complete reassignment.
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReassignNotice(null)}
                        className="self-start sm:self-center text-amber-900 hover:text-amber-950 font-semibold px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                        Cancel Reassignment
                    </button>
                </div>
            )}

            {/* Notifications */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">&times;</button>
                </div>
            )}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">&times;</button>
                </div>
            )}

            {/* Main Form & Profile Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Card: Teacher Profile & Workload Status */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5">
                            Teacher Selection
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                                <span>{reassignNotice ? "Select Replacement Teacher" : "Teacher"} <span className="text-rose-500">*</span></span>
                                {!selectedTeacherId && (
                                    <span className="text-[10px] text-amber-600 font-medium">Required</span>
                                )}
                            </label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className={`w-full px-3 py-2 bg-white border text-gray-900 rounded-md text-xs font-medium outline-none cursor-pointer ${
                                    !selectedTeacherId 
                                        ? "border-amber-400 ring-2 ring-amber-100" 
                                        : "border-gray-300 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                }`}
                            >
                                <option value="">Select Teacher...</option>
                                {teachers.map(t => {
                                    const isSpecialist = formData.subjectId && t.specializations?.some((s: any) => 
                                        s.subjectId === formData.subjectId || s.subject?.id === formData.subjectId
                                    );
                                    return (
                                        <option key={t.id} value={t.id}>
                                            {t.firstName} {t.lastName} ({t.staffIdCode || t.employeeId || "Staff"}){isSpecialist ? " ★ [Specialist]" : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {selectedTeacher ? (
                            <div className="bg-gray-50 rounded-md p-4 space-y-3 border border-gray-200 text-xs">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">
                                            {selectedTeacher.firstName} {selectedTeacher.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                                            Staff ID: {selectedTeacher.staffIdCode || selectedTeacher.employeeId || "—"}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        currentTeacherPeriods > 28 ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                        currentTeacherPeriods < 18 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                        "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}>
                                        {currentTeacherPeriods > 28 ? "Overloaded" : currentTeacherPeriods < 18 ? "Underloaded" : "Optimal"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-xs">
                                    <div className="bg-white p-2.5 rounded border border-gray-200">
                                        <p className="text-gray-500 text-[10px] uppercase font-semibold">Assigned Sections</p>
                                        <p className="text-base font-bold text-gray-900">{teacherAssignments.length}</p>
                                    </div>
                                    <div className="bg-white p-2.5 rounded border border-gray-200">
                                        <p className="text-gray-500 text-[10px] uppercase font-semibold">Weekly Load</p>
                                        <p className="text-base font-bold font-mono text-gray-900">{currentTeacherPeriods} <span className="text-xs font-normal text-gray-500">p/wk</span></p>
                                    </div>
                                </div>

                                {teacherSpecializations.length > 0 && (
                                    <div className="pt-2 border-t border-gray-200">
                                        <p className="text-[11px] font-medium text-gray-600 mb-1.5">
                                            Specialization:
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {teacherSpecializations.map((spec: any) => (
                                                <span 
                                                    key={spec.subjectId}
                                                    className="text-xs px-2.5 py-0.5 rounded bg-white text-gray-800 border border-gray-200 font-medium"
                                                >
                                                    {spec.subject?.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
                                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                    No Teacher Selected
                                </p>
                                <p className="text-[11px] text-amber-700">
                                    Please select an instructor above to assign them to the selected subject and section.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Card: New Allocation Form */}
                <div className="lg:col-span-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs">
                        <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2.5 border-b border-gray-100 flex items-center justify-between">
                            <span>{reassignNotice ? "Reassign to Teacher" : "New Teaching Assignment"}</span>
                            {reassignNotice && (
                                <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                    Reassignment Active
                                </span>
                            )}
                        </h2>

                        <form onSubmit={handleAssign} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Grade Dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Grade Level <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.schoolGradeId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, schoolGradeId: e.target.value, subjectId: "" }))}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-md text-xs font-medium focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Select Grade...</option>
                                        {grades.map(g => (
                                            <option key={g.id} value={g.id}>{g.grade?.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Subject Dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                                        <span>Subject <span className="text-rose-500">*</span></span>
                                        {gradeSubjects.length > 0 && (
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {gradeSubjects.length} subject{gradeSubjects.length > 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </label>
                                    <select
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                                        className={`w-full px-3 py-2 bg-white border text-gray-900 rounded-md text-xs font-medium focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer disabled:bg-gray-50 ${
                                            !formData.subjectId && formData.schoolGradeId
                                                ? "border-amber-400 ring-2 ring-amber-100"
                                                : "border-gray-300"
                                        }`}
                                        required
                                        disabled={!formData.schoolGradeId}
                                    >
                                        <option value="">
                                            {!formData.schoolGradeId 
                                                ? "Select Grade first..." 
                                                : gradeSubjects.length === 0 
                                                    ? "Loading subjects or none assigned to grade..." 
                                                    : "Select Subject..."}
                                        </option>
                                        {gradeSubjects.map(gs => {
                                            const subId = gs.subjectId || gs.subject?.id;
                                            const subName = gs.subject?.name || "Subject";
                                            const periods = gs.weeklyPeriods || 5;
                                            return (
                                                <option key={subId} value={subId}>
                                                    {subName} ({periods} p/wk)
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Qualification Match Notice */}
                            {specializationMatch && (
                                <div className={`px-3 py-2 rounded-md border flex items-center space-x-2 text-xs ${
                                    specializationMatch.isMatch
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "bg-amber-50 border-amber-200 text-amber-800"
                                }`}>
                                    {specializationMatch.isMatch ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    )}
                                    <span>
                                        <strong>{specializationMatch.isMatch ? "Eligible:" : "Notice:"}</strong> {specializationMatch.details}
                                    </span>
                                </div>
                            )}

                            {/* Section Multi-selection */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Sections <span className="text-rose-500">*</span>
                                    </label>
                                    {sections.length > 0 && !reassignNotice && (
                                        <button
                                            type="button"
                                            onClick={() => handleSelectAllSections(!formData.assignAllSections)}
                                            className="text-xs text-[#4085b3] font-medium hover:underline cursor-pointer"
                                        >
                                            {formData.assignAllSections ? "Deselect All" : "Select All"}
                                        </button>
                                    )}
                                </div>

                                {!formData.schoolGradeId ? (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center text-xs text-gray-500">
                                        Select a Grade Level above to view sections.
                                    </div>
                                ) : sections.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                                        No sections configured for this grade.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                        {sections.map(sec => {
                                            const isSelected = formData.selectedSectionIds.includes(sec.id);
                                            return (
                                                <div
                                                    key={sec.id}
                                                    onClick={() => handleSectionToggle(sec.id)}
                                                    className={`px-3 py-2 rounded-md border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                                        isSelected 
                                                            ? "bg-white border-[#4085b3] text-[#4085b3] font-semibold shadow-xs" 
                                                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <span>Section {sec.name}</span>
                                                    {isSelected ? (
                                                        <CheckSquare className="w-3.5 h-3.5 text-[#4085b3]" />
                                                    ) : (
                                                        <Square className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Weekly Periods & Lifecycle Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Weekly Periods per Section
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="25"
                                        value={formData.periodsPerWeek}
                                        onChange={(e) => setFormData(prev => ({ ...prev, periodsPerWeek: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-md text-xs font-mono focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <div className="flex items-center space-x-5 pt-2">
                                        <label className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="lifecycle"
                                                checked={!formData.asProposal}
                                                onChange={() => setFormData(prev => ({ ...prev, asProposal: false }))}
                                                className="text-[#4085b3] focus:ring-[#4085b3]"
                                            />
                                            <span>Direct Activation</span>
                                        </label>

                                        <label className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="lifecycle"
                                                checked={formData.asProposal}
                                                onChange={() => setFormData(prev => ({ ...prev, asProposal: true }))}
                                                className="text-[#4085b3] focus:ring-[#4085b3]"
                                            />
                                            <span>Submit as Proposal</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons & Guidance */}
                            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    {!selectedTeacherId ? (
                                        <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                            Please choose a teacher from the left panel.
                                        </p>
                                    ) : !formData.schoolGradeId ? (
                                        <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                            Please select a grade level.
                                        </p>
                                    ) : !formData.subjectId ? (
                                        <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                            Please select a subject.
                                        </p>
                                    ) : formData.selectedSectionIds.length === 0 ? (
                                        <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                            Please select at least one section.
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            Ready to assign ({formData.selectedSectionIds.length} section{formData.selectedSectionIds.length > 1 ? "s" : ""}, {formData.periodsPerWeek} p/wk each)
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2.5 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReassignNotice(null);
                                            router.push("/dashboard/teachers/assignments");
                                        }}
                                        className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !selectedTeacherId || !formData.subjectId || !formData.schoolGradeId || formData.selectedSectionIds.length === 0}
                                        className="px-5 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                                    >
                                        <span>
                                            {submitting 
                                                ? "Saving..." 
                                                : reassignNotice 
                                                    ? "Confirm Reassignment" 
                                                    : formData.asProposal 
                                                        ? "Submit Proposal" 
                                                        : "Save Assignment"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Current Allocations Table (Clean Government Style with Pagination & Reassign Action) */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Current Allocations {selectedTeacher ? `(${selectedTeacher.firstName} ${selectedTeacher.lastName})` : ""}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Total: {teacherAssignments.length} sections &bull; {currentTeacherPeriods} weekly periods
                        </p>
                    </div>

                    {/* Quick Search */}
                    {teacherAssignments.length > 0 && (
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filter by subject, grade, section..."
                                value={allocationSearch}
                                onChange={(e) => setAllocationSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            />
                        </div>
                    )}
                </div>

                {filteredTeacherAssignments.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-500">
                        {teacherAssignments.length === 0 
                            ? "No teaching assignments recorded for this teacher in the selected academic year."
                            : "No assignments match your search filter."}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-4 py-3">Subject</th>
                                        <th className="px-4 py-3">Grade Level</th>
                                        <th className="px-4 py-3">Section</th>
                                        <th className="px-4 py-3 text-center">Weekly Periods</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedAssignments.map((a, idx) => {
                                        const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                                        return (
                                            <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-4 py-3 text-center text-gray-400 font-mono text-[11px]">
                                                    {globalIndex}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-900">
                                                    {a.subject?.name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {a.schoolGrade?.grade?.name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    Section {a.section?.name || "All"}
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono font-medium text-gray-900">
                                                    {a.periodsPerWeek} p/wk
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                        a.status === "ACTIVE" 
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}>
                                                        {a.status || "ACTIVE"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleReassign(a)}
                                                            className="inline-flex items-center space-x-1 text-[#4085b3] hover:text-[#2b6a94] hover:bg-sky-50 px-2 py-1 rounded transition-colors cursor-pointer"
                                                            title="Reassign to another teacher"
                                                        >
                                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                                            <span className="text-[11px] font-medium">Reassign</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAssignment(a.id)}
                                                            className="inline-flex items-center space-x-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
                                                            title="End assignment"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span className="text-[11px]">Remove</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50/80 border-t border-gray-200 font-semibold text-gray-900 text-xs">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-right">
                                            Total Active Load:
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {currentTeacherPeriods} p/wk
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Government Pagination Bar */}
                        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                            <div className="flex items-center space-x-3">
                                <span>
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                    <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filteredTeacherAssignments.length)}</span> of{" "}
                                    <span className="font-semibold text-gray-900">{filteredTeacherAssignments.length}</span> allocations
                                </span>
                                <div className="flex items-center space-x-1.5 pl-3 border-l border-gray-300">
                                    <span className="text-gray-500">Per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-white border border-gray-300 rounded px-2 py-0.5 text-xs font-medium text-gray-800 focus:outline-none cursor-pointer"
                                    >
                                        <option value={5}>5</option>
                                        <option value={8}>8</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                    </select>
                                </div>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Prev</span>
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-7 h-7 rounded border text-xs font-medium transition-colors cursor-pointer ${
                                                currentPage === page 
                                                    ? "bg-[#4085b3] text-white border-[#4085b3]" 
                                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
