"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Plus, Filter, Tag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";
import { AddSubjectModal } from "./components/AddSubjectModal";

export default function SubjectsPage() {
    const { authData } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Bypass permission check for Admin testing
    const hasCreatePermission = true;

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Fetch subjects
            const res = await fetchApi("/academic/subjects");
            if (!res.ok) throw new Error("Failed to load subjects");
            const data = await res.json();
            setSubjects(data);

            // Fetch active year
            const yearsRes = await fetchApi("/academic/years");
            if (yearsRes.ok) {
                const yearsData: AcademicYear[] = await yearsRes.json();
                setActiveYear(yearsData.find(y => y.status === "ACTIVE") || null);
            }

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

    if (loading && subjects.length === 0) {
        return <LoadingState message="Loading subjects catalog..." />;
    }

    if (error && subjects.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <BookOpen className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Subjects Catalog
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage global curriculum subjects offered across the platform.</p>
                </div>
                {hasCreatePermission && activeYear && (
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
                        Add Subject
                    </Button>
                )}
            </div>

            {subjects.length === 0 ? (
                <EmptyState 
                    title="No Subjects Found" 
                    message="There are no subjects defined in the catalog yet." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Catalog Items</CardTitle>
                        <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Code</th>
                                        <th className="px-6 py-3 font-semibold">Name</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subjects.map((subject) => (
                                        <tr key={subject.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                <div className="flex items-center">
                                                    <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                                    {subject.code || "N/A"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 font-medium">{subject.name}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="sm">Manage</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeYear && (
                <AddSubjectModal 
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={loadData}
                    activeYearId={activeYear.id}
                />
            )}
        </div>
    );
}
