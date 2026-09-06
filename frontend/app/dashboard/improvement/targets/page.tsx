"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    BarChart2, 
    Plus, 
    Search, 
    Sparkles, 
    TrendingUp, 
    Target, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImprovementTargetsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [targets, setTargets] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        metricTitle: "",
        baselineValue: "62",
        targetValue: "85",
        currentValue: "71",
        unit: "%"
    });

    const loadTargets = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/targets");
            if (res.ok) {
                const data = await res.json();
                setTargets(Array.isArray(data) ? data : []);
            } else {
                setTargets([]);
            }
        } catch (err: any) {
            console.error(err);
            setTargets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTargets();
    }, []);

    const handleCreateTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.metricTitle.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/improvement/targets", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    metricTitle: "",
                    baselineValue: "62",
                    targetValue: "85",
                    currentValue: "71",
                    unit: "%"
                });
                loadTargets();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading KPI improvement targets from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 12.5: Quantitative KPI Improvement Targets
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Institutional Data Analysts.
                        <br />
                        <strong>Data Source:</strong> Database table `improvement_target` queried via REST API (`/api/improvement/targets`).
                        <br />
                        <strong>SRS Purpose:</strong> Establishes measurable baseline values, target goals %, and real-time metric tracking.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BarChart2 className="w-7 h-7 text-[#006b3f]" />
                        <span>5. Quantitative KPI Targets</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Institutional performance benchmarks, baseline metrics, and progress goals.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Set KPI Target
                </Button>
            </div>

            {/* Directory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targets.length === 0 ? (
                    <Card className="shadow-sm md:col-span-2">
                        <CardContent className="p-12 text-center text-gray-500">
                            <BarChart2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No KPI targets set in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Set KPI Target" above to establish a quantitative improvement goal.</p>
                        </CardContent>
                    </Card>
                ) : (
                    targets.map((t) => (
                        <Card key={t.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-gray-900">{t.metricTitle}</CardTitle>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    Goal: {t.targetValue}{t.unit}
                                </span>
                            </CardHeader>
                            <CardContent className="py-4 text-sm space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-gray-50 p-2.5 rounded-lg">
                                        <p className="text-xs text-gray-400 font-medium">Baseline</p>
                                        <p className="text-base font-bold text-gray-700">{t.baselineValue}{t.unit}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-medium">Current</p>
                                        <p className="text-base font-bold text-[#006b3f]">{t.currentValue}{t.unit}</p>
                                    </div>
                                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-600 font-medium">Target</p>
                                        <p className="text-base font-bold text-blue-800">{t.targetValue}{t.unit}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Set KPI Improvement Target</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateTarget} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Metric Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.metricTitle}
                                    onChange={(e) => setForm({ ...form, metricTitle: e.target.value })}
                                    placeholder="e.g. Grade 12 National Exam Pass Rate"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Baseline</label>
                                    <input
                                        type="number"
                                        required
                                        value={form.baselineValue}
                                        onChange={(e) => setForm({ ...form, baselineValue: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Current</label>
                                    <input
                                        type="number"
                                        required
                                        value={form.currentValue}
                                        onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Goal</label>
                                    <input
                                        type="number"
                                        required
                                        value={form.targetValue}
                                        onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Save Target</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
