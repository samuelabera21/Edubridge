"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { Clock, AlertCircle } from "lucide-react";

interface AssignSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolGradeId: string;
    gradeName: string;
    alreadyAssignedSubjectIds: string[];
}

export function AssignSubjectModal({
    isOpen,
    onClose,
    onSuccess,
    schoolGradeId,
    gradeName,
    alreadyAssignedSubjectIds = [],
}: AssignSubjectModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingSubjects, setFetchingSubjects] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [weeklyPeriods, setWeeklyPeriods] = useState<number | string>(5);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSelectedSubjectId("");
            setWeeklyPeriods(5);
            loadSchoolSubjects();
        }
    }, [isOpen]);

    const loadSchoolSubjects = async () => {
        try {
            setFetchingSubjects(true);
            const res = await fetchApi("/academic/subjects");
            if (!res.ok) throw new Error("Failed to load school subjects");
            const data = await res.json();
            const allSubs = Array.isArray(data) ? data : data.subjects || [];
            
            // Filter out subjects already assigned to this grade
            const unassigned = allSubs.filter(
                (s: any) => !alreadyAssignedSubjectIds.includes(s.id)
            );
            setSubjects(unassigned);
            if (unassigned.length > 0) {
                setSelectedSubjectId(unassigned[0].id);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch subjects");
        } finally {
            setFetchingSubjects(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId) {
            return setError("Please select a subject to assign");
        }

        const periods = Number(weeklyPeriods);
        if (isNaN(periods) || periods < 1 || periods > 25) {
            return setError("Weekly periods must be between 1 and 25");
        }

        try {
            setLoading(true);
            setError(null);

            const res = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}/subjects`, {
                method: "POST",
                body: JSON.stringify({
                    subjectId: selectedSubjectId,
                    weeklyPeriods: periods,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to assign subject");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Assign Subject to ${gradeName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {fetchingSubjects ? (
                    <div className="py-6 text-center text-xs text-gray-500">
                        Loading available subjects...
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500 space-y-2">
                        <p>All available school subjects are already assigned to {gradeName}.</p>
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Select Subject <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                required
                            >
                                {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.name} ({sub.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Weekly Period Load <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Clock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="number"
                                    min={1}
                                    max={25}
                                    value={weeklyPeriods}
                                    onChange={(e) => setWeeklyPeriods(e.target.value)}
                                    placeholder="5"
                                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                    required
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Standard period count taught per section each week (typically 3 - 6 periods).
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                            <button
                                type="submit"
                                disabled={loading || subjects.length === 0}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {loading ? "Assigning..." : "Assign Subject"}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </Modal>
    );
}
