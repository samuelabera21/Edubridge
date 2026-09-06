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
    FileCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImprovementProgressMonitoringPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<any[]>([]);

    const loadMonitoring = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/monitoring");
            if (res.ok) {
                const data = await res.json();
                setPlans(Array.isArray(data) ? data : []);
            } else {
                setPlans([]);
            }
        } catch (err: any) {
            console.error(err);
            setPlans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMonitoring();
    }, []);

    if (loading) return <LoadingState message="Loading School Improvement Plan monitoring audits from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-indigo-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-indigo-700" />
                        SRS Domain 12.6: School Improvement Progress Monitoring
                    </span>
                    <p className="text-indigo-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & School Quality Inspection Committee.
                        <br />
                        <strong>Data Source:</strong> Database table `improvement_plan` queried via REST API (`/api/improvement/monitoring`).
                        <br />
                        <strong>SRS Purpose:</strong> Quarterly milestone audits, implementation velocity tracking, and inspection readiness reviews.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Activity className="w-7 h-7 text-indigo-600" />
                        <span>6. SIP Implementation Progress Monitoring</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time audit monitoring of active School Improvement Plans and completion milestones.</p>
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileCheck className="w-5 h-5 mr-2 text-indigo-600" />
                        Active Strategic Plan Audits
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {plans.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Activity className="w-12 h-12 mx-auto text-indigo-300 mb-2" />
                            <p className="font-semibold text-gray-800">No improvement plans currently being audited</p>
                            <p className="text-xs text-gray-400 mt-1">Audit trackers will update automatically when active plans progress.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Plan Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Objectives</th>
                                        <th className="px-6 py-3.5 font-semibold">Audit Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {plans.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.title}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">{p.objectives}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                                                    {p.status}
                                                </span>
                                            </td>
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
