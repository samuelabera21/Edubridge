"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Target, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    TrendingUp, 
    BarChart3, 
    Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImprovementPrioritiesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [priorities, setPriorities] = useState<any[]>([]);

    const loadPriorities = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/priorities");
            if (res.ok) {
                const data = await res.json();
                setPriorities(Array.isArray(data) ? data : []);
            } else {
                setPriorities([]);
            }
        } catch (err: any) {
            console.error(err);
            setPriorities([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPriorities();
    }, []);

    if (loading) return <LoadingState message="Ranking institutional improvement priorities from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 12.2: Institutional Improvement Priorities
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal, Academic Vice-Principal & Department Chairs.
                        <br />
                        <strong>Data Source:</strong> Database table `school_problem` queried via REST API (`/api/improvement/priorities`).
                        <br />
                        <strong>SRS Purpose:</strong> Ranks critical problem areas by strategic priority to direct School Improvement Plan (SIP) budget allocations.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Target className="w-7 h-7 text-purple-600" />
                        <span>2. School Improvement Priorities</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Strategic focus areas ranked by urgency, impact score, and target intervention windows.</p>
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                        Ranked Priority Matrix
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {priorities.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Target className="w-12 h-12 mx-auto text-purple-300 mb-2" />
                            <p className="font-semibold text-gray-800">No improvement priorities established in database</p>
                            <p className="text-xs text-gray-400 mt-1">Priority rankings will generate automatically when school challenges are logged.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Priority Area Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Severity Rating</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {priorities.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.problemTitle}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{p.category}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                    {p.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
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
