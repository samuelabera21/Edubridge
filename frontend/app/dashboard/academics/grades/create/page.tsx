"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GraduationCap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Grades & Sections
                </Button>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <GraduationCap className="w-7 h-7 mr-3 text-[#006b3f]" />
                    Add Grade Offering to Academic Year
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Select an existing master grade or create a new grade level, then configure classroom sections and capacities.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Target Academic Year Selection */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3">
                        <CardTitle className="text-sm font-bold text-gray-900">1. Target Academic Year</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700">Select Academic Year</label>
                            <select
                                value={selectedYearId}
                                onChange={(e) => setSelectedYearId(e.target.value)}
                                className="w-full sm:w-96 p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                                required
                            >
                                {years.map(y => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} — Status: {y.status}
                                    </option>
                                ))}
                            </select>
                            {selectedYearObj && (
                                <p className="text-xs text-gray-500">
                                    Grade will be offered during {selectedYearObj.name} ({selectedYearObj.startDate.slice(0, 10)} to {selectedYearObj.endDate.slice(0, 10)}).
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Grade Selection (Reuse Master vs New) */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900">2. Grade Level Definition</CardTitle>
                        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setCreationMode("EXISTING")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                    creationMode === "EXISTING"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                Select Master Grade
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationMode("NEW")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                    creationMode === "NEW"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                Define New Master Grade
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {creationMode === "EXISTING" ? (
                            availableMasterGrades.length === 0 ? (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                                    All existing master grades are already activated for this academic year. Switch to <strong>"Define New Master Grade"</strong> to add a new level.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-700">Available Organization Master Grades</label>
                                    <select
                                        value={selectedMasterGradeId}
                                        onChange={(e) => setSelectedMasterGradeId(e.target.value)}
                                        className="w-full sm:w-96 p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                                        required
                                    >
                                        {availableMasterGrades.map(g => (
                                            <option key={g.id} value={g.id}>
                                                {g.name} (Level {g.level})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500">
                                        Reuses the school's standard master grade definition across academic years without duplicate record creation.
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Grade Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Grade 9, Nursery 1"
                                            value={newGradeName}
                                            onChange={(e) => setNewGradeName(e.target.value)}
                                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Numerical Level (Order)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={newGradeLevel}
                                            onChange={(e) => setNewGradeLevel(e.target.value)}
                                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Quick Standard Presets</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {STANDARD_PRESETS.map(p => (
                                            <button
                                                key={p.name}
                                                type="button"
                                                onClick={() => handleSelectPreset(p)}
                                                className="px-2.5 py-1 text-xs rounded-md bg-gray-100 hover:bg-[#006b3f] hover:text-white transition-colors"
                                            >
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Section Allocations */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900">3. Initial Classroom Sections</CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">Define initial sections and student capacity (e.g. Section A, B with 50 capacity each).</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="w-3 h-3" />} onClick={handleAddSection}>
                            Add Section
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                                <div className="flex-1 sm:max-w-xs">
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Section Name</label>
                                    <input
                                        type="text"
                                        value={section.name}
                                        onChange={(e) => handleSectionChange(section.id, "name", e.target.value.toUpperCase())}
                                        placeholder="A, B, C..."
                                        className="w-full p-1.5 text-sm border rounded bg-white text-gray-900 font-semibold uppercase"
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Max Capacity</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={section.capacity}
                                        onChange={(e) => handleSectionChange(section.id, "capacity", Number(e.target.value))}
                                        className="w-full p-1.5 text-sm border rounded bg-white text-gray-900"
                                        required
                                    />
                                </div>
                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSection(section.id)}
                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors"
                                        title="Remove section"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                        Save & Offer Grade
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default function CreateGradePage() {
    return (
        <Suspense fallback={
            <div className="p-8 text-center text-gray-500 font-medium">
                Loading grade configuration...
            </div>
        }>
            <CreateGradeAndSectionsContent />
        </Suspense>
    );
}
