import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    activeYearId: string;
}

export function AddSubjectModal({ isOpen, onClose, onSuccess, activeYearId }: AddSubjectModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        code: ""
    });

    const [isCustom, setIsCustom] = useState(false);

    const STANDARD_SUBJECTS = [
        "Amharic",
        "English",
        "Mathematics",
        "Environmental Science",
        "General Science",
        "Social Studies",
        "Physics",
        "Chemistry",
        "Biology",
        "Civics and Ethical Education",
        "Information Technology",
        "Geography",
        "History",
        "Physical Education"
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "subjectSelect") {
            if (value === "OTHER") {
                setIsCustom(true);
                setFormData(prev => ({ ...prev, name: "", code: "" }));
            } else {
                setIsCustom(false);
                setFormData(prev => ({ ...prev, name: value, code: value.substring(0, 4).toUpperCase() + "-101" }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create global subject
            const subjectRes = await fetchApi("/academic/subjects", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    code: formData.code
                }),
            });

            if (!subjectRes.ok) {
                const data = await subjectRes.json();
                throw new Error(data.error || "Failed to create subject");
            }

            const createdSubject = await subjectRes.json();

            // 2. Assign to active academic year
            const assignRes = await fetchApi(`/academic/years/${activeYearId}/subjects`, {
                method: "POST",
                body: JSON.stringify({
                    subjectId: createdSubject.id
                }),
            });

            if (!assignRes.ok) {
                const data = await assignRes.json();
                throw new Error(data.error || "Failed to assign subject to academic year");
            }

            onSuccess();
            onClose();
            setFormData({ name: "", code: "" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Subject">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                
                <p className="text-sm text-gray-500 mb-4">
                    This will create a new Subject and assign it to the currently active Academic Year.
                </p>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Select Subject</label>
                    <select
                        name="subjectSelect"
                        onChange={handleChange}
                        className="p-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                    >
                        <option value="" disabled>Select a subject...</option>
                        {STANDARD_SUBJECTS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="OTHER">Custom Subject...</option>
                    </select>
                </div>

                {isCustom && (
                    <Input 
                        label="Custom Subject Name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        required 
                    />
                )}
                
                <Input 
                    label="Subject Code (e.g., MATH-101)" 
                    name="code" 
                    value={formData.code} 
                    onChange={handleChange} 
                    required 
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Add Subject</Button>
                </div>
            </form>
        </Modal>
    );
}
