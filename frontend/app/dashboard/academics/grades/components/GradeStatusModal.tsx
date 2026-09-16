import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { Archive, ShieldCheck, PauseCircle, AlertCircle } from "lucide-react";

interface GradeStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolGrade: {
        id: string;
        status?: string;
        grade?: { name: string; level: number };
        sections?: any[];
        gradeSubjects?: any[];
    } | null;
    academicYearName: string;
}

export function GradeStatusModal({
    isOpen,
    onClose,
    onSuccess,
    schoolGrade,
    academicYearName
}: GradeStatusModalProps) {
    const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED" | "ARCHIVED">("ACTIVE");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (schoolGrade) {
            setStatus((schoolGrade.status as any) || "ACTIVE");
        }
    }, [schoolGrade]);

    if (!schoolGrade) return null;

    const gradeName = schoolGrade.grade?.name || "Grade";
    const sectionCount = schoolGrade.sections?.length || 0;
    const subjectCount = schoolGrade.gradeSubjects?.length || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi(`/academic/grades/school-grades/${schoolGrade.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update grade status");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Lifecycle: ${gradeName}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Audit Retention Notice */}
                <div className="p-3 bg-sky-50 border border-sky-200/80 rounded-xl text-xs text-sky-900 leading-relaxed">
                    <p className="font-semibold text-sky-950 flex items-center space-x-1.5 mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#4085b3]" />
                        <span>Data Integrity & Ministry Reporting Guarantee</span>
                    </p>
                    <p className="text-[11px] text-sky-800">
                        Academic records for <strong>{gradeName}</strong> in <strong>{academicYearName}</strong> ({sectionCount} sections, {subjectCount} subjects) are permanently preserved. They remain accessible for transcripts, audits, and official hierarchy reporting.
                    </p>
                </div>

                {/* Status Options */}
                <div className="space-y-2.5 pt-1">
                    <label className="text-xs font-semibold text-gray-700 block">Select Status:</label>
                    
                    {/* Active */}
                    <label
                        className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            status === "ACTIVE"
                                ? "border-[#4085b3] bg-sky-50/40 ring-1 ring-[#4085b3]"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                    >
                        <input
                            type="radio"
                            name="grade_status"
                            value="ACTIVE"
                            checked={status === "ACTIVE"}
                            onChange={() => setStatus("ACTIVE")}
                            className="mt-0.5 text-[#4085b3] focus:ring-[#4085b3]"
                        />
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-gray-900">Active</span>
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    In Session
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Fully operational. Sections are open for timetabling, student enrollments, and teacher assignments.
                            </p>
                        </div>
                    </label>

                    {/* Suspended */}
                    <label
                        className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            status === "SUSPENDED"
                                ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-400"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                    >
                        <input
                            type="radio"
                            name="grade_status"
                            value="SUSPENDED"
                            checked={status === "SUSPENDED"}
                            onChange={() => setStatus("SUSPENDED")}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-gray-900">Suspended</span>
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Paused
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Temporarily freezes new section enrollments and modifications while keeping existing roster data visible.
                            </p>
                        </div>
                    </label>

                    {/* Archived */}
                    <label
                        className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            status === "ARCHIVED"
                                ? "border-purple-400 bg-purple-50/40 ring-1 ring-purple-400"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                    >
                        <input
                            type="radio"
                            name="grade_status"
                            value="ARCHIVED"
                            checked={status === "ARCHIVED"}
                            onChange={() => setStatus("ARCHIVED")}
                            className="mt-0.5 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-gray-900">Archived</span>
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                    Historical
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Read-only archive. Locks further edits but keeps all sections, grades, and records for historical reporting.
                            </p>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end space-x-2.5 pt-3 border-t border-gray-100">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="text-xs bg-[#4085b3] hover:bg-[#2b6a94] text-white"
                    >
                        {loading ? "Updating Status..." : "Save Status"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
