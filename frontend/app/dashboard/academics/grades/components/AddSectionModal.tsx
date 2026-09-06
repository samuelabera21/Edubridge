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

    const STANDARD_SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                        {error}
                    </div>
                )}
                
                <div>
                    <label className="block font-medium text-gray-700 mb-1">Section Identifier *</label>
                    <select
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                    >
                        <option value="" disabled>Select section identifier...</option>
                        {STANDARD_SECTIONS.map(s => (
                            <option key={s} value={s}>Section {s}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block font-medium text-gray-700 mb-1">Student Capacity *</label>
                    <input 
                        type="number"
                        min={1}
                        name="capacity" 
                        value={formData.capacity} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                        required 
                    />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-4 py-1.5 bg-[#4085b3] hover:bg-[#2b6a94] text-white rounded-md text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? "Adding..." : "Add Section"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
