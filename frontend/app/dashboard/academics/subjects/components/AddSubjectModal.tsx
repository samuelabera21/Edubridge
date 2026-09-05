"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolGradeId?: string;
    gradeName?: string;
    academicYearId?: string;
}

const STANDARD_ETHIOPIAN_SUBJECTS = [
    { name: "Mathematics", code: "MATH-101", defaultPeriods: 5 },
    { name: "English", code: "ENG-101", defaultPeriods: 5 },
    { name: "Amharic", code: "AMH-101", defaultPeriods: 4 },
    { name: "General Science", code: "GSCI-101", defaultPeriods: 4 },
    { name: "Environmental Science", code: "ESCI-101", defaultPeriods: 4 },
    { name: "Social Studies", code: "SOCS-101", defaultPeriods: 3 },
    { name: "Physics", code: "PHYS-101", defaultPeriods: 4 },
    { name: "Chemistry", code: "CHEM-101", defaultPeriods: 4 },
    { name: "Biology", code: "BIOL-101", defaultPeriods: 4 },
    { name: "Civics and Ethical Education", code: "CIV-101", defaultPeriods: 3 },
    { name: "Information Technology", code: "IT-101", defaultPeriods: 3 },
    { name: "Geography", code: "GEOG-101", defaultPeriods: 3 },
    { name: "History", code: "HIST-101", defaultPeriods: 3 },
    { name: "Physical Education", code: "HPE-101", defaultPeriods: 2 },
];

export function AddSubjectModal({
    isOpen,
    onClose,
    onSuccess,
    schoolGradeId,
    gradeName,
    academicYearId
}: AddSubjectModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [masterSubjects, setMasterSubjects] = useState<{ id: string; name: string; code?: string }[]>([]);

    const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");
    const [selectedMasterId, setSelectedMasterId] = useState("");
    const [customName, setCustomName] = useState("");
    const [customCode, setCustomCode] = useState("");
    const [weeklyPeriods, setWeeklyPeriods] = useState<number | string>(5);

    useEffect(() => {
        if (isOpen) {
            loadMasterSubjects();
            setError(null);
        }
    }, [isOpen]);

    const loadMasterSubjects = async () => {
        try {
            const res = await fetchApi("/academic/subjects");
            if (res.ok) {
                const data = await res.json();
                setMasterSubjects(data);
                if (data.length > 0) {
                    setSelectedMasterId(data[0].id);
                } else {
                    setMode("NEW");
                }
            }
        } catch (err) {
            console.error("Failed to load subjects:", err);
        }
    };

    const handleSelectPreset = (preset: { name: string; code: string; defaultPeriods: number }) => {
        setCustomName(preset.name);
        setCustomCode(preset.code);
        setWeeklyPeriods(preset.defaultPeriods);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let targetSubjectId = selectedMasterId;

            // If new subject mode, create master subject first
            if (mode === "NEW") {
                if (!customName.trim()) throw new Error("Subject name is required");
                const sRes = await fetchApi("/academic/subjects", {
                    method: "POST",
                    body: JSON.stringify({
                        name: customName.trim(),
                        code: customCode.trim() || undefined
                    })
                });

                if (!sRes.ok) {
                    const sErr = await sRes.json();
                    throw new Error(sErr.error || "Failed to create master subject");
                }

                const newSub = await sRes.json();
                targetSubjectId = newSub.id;
            }

            if (!targetSubjectId) throw new Error("Please select a subject");

            // If assigning to a specific grade
            if (schoolGradeId) {
                const periodsNum = Number(weeklyPeriods);
                if (isNaN(periodsNum) || periodsNum < 1) {
                    throw new Error("Weekly periods must be at least 1");
                }

                const assignRes = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}/subjects`, {
                    method: "POST",
                    body: JSON.stringify({
                        subjectId: targetSubjectId,
                        weeklyPeriods: periodsNum
                    })
                });

                if (!assignRes.ok) {
                    const aErr = await assignRes.json();
                    throw new Error(aErr.error || "Failed to assign subject to grade");
                }
            } else if (academicYearId) {
                // Otherwise assign to academic year offering
                const yearRes = await fetchApi(`/academic/years/${academicYearId}/subjects`, {
                    method: "POST",
                    body: JSON.stringify({ subjectId: targetSubjectId })
                });

                if (!yearRes.ok) {
                    const yErr = await yearRes.json();
                    throw new Error(yErr.error || "Failed to offer subject in academic year");
                }
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
            title={schoolGradeId ? `Assign Subject to ${gradeName || "Grade"}` : "Add Curriculum Subject"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {/* Mode toggle */}
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setMode("EXISTING")}
                        className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                            mode === "EXISTING" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        }`}
                    >
                        Select From Catalog
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("NEW")}
                        className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                            mode === "NEW" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        }`}
                    >
                        Define New Subject
                    </button>
                </div>

                {mode === "EXISTING" ? (
                    masterSubjects.length === 0 ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                            No subjects found in catalog. Switch to "Define New Subject" to add one.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-700">Select Subject</label>
                            <select
                                value={selectedMasterId}
                                onChange={(e) => setSelectedMasterId(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                required
                            >
                                {masterSubjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.code ? `(${s.code})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )
                ) : (
                    <div className="space-y-3">
                        <Input
                            label="Subject Name"
                            placeholder="e.g. Physics, Economics"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            required
                        />
                        <Input
                            label="Subject Code"
                            placeholder="e.g. PHYS-101"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value)}
                        />
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Ethiopian Curriculum Presets</label>
                            <div className="flex flex-wrap gap-1">
                                {STANDARD_ETHIOPIAN_SUBJECTS.map((p) => (
                                    <button
                                        key={p.name}
                                        type="button"
                                        onClick={() => handleSelectPreset(p)}
                                        className="px-2 py-0.5 text-xs rounded bg-gray-100 hover:bg-[#006b3f] hover:text-white transition-colors"
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Configurable Weekly Periods when assigning to Grade */}
                {schoolGradeId && (
                    <div>
                        <Input
                            label="Weekly Instructional Periods"
                            type="number"
                            min={1}
                            max={15}
                            value={weeklyPeriods}
                            onChange={(e) => setWeeklyPeriods(e.target.value)}
                            required
                        />
                        <p className="text-xs text-gray-500 -mt-2 mb-2">
                            Configurable number of weekly class periods for this grade according to MoE general education syllabus.
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        {schoolGradeId ? "Assign to Grade" : "Add to Catalog"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
