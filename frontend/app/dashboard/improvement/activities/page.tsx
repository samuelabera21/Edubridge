"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    CheckSquare, 
    Plus, 
    Search, 
    Sparkles, 
    Calendar, 
    Users, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImprovementActivitiesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        activityTitle: "",
        assignedTeam: "Academic Steering Committee",
        dueDate: new Date().toISOString().split("T")[0]
    });

    const loadActivities = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/activities");
            if (res.ok) {
                const data = await res.json();
                setActivities(Array.isArray(data) ? data : []);
            } else {
                setActivities([]);
            }
        } catch (err: any) {
            console.error(err);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivities();
    }, []);

    const handleCreateActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.activityTitle.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/improvement/activities", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    activityTitle: "",
                    assignedTeam: "Academic Steering Committee",
                    dueDate: new Date().toISOString().split("T")[0]
                });
                loadActivities();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading improvement milestone activities from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 12.4: Improvement Execution Activities & Milestones
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> Department Chairs, Committee Leads & Project Supervisors.
                        <br />
                        <strong>Data Source:</strong> Database table `improvement_activity` queried via REST API (`/api/improvement/activities`).
                        <br />
                        <strong>SRS Purpose:</strong> Operational task assignments (e.g., Procure lab equipment, conduct teacher workshops, implement remedial timetable).
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <CheckSquare className="w-7 h-7 text-blue-600" />
                        <span>4. Improvement Execution Activities</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Actionable milestone tasks, team assignments, and target deadlines.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Log Activity Milestone
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />
                        Activity Execution Log
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {activities.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CheckSquare className="w-12 h-12 mx-auto text-blue-300 mb-2" />
                            <p className="font-semibold text-gray-800">No improvement activities logged in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Log Activity Milestone" above to record a new execution task.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Activity Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Assigned Team / Department</th>
                                        <th className="px-6 py-3.5 font-semibold">Target Due Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activities.map((a) => (
                                        <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{a.activityTitle}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{a.assignedTeam}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600">
                                                {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "Pending"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                    {a.status}
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
                            <h3 className="text-lg font-bold text-gray-900">Log Improvement Activity Milestone</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateActivity} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Activity Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.activityTitle}
                                    onChange={(e) => setForm({ ...form, activityTitle: e.target.value })}
                                    placeholder="e.g. Conduct Bi-weekly Pedagogical Workshop for Physics Teachers"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Assigned Department</label>
                                    <input
                                        type="text"
                                        value={form.assignedTeam}
                                        onChange={(e) => setForm({ ...form, assignedTeam: e.target.value })}
                                        placeholder="Physics Dept"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Due Date</label>
                                    <input
                                        type="date"
                                        value={form.dueDate}
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Save Activity</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
