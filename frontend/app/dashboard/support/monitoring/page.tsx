"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Activity, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    Clock, 
    TrendingUp, 
    FileText,
    Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function InterventionMonitoringPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [monitors, setMonitors] = useState<any[]>([]);

    const loadMonitors = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/support/monitoring");
            if (res.ok) {
                const data = await res.json();
                setMonitors(Array.isArray(data) ? data : []);
            } else {
                setMonitors([]);
            }
        } catch (err: any) {
            console.error(err);
            setMonitors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMonitors();
    }, []);

    if (loading) return <LoadingState message="Loading intervention progress monitoring records from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 9.6: Intervention Progress Monitoring
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> Guidance Counselors, Homeroom Teachers & School Principal.
                        <br />
                        <strong>Data Source:</strong> Database table `intervention_monitoring` queried via REST API (`/api/support/monitoring`).
                        <br />
                        <strong>SRS Purpose:</strong> Monitors student progression across intervention milestones (`NOT_STARTED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `TARGET_MET`) and logs attendance.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Activity className="w-7 h-7 text-purple-600" />
                        <span>6. Intervention Progress Monitoring</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Weekly check-in records, tutorial session attendance, and goal milestone tracking.</p>
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                        Intervention Session & Progress Log
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {monitors.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Activity className="w-12 h-12 mx-auto text-purple-300 mb-2" />
                            <p className="font-semibold text-gray-800">No active intervention monitoring logs found in database</p>
                            <p className="text-xs text-gray-400 mt-1">When students participate in tutorial & counseling check-ins, progress logs will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Intervention Program</th>
                                        <th className="px-6 py-3.5 font-semibold">Weekly Attendance</th>
                                        <th className="px-6 py-3.5 font-semibold">Milestone Status</th>
                                        <th className="px-6 py-3.5 font-semibold">Latest Check-in</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {monitors.map((m) => (
                                        <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{m.studentName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{m.programName}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-blue-700">{m.attendanceRate}%</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                    {m.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600">{m.lastCheckInDate ? new Date(m.lastCheckInDate).toLocaleDateString() : "Recent"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
