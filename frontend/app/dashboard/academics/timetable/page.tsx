"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Plus, Filter, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TimetablePage() {
    const { authData } = useAuth();
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "ACADEMIC:MANAGE")
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/timetable/periods");
            if (!res.ok) throw new Error("Failed to load class periods");
            const data = await res.json();
            setPeriods(data);
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

    if (loading && periods.length === 0) {
        return <LoadingState message="Loading timetable periods..." />;
    }

    if (error && periods.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <Clock className="w-6 h-6 mr-2 text-blue-500" />
                        Class Periods & Timetable
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Configure standard class periods and schedule assignments.</p>
                </div>
                {hasCreatePermission && (
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        Add Period
                    </Button>
                )}
            </div>

            {periods.length === 0 ? (
                <EmptyState 
                    title="No Periods Configured" 
                    message="There are no class periods defined for the school. Start by defining periods (e.g., Period 1, Break, Period 2)." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>School Periods</CardTitle>
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
                                        <th className="px-6 py-3 font-semibold">Start Time</th>
                                        <th className="px-6 py-3 font-semibold">End Time</th>
                                        <th className="px-6 py-3 font-semibold">Type</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {periods.map((period) => (
                                        <tr key={period.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                {period.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{period.startTime}</td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{period.endTime}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${period.isBreak ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {period.isBreak ? 'Break' : 'Instructional'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="sm">Edit</Button>
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
