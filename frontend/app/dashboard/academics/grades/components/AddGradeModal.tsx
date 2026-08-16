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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

                <Input 
                    label="Grade Name (e.g., Grade 9)" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                />
                
                <Input 
                    label="Numeric Level (e.g., 9)" 
                    type="number"
                    name="level" 
                    value={formData.level} 
                    onChange={handleChange} 
                    required 
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Add Grade</Button>
                </div>
            </form>
        </Modal>
    );
}
