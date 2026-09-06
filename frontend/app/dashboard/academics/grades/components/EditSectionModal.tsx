"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface EditSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    section: { id: string; name: string; capacity?: number | null } | null;
    gradeName: string;
}

export function EditSectionModal({ isOpen, onClose, onSuccess, section, gradeName }: EditSectionModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [capacity, setCapacity] = useState<number | string>(50);

    useEffect(() => {
        if (section) {
            setName(section.name);
            setCapacity(section.capacity ?? 50);
            setError(null);
        }
    }, [section]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!section) return;

        const trimmed = name.trim().toUpperCase();
        if (!trimmed) {
            return setError("Section name cannot be empty");
        }

        const capNum = Number(capacity);
        if (isNaN(capNum) || capNum < 1) {
            return setError("Capacity must be at least 1 student");
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi(`/academic/sections/${section.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: trimmed, capacity: capNum })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update section");
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
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Section for ${gradeName}`}>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Section Identifier *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. A, B, Blue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none font-semibold uppercase"
                        required
                    />
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Student Capacity *</label>
                    <input
                        type="number"
                        min={1}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                        required
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                        Capacity cannot be lowered below the number of currently enrolled students.
                    </p>
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
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
