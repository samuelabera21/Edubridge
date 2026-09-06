"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    FileText, 
    Plus, 
    Search, 
    Sparkles, 
    Calendar, 
    DollarSign, 
    UserCheck, 
    X,
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImprovementPlansPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        targetYear: "2018 E.C.",
        allocatedBudget: "150000",
        leadCoordinator: "",
        description: ""
    });

    const loadPlans = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/plans");
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
        loadPlans();
    }, []);

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/improvement/plans", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    title: "",
                    targetYear: "2018 E.C.",
                    allocatedBudget: "150000",
                    leadCoordinator: "",
                    description: ""
                });
                loadPlans();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading Master School Improvement Plans (SIP) from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 12.3: Master School Improvement Plans (SIP)
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Academic Vice-Principal & Woreda Education Officers.
                        <br />
                        <strong>Data Source:</strong> Database table `improvement_plan` queried via REST API (`/api/improvement/plans`).
                        <br />
                        <strong>SRS Purpose:</strong> Formulates multi-year strategic improvement blueprints, lead coordinator assignments, and budget allocations.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <FileText className="w-7 h-7 text-[#006b3f]" />
                        <span>3. Master School Improvement Plans (SIP)</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Official institutional development blueprints, budget tracking, and objective timelines.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Create Improvement Plan
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Active School Development Blueprints
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {plans.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FileText className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No active improvement plans found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Create Improvement Plan" above to set up a new School Improvement Plan (SIP).</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Plan Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Description</th>
                                        <th className="px-6 py-3.5 font-semibold">Start Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {plans.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.title}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">{p.description}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {p.startDate ? new Date(p.startDate).toLocaleDateString() : "Active"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Create School Improvement Plan (SIP)</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Plan Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. 2018 Academic Excellence & Lab Upgrade Plan"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Academic Year</label>
                                    <input
                                        type="text"
                                        value={form.targetYear}
                                        onChange={(e) => setForm({ ...form, targetYear: e.target.value })}
                                        placeholder="2018 E.C."
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Lead Coordinator</label>
                                    <input
                                        type="text"
                                        value={form.leadCoordinator}
                                        onChange={(e) => setForm({ ...form, leadCoordinator: e.target.value })}
                                        placeholder="Vice Principal Marta"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Plan Objectives & Scope</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Write objectives and scope here..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Save Plan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
