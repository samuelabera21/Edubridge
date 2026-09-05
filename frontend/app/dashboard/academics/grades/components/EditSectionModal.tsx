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
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <Input
                        label="Section Identifier"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. A, B, Blue"
                        required
                    />
                </div>

                <div>
                    <Input
                        label="Student Capacity"
                        type="number"
                        min={1}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        required
                    />
                    <p className="text-xs text-gray-500 -mt-2 mb-2">
                        Capacity cannot be lowered below the number of currently enrolled students.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
}
