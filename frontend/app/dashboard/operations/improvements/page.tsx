"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { TrendingUp, Plus, Search, CheckCircle2, AlertTriangle, Calendar, Target, Award, X, Filter, CheckSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface ImprovementPlan {
    id: string;
    title: string;
    description: string;
    objectives: string;
    startDate: string;
    endDate?: string | null;
    status: string;
    createdAt?: string;
}

export default function ImprovementsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [plans, setPlans] = useState<ImprovementPlan[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        objectives: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: ""
    });

    const hasCreatePermission = authData?.access.some(acc =>
        acc.role.permissions.some((p: any) => ["ADMIN", "SCHOOL_ADMIN", "OPERATIONAL:CREATE"].includes(p.permission.name))
    );

    const loadPlans = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const response = await fetchApi("/operational/improvement-plan");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load improvement plans.");
            }
            setPlans(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to fetch school improvement plans.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    const handleOpenModal = () => {
        setErrorMsg(null);
        setFormData({
            title: "",
            description: "",
            objectives: "",
            startDate: new Date().toISOString().split("T")[0],
            endDate: ""
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim() || !formData.objectives.trim() || !formData.startDate) {
            setErrorMsg("Title, description, objectives, and start date are required.");
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                objectives: formData.objectives.trim(),
                startDate: formData.startDate,
                endDate: formData.endDate || undefined
            };

            const response = await fetchApi("/operational/improvement-plan", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to create improvement plan.");
            }

            setSuccessMsg(`School Improvement Plan "${formData.title}" registered successfully.`);
            setIsModalOpen(false);
            loadPlans();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to create improvement plan.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (planId: string, newStatus: string) => {
        try {
            setErrorMsg(null);
            const response = await fetchApi(`/operational/improvement-plan/${planId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to update plan status.");
            }

            setSuccessMsg(`Plan status updated to ${newStatus}.`);
            loadPlans();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update plan status.");
        }
    };

    // Filters
    const filteredPlans = plans.filter(item => {
        const matchesStatus = selectedStatus === "ALL" || item.status === selectedStatus;
        const matchesSearch = searchQuery.trim() === "" ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.objectives.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Metrics
    const totalCount = plans.length;
    const plannedCount = plans.filter(p => p.status === "PLANNED").length;
    const inProgressCount = plans.filter(p => p.status === "IN_PROGRESS").length;
    const completedCount = plans.filter(p => p.status === "COMPLETED").length;

    if (loading) return <LoadingState message="Loading Ethiopian School Improvement Plans (SIP)..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <TrendingUp className="w-7 h-7 text-[#006b3f]" />
                        <span>School Improvement Plans (SIP)</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Register strategic goals, academic targets, and infrastructure priority initiatives.</p>
                </div>
                {hasCreatePermission && (
                    <Button onClick={handleOpenModal} leftIcon={<Plus className="w-4 h-4" />}>
                        New Improvement Plan
                    </Button>
                )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-[#006b3f]/5 border-[#006b3f]/10">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-[#006b3f]/10 text-[#006b3f] rounded-lg">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Initiatives</p>
                            <p className="text-xl font-bold text-gray-900">{totalCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Planned</p>
                            <p className="text-xl font-bold text-gray-900">{plannedCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">In Progress</p>
                            <p className="text-xl font-bold text-gray-900">{inProgressCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Completed</p>
                            <p className="text-xl font-bold text-gray-900">{completedCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span>{errorMsg}</span></span>
                    <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Filter Tabs & Search */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
                        {["ALL", "PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].map(st => (
                            <button
                                key={st}
                                onClick={() => setSelectedStatus(st)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedStatus === st
                                        ? "bg-[#006b3f] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {st.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search plans..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredPlans.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Target className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-700">No improvement plans found</p>
                            <p className="text-xs text-gray-400 mt-1">Register strategic goals to monitor progress for Woreda & Regional evaluation.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Initiative & Strategic Objectives</th>
                                        <th className="px-6 py-3.5 font-semibold">Target Timeline</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Update Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPlans.map((plan) => (
                                        <tr key={plan.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{plan.title}</p>
                                                <p className="text-xs text-gray-600 mt-0.5"><span className="font-medium text-gray-700">Objectives:</span> {plan.objectives}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700 whitespace-nowrap">
                                                <p className="font-medium text-gray-900">Start: {new Date(plan.startDate).toLocaleDateString()}</p>
                                                {plan.endDate && <p className="text-gray-500">Target: {new Date(plan.endDate).toLocaleDateString()}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {plan.status === "PLANNED" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                        PLANNED
                                                    </span>
                                                ) : plan.status === "IN_PROGRESS" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                        IN PROGRESS
                                                    </span>
                                                ) : plan.status === "COMPLETED" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        COMPLETED
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                        ON HOLD
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <select
                                                    value={plan.status}
                                                    onChange={(e) => handleUpdateStatus(plan.id, e.target.value)}
                                                    className="text-xs border border-gray-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-[#006b3f]"
                                                >
                                                    <option value="PLANNED">Set PLANNED</option>
                                                    <option value="IN_PROGRESS">Set IN PROGRESS</option>
                                                    <option value="COMPLETED">Set COMPLETED</option>
                                                    <option value="ON_HOLD">Set ON HOLD</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* New Plan Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">New School Improvement Initiative</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Initiative Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Science Lab Equipment Upgrade Initiative"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Strategic Objectives & Pass Target *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.objectives}
                                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                                    placeholder="e.g. Equip Grade 8 Chemistry Lab & increase pass rate to 85%"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target End Date</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Detailed Description *</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe priority activities, budget allocation, and Woreda targets..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting}>
                                    Register Improvement Plan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
