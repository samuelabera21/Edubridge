"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { AcademicYear } from "@/types/api";

const STANDARD_PRESETS = [
    { name: "Grade 1", level: 1 },
    { name: "Grade 2", level: 2 },
    { name: "Grade 3", level: 3 },
    { name: "Grade 4", level: 4 },
    { name: "Grade 5", level: 5 },
    { name: "Grade 6", level: 6 },
    { name: "Grade 7", level: 7 },
    { name: "Grade 8", level: 8 },
    { name: "Grade 9", level: 9 },
    { name: "Grade 10", level: 10 },
    { name: "Grade 11", level: 11 },
    { name: "Grade 12", level: 12 },
    { name: "KG 1", level: 101 },
    { name: "KG 2", level: 102 },
    { name: "KG 3", level: 103 },
];

function CreateGradeAndSectionsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlYearId = searchParams.get("yearId");

    const [loading, setLoading] = useState(false);
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>(urlYearId || "");
    const [masterGrades, setMasterGrades] = useState<{ id: string; name: string; level: number }[]>([]);
    const [alreadyOfferedGradeIds, setAlreadyOfferedGradeIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Form mode: select existing master vs define new
    const [creationMode, setCreationMode] = useState<"EXISTING" | "NEW">("EXISTING");
    const [selectedMasterGradeId, setSelectedMasterGradeId] = useState<string>("");
    
    // New grade fields
    const [newGradeName, setNewGradeName] = useState("");
    const [newGradeLevel, setNewGradeLevel] = useState<number | string>(1);

    // Initial Sections
    const [sections, setSections] = useState<{ id: number; name: string; capacity: number }[]>([
        { id: Date.now(), name: "A", capacity: 50 },
        { id: Date.now() + 1, name: "B", capacity: 50 }
    ]);

    const loadInitialData = async () => {
        try {
            // 1. Fetch Years
            const yearsRes = await fetchApi("/academic/years");
            if (yearsRes.ok) {
                const yearsData: AcademicYear[] = await yearsRes.json();
                setYears(yearsData);
                if (!selectedYearId && yearsData.length > 0) {
                    const active = yearsData.find(y => y.status === "ACTIVE");
                    setSelectedYearId(active ? active.id : yearsData[0].id);
                }
            }

            // 2. Fetch Master Grades
            const gradesRes = await fetchApi("/academic/grades");
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                setMasterGrades(gradesData);
                if (gradesData.length > 0) {
                    setSelectedMasterGradeId(gradesData[0].id);
                } else {
                    setCreationMode("NEW");
                }
            }
        } catch (err: any) {
            console.error("Failed to load grade configuration dependencies:", err);
        }
    };

    // When selectedYearId changes, check which grades are already offered
    useEffect(() => {
        if (!selectedYearId) return;
        async function checkOfferedGrades() {
            try {
                const res = await fetchApi(`/academic/years/${selectedYearId}/grades`);
                if (res.ok) {
                    const data = await res.json();
                    setAlreadyOfferedGradeIds(data.map((sg: any) => sg.gradeId));
                }
            } catch (err) {
                console.error(err);
            }
        }
        checkOfferedGrades();
    }, [selectedYearId]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const handleAddSection = () => {
        const nextChar = String.fromCharCode(65 + sections.length); // A, B, C...
        setSections([...sections, { id: Date.now(), name: nextChar, capacity: 50 }]);
    };

    const handleRemoveSection = (id: number) => {
        if (sections.length <= 1) {
            return alert("At least one initial section is required.");
        }
        setSections(sections.filter(s => s.id !== id));
    };

    const handleSectionChange = (id: number, field: "name" | "capacity", value: string | number) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSelectPreset = (preset: { name: string; level: number }) => {
        setNewGradeName(preset.name);
        setNewGradeLevel(preset.level);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedYearId) return setError("Please select a target Academic Year.");

        setLoading(true);
        setError(null);

        try {
            let targetGradeId = selectedMasterGradeId;

            // Step 1: If creating a new master grade, create it first
            if (creationMode === "NEW") {
                if (!newGradeName.trim()) throw new Error("Grade name is required");
                const levelNum = Number(newGradeLevel);
                if (isNaN(levelNum) || levelNum < 0) throw new Error("Level must be a non-negative number");

                const gradeRes = await fetchApi("/academic/grades", {
                    method: "POST",
                    body: JSON.stringify({ name: newGradeName.trim(), level: levelNum })
                });

                if (!gradeRes.ok) {
                    const gErr = await gradeRes.json();
                    throw new Error(gErr.error || "Failed to create master grade");
                }

                const createdGrade = await gradeRes.json();
                targetGradeId = createdGrade.id;
            }

            if (!targetGradeId) throw new Error("Please select or specify a grade level");

            // Step 2: Associate Grade with Selected Academic Year
            const assignRes = await fetchApi(`/academic/years/${selectedYearId}/grades`, {
                method: "POST",
                body: JSON.stringify({ gradeId: targetGradeId })
            });

            if (!assignRes.ok) {
                const aErr = await assignRes.json();
                throw new Error(aErr.error || "Failed to assign grade to academic year");
            }

            const schoolGrade = await assignRes.json();

            // Step 3: Create initial sections
            for (const section of sections) {
                if (!section.name.trim()) continue;
                const secRes = await fetchApi(`/academic/grades/${schoolGrade.id}/sections`, {
                    method: "POST",
                    body: JSON.stringify({
                        name: section.name.trim().toUpperCase(),
                        capacity: Number(section.capacity) || 50
                    })
                });

                if (!secRes.ok) {
                    const secErr = await secRes.json();
                    console.warn(`Section creation notice: ${secErr.error}`);
                }
            }

            router.push("/dashboard/academics/grades");
        } catch (err: any) {
            setError(err.message || "Failed to configure grade and sections");
        } finally {
            setLoading(false);
        }
    };

    const selectedYearObj = years.find(y => y.id === selectedYearId);
    const availableMasterGrades = masterGrades.filter(g => !alreadyOfferedGradeIds.includes(g.id));

    return (
        <div className="space-y-5 max-w-4xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-gray-900">Academics</Link>
                <span>/</span>
                <Link href="/dashboard/academics/grades" className="hover:text-gray-900">Grades & Sections</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Add Grade Offering</span>
            </div>

            {/* Official Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Link 
                    href="/dashboard/academics/grades"
                    className="inline-flex items-center space-x-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Grades & Sections</span>
                </Link>

                <h1 className="text-sm font-bold text-gray-900">
                    Add Grade Offering to Academic Session
                </h1>
            </div>

            {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                {/* 1. Target Academic Year Selection */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-3">
                    <div className="border-b border-gray-100 pb-2.5">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            1. Target Academic Session
                        </h2>
                    </div>

                    <div className="space-y-2 max-w-md">
                        <label className="block font-medium text-gray-700">Academic Year</label>
                        <select
                            value={selectedYearId}
                            onChange={(e) => setSelectedYearId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                            required
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} &mdash; Status: {y.status}
                                </option>
                            ))}
                        </select>
                        {selectedYearObj && (
                            <p className="text-[11px] text-gray-500 font-mono">
                                Session Duration: {selectedYearObj.startDate.slice(0, 10)} to {selectedYearObj.endDate.slice(0, 10)}
                            </p>
                        )}
                    </div>
                </div>

                {/* 2. Grade Selection (Reuse Master vs New) */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="border-b border-gray-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            2. Grade Level Definition
                        </h2>

                        <div className="inline-flex rounded-md border border-gray-200 p-0.5 bg-gray-50">
                            <button
                                type="button"
                                onClick={() => setCreationMode("EXISTING")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                    creationMode === "EXISTING"
                                        ? "bg-white text-gray-900 shadow-xs border border-gray-200/60 font-semibold"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                Select Master Grade
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationMode("NEW")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                    creationMode === "NEW"
                                        ? "bg-white text-gray-900 shadow-xs border border-gray-200/60 font-semibold"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                Define New Master Grade
                            </button>
                        </div>
                    </div>

                    {creationMode === "EXISTING" ? (
                        availableMasterGrades.length === 0 ? (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
                                All master grade levels are already activated for this academic year. Switch to <strong>"Define New Master Grade"</strong> to add a new level.
                            </div>
                        ) : (
                            <div className="space-y-2 max-w-md">
                                <label className="block font-medium text-gray-700">Master Grade Level</label>
                                <select
                                    value={selectedMasterGradeId}
                                    onChange={(e) => setSelectedMasterGradeId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                    required
                                >
                                    {availableMasterGrades.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} (Level {g.level})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500">
                                    Reuses the standard master grade definition across sessions without duplicate records.
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">Grade Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Grade 9, Nursery 1"
                                        value={newGradeName}
                                        onChange={(e) => setNewGradeName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">Numerical Level (Ordering)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={newGradeLevel}
                                        onChange={(e) => setNewGradeLevel(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Standard Presets</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {STANDARD_PRESETS.map(p => (
                                        <button
                                            key={p.name}
                                            type="button"
                                            onClick={() => handleSelectPreset(p)}
                                            className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-gray-50 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] transition-colors cursor-pointer"
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Section Allocations */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                3. Initial Classroom Sections
                            </h2>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleAddSection}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Section</span>
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="flex items-center space-x-3 bg-gray-50/70 p-3 rounded-md border border-gray-200">
                                <span className="text-xs font-mono font-semibold text-gray-400 w-6">#{idx + 1}</span>
                                <div className="flex-1 sm:max-w-xs">
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Section Name</label>
                                    <input
                                        type="text"
                                        value={section.name}
                                        onChange={(e) => handleSectionChange(section.id, "name", e.target.value.toUpperCase())}
                                        placeholder="A, B, C..."
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 font-semibold uppercase focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                        required
                                    />
                                </div>
                                <div className="w-36">
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Max Capacity</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={section.capacity}
                                        onChange={(e) => handleSectionChange(section.id, "capacity", Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                        required
                                    />
                                </div>
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSection(section.id)}
                                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Remove section"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                    <button 
                        type="button" 
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{loading ? "Saving..." : "Save & Offer Grade"}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function CreateGradePage() {
    return (
        <Suspense fallback={
            <div className="p-8 text-center text-gray-500 text-xs font-medium">
                Loading grade configuration...
            </div>
        }>
            <CreateGradeAndSectionsContent />
        </Suspense>
    );
}
