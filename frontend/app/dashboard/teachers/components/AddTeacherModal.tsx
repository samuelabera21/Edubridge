import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddTeacherModal({ isOpen, onClose, onSuccess }: AddTeacherModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi("/teacher", {
                method: "POST",
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create teacher");
            }

            onSuccess();
            onClose();
            setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Teacher">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="First Name" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        required 
                    />
                    <Input 
                        label="Last Name" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleChange} 
                        required 
                    />
                </div>
                
                <Input 
                    label="Email Address" 
                    type="email"
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                />
                
                <Input 
                    label="Phone Number" 
                    name="phoneNumber" 
                    value={formData.phoneNumber} 
                    onChange={handleChange} 
                />
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Create Teacher</Button>
                </div>
            </form>
        </Modal>
    );
}
