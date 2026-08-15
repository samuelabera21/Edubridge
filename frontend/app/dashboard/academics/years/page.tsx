"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Plus, CheckCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

export default function AcademicYearsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "ACADEMIC:MANAGE")
    );

    const loadYears = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/academic/years");
            if (!res.ok) throw new Error("Failed to load academic years");
            const data = await res.json();
            setYears(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadYears();
    }, []);

    if (loading && years.length === 0) {
        return <LoadingState message="Loading academic structure..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <Calendar className="w-6 h-6 mr-2 text-blue-500" />
                        Academic Years
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage school years, calendars, and academic terms.</p>
                </div>
                {hasCreatePermission && (
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        New Academic Year
                    </Button>
                )}
            </div>

            {years.length === 0 ? (
                <EmptyState 
                    title="No Academic Years Found" 
                    message="You have not set up any academic years yet. Create your first academic year to get started." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50">
                        <CardTitle>Historical & Active Years</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Name</th>
                                        <th className="px-6 py-3 font-semibold">Start Date</th>
                                        <th className="px-6 py-3 font-semibold">End Date</th>
                                        <th className="px-6 py-3 font-semibold">Status</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {years.map((year) => (
                                        <tr key={year.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{year.name}</td>
                                            <td className="px-6 py-4 text-gray-600">{new Date(year.startDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-gray-600">{new Date(year.endDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                {year.status === "ACTIVE" && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                                                    </span>
                                                )}
                                                {year.status === "DRAFT" && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        <Clock className="w-3 h-3 mr-1" /> Draft
                                                    </span>
                                                )}
                                                {year.status === "COMPLETED" && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
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
        </div>
    );
}
