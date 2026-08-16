import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        studentId: "",
        dateOfBirth: "",
        gender: "MALE"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi("/student", {
                method: "POST",
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create student");
            }

            onSuccess();
            onClose();
            setFormData({ firstName: "", lastName: "", studentId: "", dateOfBirth: "", gender: "MALE" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Student">
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
                    label="Student ID (System ID)" 
                    name="studentId" 
                    value={formData.studentId} 
                    onChange={handleChange} 
                    required 
                />
                
                <Input 
                    label="Date of Birth" 
                    type="date"
                    name="dateOfBirth" 
                    value={formData.dateOfBirth} 
                    onChange={handleChange} 
                    required 
                />
                
                <Select 
                    label="Gender" 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange} 
                    options={[
                        { value: "MALE", label: "Male" },
                        { value: "FEMALE", label: "Female" }
                    ]}
                    required
                />
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Create Student</Button>
                </div>
            </form>
        </Modal>
    );
}
