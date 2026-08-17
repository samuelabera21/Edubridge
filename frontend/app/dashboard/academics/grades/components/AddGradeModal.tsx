import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    activeYearId: string;
}

export function AddGradeModal({ isOpen, onClose, onSuccess, activeYearId }: AddGradeModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        level: ""
    });

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

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedName = e.target.value;
        const selectedGrade = STANDARD_GRADES.find(g => g.name === selectedName);
        if (selectedGrade) {
            setFormData({ name: selectedGrade.name, level: selectedGrade.level.toString() });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create global grade
            const gradeRes = await fetchApi("/academic/grades", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    level: parseInt(formData.level, 10)
                }),
            });

            if (!gradeRes.ok) {
                const data = await gradeRes.json();
                throw new Error(data.error || "Failed to create grade");
            }

            const createdGrade = await gradeRes.json();

            // 2. Assign to active academic year
            const assignRes = await fetchApi(`/academic/years/${activeYearId}/grades`, {
                method: "POST",
                body: JSON.stringify({
                    gradeId: createdGrade.id
                }),
            });

            if (!assignRes.ok) {
                const data = await assignRes.json();
                throw new Error(data.error || "Failed to assign grade to academic year");
            }

            onSuccess();
            onClose();
            setFormData({ name: "", level: "" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Grade">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                
                <p className="text-sm text-gray-500 mb-4">
                    This will create a new Grade and assign it to the currently active Academic Year.
                </p>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Select Grade</label>
                    <select
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="p-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="" disabled>Select a grade...</option>
                        {STANDARD_GRADES.map(g => (
                            <option key={g.name} value={g.name}>{g.name}</option>
                        ))}
                    </select>
                </div>

                {formData.name && (
                    <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                        Numeric Level: {formData.level}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Add Grade</Button>
                </div>
            </form>
        </Modal>
    );
}
