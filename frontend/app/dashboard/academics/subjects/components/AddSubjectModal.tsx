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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

                <Input 
                    label="Subject Name (e.g., Mathematics)" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                />
                
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
