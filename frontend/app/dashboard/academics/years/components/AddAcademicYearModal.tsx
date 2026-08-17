import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddAcademicYearModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddAcademicYearModal({ isOpen, onClose, onSuccess }: AddAcademicYearModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        startDate: "",
        endDate: "",
        status: "PLANNED"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi("/academic/years", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    startDate: new Date(formData.startDate).toISOString(),
                    endDate: new Date(formData.endDate).toISOString(),
                    status: formData.status
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add academic year");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Academic Year">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                
                <Input 
                    label="Academic Year Name (e.g., 2018 E.C.)" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Start Date" 
                        type="date" 
                        name="startDate" 
                        value={formData.startDate} 
                        onChange={handleChange} 
                        required 
                    />
                    <Input 
                        label="End Date" 
                        type="date" 
                        name="endDate" 
                        value={formData.endDate} 
                        onChange={handleChange} 
                        required 
                    />
                </div>

                <Select
                    label="Initial Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                        { value: "PLANNED", label: "Planned" },
                        { value: "ACTIVE", label: "Active" }
                    ]}
                />

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Add Academic Year</Button>
                </div>
            </form>
        </Modal>
    );
}
