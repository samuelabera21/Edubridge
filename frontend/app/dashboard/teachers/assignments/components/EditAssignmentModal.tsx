import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";

interface EditAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assignment: any;
    activeYearId: string;
}

export function EditAssignmentModal({ isOpen, onClose, onSuccess, assignment, activeYearId }: EditAssignmentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        subjectId: "",
        schoolGradeId: "",
        sectionId: ""
    });

    useEffect(() => {
        if (isOpen && assignment) {
            setFormData({
                subjectId: assignment.subjectId || "",
                schoolGradeId: assignment.schoolGradeId || "",
                sectionId: assignment.sectionId || ""
            });
            loadData();
        }
    }, [isOpen, assignment]);

    useEffect(() => {
        if (formData.schoolGradeId) {
            loadSections(formData.schoolGradeId);
        } else {
            setSections([]);
        }
    }, [formData.schoolGradeId]);

    const loadData = async () => {
        try {
            const [subjRes, gradesRes] = await Promise.all([
                fetchApi("/academic/subjects"),
                fetchApi(`/academic/years/${activeYearId}/grades`)
            ]);
            
            if (subjRes.ok) setSubjects(await subjRes.json());
            if (gradesRes.ok) setGrades(await gradesRes.json());
        } catch (err) {
            console.error("Failed to load options", err);
        }
    };

    const loadSections = async (gradeId: string) => {
        try {
            const res = await fetchApi(`/academic/grades/${gradeId}/sections`);
            if (res.ok) setSections(await res.json());
        } catch (err) {
            console.error("Failed to load sections", err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            ...(name === "schoolGradeId" ? { sectionId: "" } : {}) 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi(`/teacher/assignments/${assignment.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    subjectId: formData.subjectId || undefined,
                    schoolGradeId: formData.schoolGradeId || undefined,
                    sectionId: formData.sectionId || undefined
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update assignment");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi(`/teacher/assignments/${assignment.id}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete assignment");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (!assignment) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Teaching Assignment">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                        name="subjectId"
                        value={formData.subjectId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                        required
                    >
                        <option value="">Select a subject...</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                    <select
                        name="schoolGradeId"
                        value={formData.schoolGradeId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                        required
                    >
                        <option value="">Select a grade...</option>
                        {grades.map(g => (
                            <option key={g.id} value={g.id}>{g.grade?.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section (Optional)</label>
                    <select
                        name="sectionId"
                        value={formData.sectionId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                        disabled={!formData.schoolGradeId || sections.length === 0}
                    >
                        <option value="">All Sections</option>
                        {sections.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete} isLoading={loading}>
                        Delete Assignment
                    </Button>
                    <div className="space-x-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
