"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { Clock, AlertCircle } from "lucide-react";

interface EditSubjectPeriodsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolGradeId: string;
    gradeSubject: {
        id: string;
        subjectId: string;
        weeklyPeriods: number;
        subject?: { name: string; code: string };
    } | null;
}

export function EditSubjectPeriodsModal({
    isOpen,
    onClose,
    onSuccess,
    schoolGradeId,
    gradeSubject,
}: EditSubjectPeriodsModalProps) {
    const [loading, setLoading] = useState(false);
    const [weeklyPeriods, setWeeklyPeriods] = useState<number | string>(5);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (gradeSubject) {
            setError(null);
            setWeeklyPeriods(gradeSubject.weeklyPeriods || 5);
        }
    }, [gradeSubject]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradeSubject) return;

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
                    subjectId: gradeSubject.subjectId,
                    weeklyPeriods: periods,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update weekly periods");
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Weekly Load: ${gradeSubject?.subject?.name || "Subject"}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

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
                            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            required
                        />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Specifies the teaching demand for each section of this grade level per week.
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
                        disabled={loading}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Load"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
