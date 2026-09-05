"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Plus, Search, Tag, Award, CheckCircle2, Clock, Layers } from "lucide-react";
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
    const [searchQuery, setSearchQuery] = useState<string>("");

    const hasCreatePermission = authData?.access.some(acc => 
        ["ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => p.permission?.name === "ACADEMIC:CREATE")
    );

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Fetch subjects
            const res = await fetchApi("/academic/subjects");
            if (!res.ok) throw new Error("Failed to load subjects");
            const data = await res.json();
            setSubjects(Array.isArray(data) ? data : []);

            // Fetch active year
            const yearsRes = await fetchApi("/academic/years");
            if (yearsRes.ok) {
                const yearsData: AcademicYear[] = await yearsRes.json();
                setActiveYear(yearsData.find(y => y.status === "ACTIVE") || null);
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading subjects.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredSubjects = subjects.filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.code && s.code.toLowerCase().includes(q)) ||
            (s.category && s.category.toLowerCase().includes(q))
        );
    });

    if (loading && subjects.length === 0) {
        return <LoadingState message="Loading subjects catalog & curriculum specifications..." />;
    }

    if (error && subjects.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BookOpen className="w-7 h-7 text-[#006b3f]" />
                        <span>Curriculum Subjects Catalog & Period Allocation</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage core academic subjects, weekly period allocations, and syllabus streams.</p>
                </div>
                {hasCreatePermission && activeYear && (
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
                        Add Subject
                    </Button>
                )}
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Catalog Subjects</p>
                            <p className="text-xl font-bold text-gray-900">{subjects.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Sciences & Math</p>
                            <p className="text-xl font-bold text-gray-900">
                                {subjects.filter(s => ["Physics", "Chemistry", "Biology", "Mathematics"].some(name => (s.name || "").includes(name))).length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Languages</p>
                            <p className="text-xl font-bold text-gray-900">
                                {subjects.filter(s => ["English", "Amharic", "Afan Oromo", "Tigrigna", "Language"].some(name => (s.name || "").includes(name))).length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Avg Periods / Wk</p>
                            <p className="text-xl font-bold text-gray-900">4.5</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {subjects.length === 0 ? (
                <EmptyState 
                    title="No Subjects Found" 
                    message="There are no subjects defined in the catalog yet." 
                />
            ) : (
                <Card className="shadow-sm">
                    <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-base font-bold text-gray-900">Subject Catalog & Allocation Matrix</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search subject name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Subject Code</th>
                                        <th className="px-6 py-3.5 font-semibold">Subject Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Curriculum Stream</th>
                                        <th className="px-6 py-3.5 font-semibold">Recommended Periods/Wk</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSubjects.map((subject) => {
                                        const nameLower = (subject.name || "").toLowerCase();
                                        let categoryBadge = (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                GENERAL
                                            </span>
                                        );

                                        if (nameLower.includes("physics") || nameLower.includes("chemistry") || nameLower.includes("biology")) {
                                            categoryBadge = (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                                    NATURAL SCIENCE
                                                </span>
                                            );
                                        } else if (nameLower.includes("math")) {
                                            categoryBadge = (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                    MATHEMATICS
                                                </span>
                                            );
                                        } else if (nameLower.includes("english") || nameLower.includes("amharic") || nameLower.includes("oromo") || nameLower.includes("tigrigna")) {
                                            categoryBadge = (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                    LANGUAGE
                                                </span>
                                            );
                                        } else if (nameLower.includes("history") || nameLower.includes("geography") || nameLower.includes("civics")) {
                                            categoryBadge = (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                    SOCIAL SCIENCE
                                                </span>
                                            );
                                        }

                                        return (
                                            <tr key={subject.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    <div className="flex items-center">
                                                        <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                                        {subject.code || "SUB-01"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 font-semibold">{subject.name}</td>
                                                <td className="px-6 py-4">
                                                    {categoryBadge}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 font-medium">
                                                    <span className="inline-flex items-center text-xs font-semibold text-[#006b3f] bg-emerald-50 px-2.5 py-1 rounded-md">
                                                        4 - 5 Periods/Wk
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <Button variant="ghost" size="sm">Manage Syllabus</Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
