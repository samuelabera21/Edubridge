"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Users, Plus, Filter, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddStudentModal } from "./components/AddStudentModal";

export default function StudentsDirectoryPage() {
    const { authData } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const hasCreatePermission = true; // Admin dashboard always shows this for now

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/student");
            if (!res.ok) throw new Error("Failed to load student directory");
            const data = await res.json();
            setStudents(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading && students.length === 0) {
        return <LoadingState message="Loading student directory..." />;
    }

    if (error && students.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <Users className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Student Directory
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Global student identities associated with the platform.</p>
                </div>
                {hasCreatePermission && (
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
                        Add Student
                    </Button>
                )}
            </div>

            <AddStudentModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={loadData} 
            />

            {students.length === 0 ? (
                <EmptyState 
                    title="No Students Found" 
                    message="There are no student identities in the directory yet. Add a student to get started." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Registered Students</CardTitle>
                        <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Name</th>
                                        <th className="px-6 py-3 font-semibold">National ID</th>
                                        <th className="px-6 py-3 font-semibold">Date of Birth</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-[#006b3f]/10 flex items-center justify-center mr-3">
                                                    <User className="w-4 h-4 text-[#006b3f]" />
                                                </div>
                                                <div>
                                                    <p>{student.firstName} {student.lastName}</p>
                                                    <p className="text-xs text-gray-500 font-normal">{student.gender || "Not specified"}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{student.nationalId || "N/A"}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="sm">View Profile</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
