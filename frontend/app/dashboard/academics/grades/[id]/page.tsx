"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ArrowLeft, Users, Eye, BookOpen, Clock, Plus, 
    Edit2, Trash2, CheckCircle2, AlertCircle, X, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AddSectionModal } from "../components/AddSectionModal";
import { EditSectionModal } from "../components/EditSectionModal";
import { AssignSubjectModal } from "../components/AssignSubjectModal";
import { EditSubjectPeriodsModal } from "../components/EditSubjectPeriodsModal";

export default function GradeDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { authData } = useAuth();
    const schoolGradeId = params.id as string;

    const [gradeData, setGradeData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Section Modals State
    const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
    const [editSectionModal, setEditSectionModal] = useState<{ isOpen: boolean; section: any | null }>({
        isOpen: false,
        section: null,
    });
    const [deleteSectionModal, setDeleteSectionModal] = useState<{ isOpen: boolean; section: any | null; loading: boolean }>({
        isOpen: false,
        section: null,
        loading: false,
    });

    // Subject Modals State
    const [isAssignSubjectOpen, setIsAssignSubjectOpen] = useState(false);
    const [editSubjectModal, setEditSubjectModal] = useState<{ isOpen: boolean; gradeSubject: any | null }>({
        isOpen: false,
        gradeSubject: null,
    });
    const [removeSubjectModal, setRemoveSubjectModal] = useState<{ isOpen: boolean; subject: any | null; loading: boolean }>({
        isOpen: false,
        subject: null,
        loading: false,
    });

    const hasManagePermission = authData?.permissions?.some((p: string) => 
        ["ACADEMIC:MANAGE", "ACADEMIC:CREATE", "ACADEMIC:UPDATE"].includes(p)
    ) ?? true;

    const loadDetails = async () => {
        try {
            setLoading(true);
            const res = await fetchApi(`/academic/grades/${schoolGradeId}/details`);
            if (!res.ok) throw new Error("Failed to load grade details");
            const data = await res.json();
            setGradeData(data);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schoolGradeId) {
            loadDetails();
        }
    }, [schoolGradeId]);

    // Handle Delete Section
    const handleDeleteSection = async () => {
        const sec = deleteSectionModal.section;
        if (!sec) return;

        try {
            setDeleteSectionModal(prev => ({ ...prev, loading: true }));
            const res = await fetchApi(`/academic/sections/${sec.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete section");
            }

            setDeleteSectionModal({ isOpen: false, section: null, loading: false });
            setFeedback({ type: "success", message: `Section ${sec.name} was successfully removed.` });
            loadDetails();
        } catch (err: any) {
            setFeedback({ type: "error", message: err.message || "Failed to delete section" });
            setDeleteSectionModal(prev => ({ ...prev, loading: false }));
        }
    };

    // Handle Remove Subject from Grade
    const handleRemoveSubject = async () => {
        const subItem = removeSubjectModal.subject;
        if (!subItem) return;

        try {
            setRemoveSubjectModal(prev => ({ ...prev, loading: true }));
            const subjectId = subItem.subjectId || subItem.subject?.id;
            const res = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}/subjects/${subjectId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to remove subject from grade");
            }

            setRemoveSubjectModal({ isOpen: false, subject: null, loading: false });
            setFeedback({ type: "success", message: `${subItem.subject?.name || "Subject"} was unassigned from ${gradeData?.grade?.name}.` });
            loadDetails();
        } catch (err: any) {
            setFeedback({ type: "error", message: err.message || "Failed to remove subject" });
            setRemoveSubjectModal(prev => ({ ...prev, loading: false }));
        }
    };

    if (loading) return <LoadingState message="Loading grade configuration..." />;
    if (error || !gradeData) return <ErrorState message={error || "Grade not found"} onRetry={() => router.back()} />;

    const totalSections = gradeData.sections?.length || 0;
    const totalCapacity = (gradeData.sections || []).reduce((acc: number, s: any) => acc + (s.capacity || 0), 0);
    const totalEnrolled = (gradeData.sections || []).reduce((acc: number, sec: any) => acc + (sec.studentEnrollments?.length || 0), 0);
    const totalSubjects = gradeData.gradeSubjects?.length || 0;
    const totalWeeklyPeriods = (gradeData.gradeSubjects || []).reduce((acc: number, curr: any) => acc + (curr.weeklyPeriods || 0), 0);
    const assignedSubjectIds = (gradeData.gradeSubjects || []).map((gs: any) => gs.subjectId || gs.subject?.id);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/grades" className="hover:text-gray-900">Grades & Sections</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{gradeData.grade?.name}</span>
            </div>

            {/* Notification Banner */}
            {feedback && (
                <div className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                    feedback.type === "success" 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                    <div className="flex items-center space-x-2">
                        {feedback.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        )}
                        <span className="font-medium">{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Clean Header Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <Link 
                        href="/dashboard/academics/grades"
                        className="inline-flex items-center space-x-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Grades & Sections</span>
                    </Link>

                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Session:</span>
                        <span className="font-semibold text-gray-900 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded">
                            {gradeData.academicYear?.name}
                        </span>
                    </div>
                </div>

                <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {gradeData.grade?.name}
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#4085b3] border border-sky-100">
                                Level {gradeData.grade?.level ?? 0}
                            </span>
                        </div>

                        {/* Clean High-Level Summary */}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
                            <span className="font-semibold text-gray-900">{totalSections}</span> Sections
                            <span className="text-gray-300">&bull;</span>
                            <span className="font-semibold text-gray-900">{totalCapacity}</span> Total Seats
                            <span className="text-gray-300">&bull;</span>
                            <span className="font-semibold text-gray-900">{totalEnrolled}</span> Enrolled Students
                            <span className="text-gray-300">&bull;</span>
                            <span className="font-semibold text-gray-900">{totalSubjects}</span> Curriculum Subjects ({totalWeeklyPeriods} p/wk)
                        </div>
                    </div>

                    {hasManagePermission && (
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => setIsAddSectionOpen(true)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5 text-gray-500" />
                                <span>Add Section</span>
                            </button>
                            <button 
                                onClick={() => setIsAssignSubjectOpen(true)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#4085b3] hover:bg-[#2b6a94] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Assign Subject</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTIONS MANAGEMENT AREA */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Classroom Sections ({totalSections})
                        </h2>
                    </div>

                    {hasManagePermission && (
                        <button 
                            onClick={() => setIsAddSectionOpen(true)}
                            className="inline-flex items-center space-x-1 text-xs text-[#4085b3] hover:text-[#2b6a94] font-semibold cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Section</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gradeData.sections?.map((section: any) => {
                        const studentCount = section.studentEnrollments?.length || 0;
                        const capacity = section.capacity || 50;
                        const occupancyPct = Math.min(100, Math.round((studentCount / capacity) * 100));

                        return (
                            <div 
                                key={section.id} 
                                className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-[#4085b3] hover:shadow-md transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900">
                                                Section {section.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {capacity} max seats &bull; {studentCount} enrolled
                                            </p>
                                        </div>

                                        {hasManagePermission && (
                                            <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditSectionModal({ isOpen: true, section })}
                                                    className="p-1 rounded text-gray-400 hover:text-[#4085b3] hover:bg-sky-50 transition-colors cursor-pointer"
                                                    title="Edit Section Name & Capacity"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteSectionModal({ isOpen: true, section, loading: false })}
                                                    className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                    title="Delete Section"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Occupancy bar */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-gray-500 text-[11px]">Occupancy</span>
                                            <span className="font-semibold text-gray-700 text-[11px]">{occupancyPct}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    occupancyPct >= 100 ? "bg-rose-500" : occupancyPct >= 80 ? "bg-amber-500" : "bg-[#4085b3]"
                                                }`}
                                                style={{ width: `${occupancyPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                                    <Link 
                                        href={`/dashboard/academics/grades/${schoolGradeId}/sections/${section.id}`}
                                        className="text-xs font-semibold text-[#4085b3] hover:underline inline-flex items-center space-x-1"
                                    >
                                        <span>View Enrolled Students</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}

                    {/* Quick Add Section Card */}
                    {hasManagePermission && (
                        <button
                            type="button"
                            onClick={() => setIsAddSectionOpen(true)}
                            className="bg-gray-50/50 hover:bg-sky-50/40 border-2 border-dashed border-gray-200 hover:border-[#4085b3] rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[140px] group"
                        >
                            <div className="w-9 h-9 rounded-full bg-white border border-gray-200 group-hover:border-[#4085b3] group-hover:bg-[#4085b3] flex items-center justify-center text-gray-500 group-hover:text-white transition-all mb-2">
                                <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 group-hover:text-[#4085b3] transition-colors">
                                Add Another Section
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5">
                                Create next stream (e.g. Sec E)
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* CURRICULUM SUBJECTS MANAGEMENT AREA */}
            <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Curriculum Subjects ({totalSubjects})
                        </h2>
                    </div>

                    {hasManagePermission && (
                        <button 
                            onClick={() => setIsAssignSubjectOpen(true)}
                            className="inline-flex items-center space-x-1 text-xs text-[#4085b3] hover:text-[#2b6a94] font-semibold cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Subject</span>
                        </button>
                    )}
                </div>

                {(!gradeData.gradeSubjects || gradeData.gradeSubjects.length === 0) ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 space-y-3">
                        <p>No curriculum subjects configured for {gradeData.grade?.name} yet.</p>
                        {hasManagePermission && (
                            <button
                                onClick={() => setIsAssignSubjectOpen(true)}
                                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#4085b3] text-white text-xs font-semibold hover:bg-[#2b6a94] transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Assign First Subject</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-5 py-3 w-40">Subject Code</th>
                                        <th className="px-5 py-3">Subject Name</th>
                                        <th className="px-5 py-3 w-48 text-center">Weekly Load</th>
                                        {hasManagePermission && (
                                            <th className="px-5 py-3 w-32 text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {gradeData.gradeSubjects.map((item: any, idx: number) => (
                                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-[11px]">
                                                {idx + 1}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono font-semibold text-gray-700">
                                                {item.subject?.code || "N/A"}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-gray-900">
                                                <div className="flex items-center space-x-2">
                                                    <BookOpen className="w-4 h-4 text-[#4085b3]" />
                                                    <span>{item.subject?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="inline-flex items-center space-x-2">
                                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-800 font-mono text-xs">
                                                        <Clock className="w-3 h-3 text-[#4085b3]" />
                                                        <span>{item.weeklyPeriods || 5} p/wk</span>
                                                    </span>
                                                    {hasManagePermission && (
                                                        <button
                                                            onClick={() => setEditSubjectModal({ isOpen: true, gradeSubject: item })}
                                                            className="text-gray-400 hover:text-[#4085b3] transition-colors p-1 rounded"
                                                            title="Edit Weekly Load"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {hasManagePermission && (
                                                <td className="px-5 py-3.5 text-right">
                                                    <button
                                                        onClick={() => setRemoveSubjectModal({ isOpen: true, subject: item, loading: false })}
                                                        className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                                        title="Remove subject from this grade"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Remove</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: ADD SECTION */}
            <AddSectionModal
                isOpen={isAddSectionOpen}
                onClose={() => setIsAddSectionOpen(false)}
                onSuccess={() => {
                    setFeedback({ type: "success", message: "Section created successfully." });
                    loadDetails();
                }}
                schoolGradeId={schoolGradeId}
                gradeName={gradeData.grade?.name}
            />

            {/* MODAL 2: EDIT SECTION */}
            <EditSectionModal
                isOpen={editSectionModal.isOpen}
                onClose={() => setEditSectionModal({ isOpen: false, section: null })}
                onSuccess={() => {
                    setFeedback({ type: "success", message: "Section updated successfully." });
                    loadDetails();
                }}
                section={editSectionModal.section}
                gradeName={gradeData.grade?.name}
            />

            {/* MODAL 3: DELETE SECTION CONFIRMATION */}
            <Modal
                isOpen={deleteSectionModal.isOpen}
                onClose={() => setDeleteSectionModal({ isOpen: false, section: null, loading: false })}
                title="Delete Section"
            >
                <div className="space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Are you sure you want to remove <strong>Section {deleteSectionModal.section?.name}</strong> from {gradeData.grade?.name}?
                    </p>
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                        Notice: Sections with actively enrolled students cannot be removed until students are transferred.
                    </p>
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteSectionModal({ isOpen: false, section: null, loading: false })}
                            disabled={deleteSectionModal.loading}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <button
                            type="button"
                            onClick={handleDeleteSection}
                            disabled={deleteSectionModal.loading}
                            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {deleteSectionModal.loading ? "Deleting..." : "Delete Section"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 4: ASSIGN SUBJECT */}
            <AssignSubjectModal
                isOpen={isAssignSubjectOpen}
                onClose={() => setIsAssignSubjectOpen(false)}
                onSuccess={() => {
                    setFeedback({ type: "success", message: "Subject assigned to grade successfully." });
                    loadDetails();
                }}
                schoolGradeId={schoolGradeId}
                gradeName={gradeData.grade?.name}
                alreadyAssignedSubjectIds={assignedSubjectIds}
            />

            {/* MODAL 5: EDIT SUBJECT WEEKLY PERIODS */}
            <EditSubjectPeriodsModal
                isOpen={editSubjectModal.isOpen}
                onClose={() => setEditSubjectModal({ isOpen: false, gradeSubject: null })}
                onSuccess={() => {
                    setFeedback({ type: "success", message: "Weekly periods updated successfully." });
                    loadDetails();
                }}
                schoolGradeId={schoolGradeId}
                gradeSubject={editSubjectModal.gradeSubject}
            />

            {/* MODAL 6: REMOVE SUBJECT CONFIRMATION */}
            <Modal
                isOpen={removeSubjectModal.isOpen}
                onClose={() => setRemoveSubjectModal({ isOpen: false, subject: null, loading: false })}
                title="Remove Subject"
            >
                <div className="space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Are you sure you want to unassign <strong>{removeSubjectModal.subject?.subject?.name}</strong> from {gradeData.grade?.name}?
                    </p>
                    <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                        This will remove the curriculum requirement for all sections of this grade. Subjects with active teaching assignments cannot be removed.
                    </p>
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRemoveSubjectModal({ isOpen: false, subject: null, loading: false })}
                            disabled={removeSubjectModal.loading}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <button
                            type="button"
                            onClick={handleRemoveSubject}
                            disabled={removeSubjectModal.loading}
                            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {removeSubjectModal.loading ? "Removing..." : "Remove Subject"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
