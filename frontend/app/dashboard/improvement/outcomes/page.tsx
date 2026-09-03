"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Award, 
    Plus, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    Star, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImprovementOutcomesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [outcomes, setOutcomes] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        planTitle: "",
        achievedPercentage: "95",
        impactRating: "EXCELLENT",
        notes: ""
    });

    const loadOutcomes = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/outcomes");
            if (res.ok) {
                const data = await res.json();
                setOutcomes(Array.isArray(data) ? data : []);
            } else {
                setOutcomes([]);
            }
        } catch (err: any) {
            console.error(err);
            setOutcomes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOutcomes();
    }, []);

    const handleCreateOutcome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.planTitle.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/improvement/outcomes", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    planTitle: "",
                    achievedPercentage: "95",
                    impactRating: "EXCELLENT",
                    notes: ""
                });
                loadOutcomes();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading School Improvement outcomes & impact evaluations..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 12.7: Improvement Plan Outcomes & Impact Evaluation
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Uses This:</strong> School Principal, Board of Governors & Woreda Education Bureau.
                        <br />
                        <strong>Data Source:</strong> Database table `improvement_outcome` queried via REST API (`/api/improvement/outcomes`).
                        <br />
                        <strong>SRS Purpose:</strong> Post-implementation impact evaluations, final target achievement percentages, and inspection review summaries.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Award className="w-7 h-7 text-amber-600" />
                        <span>7. Plan Outcomes & Impact Evaluation</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Final evaluation reports, percentage target attainment, and quality inspection ratings.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Record Impact Evaluation
                </Button>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-amber-600" />
                        Evaluation & Impact Registry
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {outcomes.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Award className="w-12 h-12 mx-auto text-amber-300 mb-2" />
                            <p className="font-semibold text-gray-800">No evaluation outcomes recorded in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Record Impact Evaluation" above to log a completed SIP plan evaluation.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Plan Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Target Achieved %</th>
                                        <th className="px-6 py-3.5 font-semibold">Impact Rating</th>
                                        <th className="px-6 py-3.5 font-semibold">Notes / Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {outcomes.map((o) => (
                                        <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{o.planTitle}</td>
                                            <td className="px-6 py-4 font-bold text-[#006b3f]">{o.achievedPercentage}%</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                    {o.impactRating}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">{o.notes || "N/A"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Record Plan Impact Evaluation</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateOutcome} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Plan Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.planTitle}
                                    onChange={(e) => setForm({ ...form, planTitle: e.target.value })}
                                    placeholder="e.g. 2018 Academic Excellence & Lab Upgrade Plan"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Achieved %</label>
                                    <input
                                        type="number"
                                        required
                                        value={form.achievedPercentage}
                                        onChange={(e) => setForm({ ...form, achievedPercentage: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Impact Rating</label>
                                    <select
                                        value={form.impactRating}
                                        onChange={(e) => setForm({ ...form, impactRating: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="EXCELLENT">Excellent Impact</option>
                                        <option value="SATISFACTORY">Satisfactory Progress</option>
                                        <option value="NEEDS_WORK">Needs Work / Incomplete</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Evaluation Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Write inspection review notes here..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Save Outcome</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
