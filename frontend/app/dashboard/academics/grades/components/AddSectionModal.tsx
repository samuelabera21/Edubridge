import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolGradeId: string;
    gradeName: string;
}

export function AddSectionModal({ isOpen, onClose, onSuccess, schoolGradeId, gradeName }: AddSectionModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        capacity: "50"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const parsedCapacity = parseInt(formData.capacity, 10);
            
            const res = await fetchApi(`/academic/grades/${schoolGradeId}/sections`, {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    capacity: isNaN(parsedCapacity) ? null : parsedCapacity
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create section");
            }

            onSuccess();
            onClose();
            setFormData({ name: "", capacity: "50" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Section to ${gradeName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                
                <Input 
                    label="Section Name (e.g., A, B, or 9A)" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                />
                
                <Input 
                    label="Student Capacity" 
                    type="number"
                    name="capacity" 
                    value={formData.capacity} 
                    onChange={handleChange} 
                    required 
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Add Section</Button>
                </div>
            </form>
        </Modal>
    );
}
