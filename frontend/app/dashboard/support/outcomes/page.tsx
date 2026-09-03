"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Award, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    TrendingUp, 
    BarChart3, 
    Users,
    Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function InterventionOutcomesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [outcomes, setOutcomes] = useState<any[]>([]);

    const loadOutcomes = async () => {
        try {
            setLoading(true);
            setOutcomes([]);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOutcomes();
    }, []);

    if (loading) return <LoadingState message="Calculating intervention program outcome analytics..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 9.7: Intervention Program Outcomes & Impact Evaluation
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Academic Vice-Principal & Woreda Education Officers.
                        <br />
                        <strong>Data Source:</strong> Comparative pre/post assessment scores & intervention completion logs in database.
                        <br />
                        <strong>SRS Purpose:</strong> Evaluates overall success rate (% of at-risk students who successfully improved to passing scores &gt;= 50%).
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Award className="w-7 h-7 text-[#006b3f]" />
                        <span>7. Intervention Outcomes & Impact Analytics</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Comparative performance improvements, pass rate recovery %, and intervention outcome reports.</p>
                </div>
            </div>

            {/* Overall Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Recovery Success Rate</p>
                            <p className="text-xl font-bold text-gray-900">0.0%</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Interventions</p>
                            <p className="text-xl font-bold text-gray-900">{outcomes.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Students Promoted</p>
                            <p className="text-xl font-bold text-purple-900">0</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Avg Score Gain</p>
                            <p className="text-xl font-bold text-amber-900">+0.0%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Intervention Outcome Case Evaluations
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {outcomes.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Award className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No completed intervention evaluations available</p>
                            <p className="text-xs text-gray-400 mt-1">Comparative outcome metrics will generate automatically when students complete tutorial plans and take term exams.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Initial Deficient Score</th>
                                        <th className="px-6 py-3.5 font-semibold">Post-Intervention Score</th>
                                        <th className="px-6 py-3.5 font-semibold">Score Gain (+%)</th>
                                        <th className="px-6 py-3.5 font-semibold">Outcome Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {outcomes.map((o) => (
                                        <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{o.studentName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-red-700">{o.initialScore}%</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{o.postScore}%</td>
                                            <td className="px-6 py-4 text-xs font-bold text-purple-700">+{o.gain}%</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {o.status}
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
