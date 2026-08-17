"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { fetchApi } from "@/lib/api";
import { AcademicYear } from "@/types/api";

const STANDARD_GRADES = [
    { name: "Pre-K", level: -3 },
    { name: "KG 1", level: -2 },
    { name: "KG 2", level: -1 },
    { name: "KG 3", level: 0 },
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
];

export default function CreateGradeAndSectionsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedGradeName, setSelectedGradeName] = useState("");
    const [sections, setSections] = useState<{ id: number; name: string; capacity: number }[]>([]);
    
    // Add default section on mount
    useEffect(() => {
        setSections([{ id: Date.now(), name: "A", capacity: 50 }]);
        loadActiveYear();
    }, []);

    const loadActiveYear = async () => {
        try {
            const res = await fetchApi("/academic/years");
            if (res.ok) {
                const years: AcademicYear[] = await res.json();
                const active = years.find(y => y.status === "ACTIVE");
                setActiveYear(active || null);
            }
        } catch (err) {
            console.error(err);
        }
    }

    const handleAddSection = () => {
        const nextChar = String.fromCharCode(65 + sections.length); // A, B, C...
        setSections([...sections, { id: Date.now(), name: nextChar, capacity: 50 }]);
    };

    const handleRemoveSection = (id: number) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const handleSectionChange = (id: number, field: "name" | "capacity", value: string | number) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeYear) return setError("No active academic year found.");
        if (!selectedGradeName) return setError("Please select a grade.");
        
        const selectedGrade = STANDARD_GRADES.find(g => g.name === selectedGradeName);
        if (!selectedGrade) return setError("Invalid grade selected.");

        setLoading(true);
        setError(null);

        try {
            // 1. Create global grade
            const gradeRes = await fetchApi("/academic/grades", {
                method: "POST",
                body: JSON.stringify({ name: selectedGrade.name, level: selectedGrade.level }),
            });
            if (!gradeRes.ok) {
                const data = await gradeRes.json();
                throw new Error(data.error || "Failed to create grade");
            }
            const createdGrade = await gradeRes.json();

            // 2. Assign to active academic year
            const assignRes = await fetchApi(`/academic/years/${activeYear.id}/grades`, {
                method: "POST",
                body: JSON.stringify({ gradeId: createdGrade.id }),
            });
            if (!assignRes.ok) {
                const data = await assignRes.json();
                throw new Error(data.error || "Failed to assign grade to academic year");
            }
            const schoolGrade = await assignRes.json();

            // 3. Create Sections
            if (sections.length > 0) {
                // Execute sequentially or Promise.all. Sequential is safer for simple DB locking.
                for (const section of sections) {
                    if (!section.name.trim()) continue;
                    const secRes = await fetchApi(`/academic/grades/${schoolGrade.id}/sections`, {
                        method: "POST",
                        body: JSON.stringify({ name: section.name, capacity: section.capacity }),
                    });
                    if (!secRes.ok) {
                        console.warn(`Failed to create section ${section.name}`);
                    }
                }
            }

            alert("Grade and sections successfully created!");
            router.push("/dashboard/academics/grades");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Grades
                </Button>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <GraduationCap className="w-6 h-6 mr-3 text-[#006b3f]" />
                    Create New Grade & Sections
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Set up a new grade level and define its sections simultaneously for the active academic year.
                </p>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

            <Card>
                <CardHeader>
                    <CardTitle>Grade Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Grade Level</label>
                            <select 
                                required
                                value={selectedGradeName}
                                onChange={(e) => setSelectedGradeName(e.target.value)}
                                className="w-full max-w-md rounded-lg border border-gray-300 p-2.5 focus:ring-[#006b3f] focus:border-[#006b3f]"
                            >
                                <option value="">-- Choose a grade --</option>
                                {STANDARD_GRADES.map(g => (
                                    <option key={g.name} value={g.name}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Sections</h3>
                                    <p className="text-sm text-gray-500">Define the sections (classrooms) for this grade.</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddSection} leftIcon={<Plus className="w-4 h-4" />}>
                                    Add Section
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {sections.map((section, index) => (
                                    <div key={section.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Section Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={section.name}
                                                onChange={(e) => handleSectionChange(section.id, "name", e.target.value)}
                                                placeholder="e.g. A, B, C"
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-[#006b3f] focus:border-[#006b3f]"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Capacity</label>
                                            <input 
                                                type="number" 
                                                required
                                                min="1"
                                                value={section.capacity}
                                                onChange={(e) => handleSectionChange(section.id, "capacity", parseInt(e.target.value))}
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-[#006b3f] focus:border-[#006b3f]"
                                            />
                                        </div>
                                        <div className="pt-5">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                                onClick={() => handleRemoveSection(section.id)}
                                                disabled={sections.length === 1}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-6 flex justify-end">
                            <Button type="submit" disabled={loading} leftIcon={<Save className="w-4 h-4" />}>
                                {loading ? "Creating..." : "Save Grade & Sections"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
