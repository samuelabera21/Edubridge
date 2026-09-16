"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
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
            if (new Date(formData.startDate) >= new Date(formData.endDate)) {
                throw new Error("Start date must be before end date.");
            }

            const res = await fetchApi("/academic/years", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name.trim(),
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
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                        {error}
                    </div>
                )}
                
                <div>
                    <label className="block font-medium text-gray-700 mb-1">
                        Academic Year Name (e.g., 2018 E.C. / 2026-2027) *
                    </label>
                    <input 
                        type="text"
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="e.g. 2027"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                        required 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Start Date *</label>
                        <input 
                            type="date" 
                            name="startDate" 
                            value={formData.startDate} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">End Date *</label>
                        <input 
                            type="date" 
                            name="endDate" 
                            value={formData.endDate} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            required 
                        />
                    </div>
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Initial Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                    >
                        <option value="PLANNED">Planned</option>
                        <option value="ACTIVE">Active</option>
                    </select>
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
                        {loading ? "Adding..." : "Add Academic Year"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
