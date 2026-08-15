"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardCheck, Filter, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TeacherAttendancePage() {
    const { authData } = useAuth();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/teacher");
            if (!res.ok) throw new Error("Failed to load teachers for attendance");
            const data = await res.json();
            
            // Only show ACTIVE teachers for attendance tracking
            setTeachers(data.filter((t: any) => t.status === "ACTIVE"));
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

    if (loading && teachers.length === 0) {
        return <LoadingState message="Loading teacher roster..." />;
    }

    if (error && teachers.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <ClipboardCheck className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Teacher Attendance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage daily attendance for active faculty members.</p>
                </div>
            </div>

            {teachers.length === 0 ? (
                <EmptyState 
                    title="No Active Teachers" 
                    message="There are no active teachers registered to track attendance." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Faculty Roster</CardTitle>
                        <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Teacher Name</th>
                                        <th className="px-6 py-3 font-semibold">Staff ID</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teachers.map((teacher) => (
                                        <tr key={teacher.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-[#006b3f]/10 flex items-center justify-center mr-3">
                                                    <User className="w-4 h-4 text-[#006b3f]" />
                                                </div>
                                                <div>
                                                    <p>{teacher.firstName} {teacher.lastName}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{teacher.staffIdCode || "N/A"}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="sm">View History</Button>
                                                <Button size="sm">Mark Attendance</Button>
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
