"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { BookOpen, Clock, AlertCircle } from "lucide-react";

interface AddSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolGradeId?: string;
    gradeName?: string;
    academicYearId?: string;
    existingSubjectIds?: string[];
}

const ETHIOPIAN_PRESETS = [
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
    academicYearId,
    existingSubjectIds = [],
}: AddSubjectModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [masterSubjects, setMasterSubjects] = useState<{ id: string; name: string; code?: string }[]>([]);

    const [mode, setMode] = useState<"CATALOG" | "NEW">("CATALOG");
    const [selectedMasterId, setSelectedMasterId] = useState("");
    const [customName, setCustomName] = useState("");
    const [customCode, setCustomCode] = useState("");
    const [weeklyPeriods, setWeeklyPeriods] = useState<number | string>(5);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setCustomName("");
            setCustomCode("");
            setWeeklyPeriods(5);
            loadMasterSubjects();
        }
    }, [isOpen]);

    const loadMasterSubjects = async () => {
        try {
            const res = await fetchApi("/academic/subjects");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : [];
                setMasterSubjects(list);
                if (list.length > 0) {
                    // Pick the first unassigned subject, if any
                    const unassigned = list.find(s => !existingSubjectIds.includes(s.id));
                    setSelectedMasterId(unassigned ? unassigned.id : list[0].id);
                } else {
                    setMode("NEW");
                }
            }
        } catch (err) {
            console.error("Failed to load subjects:", err);
        }
    };

    const handlePresetChange = (presetName: string) => {
        const preset = ETHIOPIAN_PRESETS.find(p => p.name === presetName);
        if (preset) {
            setCustomName(preset.name);
            setCustomCode(preset.code);
            setWeeklyPeriods(preset.defaultPeriods);
        }
    };

    const isAlreadyAssigned = existingSubjectIds.includes(selectedMasterId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let targetSubjectId = selectedMasterId;

            // If creating a new subject definition
            if (mode === "NEW") {
                if (!customName.trim()) throw new Error("Subject name is required");
                const sRes = await fetchApi("/academic/subjects", {
                    method: "POST",
                    body: JSON.stringify({
                        name: customName.trim(),
                        code: customCode.trim() || undefined,
                    }),
                });

                if (!sRes.ok) {
                    const sErr = await sRes.json();
                    throw new Error(sErr.error || "Failed to create subject");
                }

                const newSub = await sRes.json();
                targetSubjectId = newSub.id;
            }

            if (!targetSubjectId) throw new Error("Please select or define a subject");

            // If assigning to a specific grade
            if (schoolGradeId) {
                const periodsNum = Number(weeklyPeriods);
                if (isNaN(periodsNum) || periodsNum < 1 || periodsNum > 25) {
                    throw new Error("Weekly periods must be between 1 and 25");
                }

                const assignRes = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}/subjects`, {
                    method: "POST",
                    body: JSON.stringify({
                        subjectId: targetSubjectId,
                        weeklyPeriods: periodsNum,
                    }),
                });

                if (!assignRes.ok) {
                    const aErr = await assignRes.json();
                    throw new Error(aErr.error || "Failed to assign subject to grade");
                }
            } else if (academicYearId) {
                const yearRes = await fetchApi(`/academic/years/${academicYearId}/subjects`, {
                    method: "POST",
                    body: JSON.stringify({ subjectId: targetSubjectId }),
                });

                if (!yearRes.ok) {
                    const yErr = await yearRes.json();
                    throw new Error(yErr.error || "Failed to add subject to academic year");
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
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Clean Segmented Mode Selector */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setMode("CATALOG")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            mode === "CATALOG" 
                                ? "bg-white text-gray-900 shadow-xs" 
                                : "text-gray-500 hover:text-gray-900"
                        }`}
                    >
                        Select from Catalog
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("NEW")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            mode === "NEW" 
                                ? "bg-white text-gray-900 shadow-xs" 
                                : "text-gray-500 hover:text-gray-900"
                        }`}
                    >
                        Define New Subject
                    </button>
                </div>

                {mode === "CATALOG" ? (
                    masterSubjects.length === 0 ? (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs text-gray-500">
                            No subjects found in catalog. Switch to "Define New Subject" to create one.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700">
                                Select Subject <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedMasterId}
                                onChange={(e) => setSelectedMasterId(e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                required
                            >
                                {masterSubjects.map((s) => {
                                    const assigned = existingSubjectIds.includes(s.id);
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.code ? `(${s.code})` : ""} {assigned ? "• (Already Assigned - Will Update)" : ""}
                                        </option>
                                    );
                                })}
                            </select>

                            {isAlreadyAssigned && (
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                                    Notice: This subject is already assigned to {gradeName || "this grade"}. Submitting will update its weekly period load.
                                </p>
                            )}
                        </div>
                    )
                ) : (
                    <div className="space-y-3">
                        {/* Ethiopian Preset Dropdown */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Curriculum Standard Preset <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <select
                                onChange={(e) => handlePresetChange(e.target.value)}
                                defaultValue=""
                                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                            >
                                <option value="" disabled>Choose preset to autofill...</option>
                                {ETHIOPIAN_PRESETS.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name} ({p.code}) &bull; {p.defaultPeriods} p/wk
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Subject Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Physics, Economics"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Subject Code <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. PHYS-101"
                                value={customCode}
                                onChange={(e) => setCustomCode(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Weekly Periods when assigning to Grade */}
                {schoolGradeId && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Weekly Instructional Periods <span className="text-rose-500">*</span>
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
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="text-xs">
                        Cancel
                    </Button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {loading ? "Saving..." : schoolGradeId ? (isAlreadyAssigned ? "Update Load" : "Assign to Grade") : "Add to Catalog"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
