"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Award, 
    Plus, 
    Search, 
    Sparkles, 
    Heart, 
    Clock, 
    Users, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentParticipationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [participations, setParticipations] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        parentName: "",
        activityTitle: "",
        category: "VOLUNTEER",
        hoursLogged: "2",
        eventDate: new Date().toISOString().split("T")[0]
    });

    const loadParticipations = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/parent/participations");
            if (res.ok) {
                const data = await res.json();
                setParticipations(Array.isArray(data) ? data : []);
            } else {
                setParticipations([]);
            }
        } catch (err: any) {
            console.error(err);
            setParticipations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadParticipations();
    }, []);

    const handleCreateParticipation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.parentName.trim() || !form.activityTitle.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/participations", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    parentName: "",
                    activityTitle: "",
                    category: "VOLUNTEER",
                    hoursLogged: "2",
                    eventDate: new Date().toISOString().split("T")[0]
                });
                loadParticipations();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading parent volunteer & community participation logs from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 10.6: Parent Volunteerism & School Community Engagement
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & PTA Event Leads.
                        <br />
                        <strong>Data Source:</strong> Database table `parent_participation` queried via REST API (`/api/parent/participations`).
                        <br />
                        <strong>SRS Purpose:</strong> Registers community volunteer activities, PTA committee contributions, fundraising events, and logged service hours.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Heart className="w-7 h-7 text-amber-600" />
                        <span>6. Parent Community Participation & Volunteers</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Volunteer service hours, PTA committees, and community engagement logs.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Log Parent Participation
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-amber-600" />
                        Parent Volunteer & Event Contributions
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {participations.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Heart className="w-12 h-12 mx-auto text-amber-300 mb-2" />
                            <p className="font-semibold text-gray-800">No parent participation entries logged in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Log Parent Participation" above to record volunteer service hours or PTA event support.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Parent Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Activity Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Logged Hours</th>
                                        <th className="px-6 py-3.5 font-semibold">Event Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {participations.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.parentName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{p.activityTitle}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-purple-700">
                                                {p.hoursLogged} Hours
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600">
                                                {p.eventDate ? new Date(p.eventDate).toLocaleDateString() : "Recent"}
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
                            <h3 className="text-lg font-bold text-gray-900">Log Parent Participation</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateParticipation} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Parent Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.parentName}
                                    onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                                    placeholder="e.g. Almaz Bekele"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Activity / Event Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.activityTitle}
                                    onChange={(e) => setForm({ ...form, activityTitle: e.target.value })}
                                    placeholder="e.g. School Library Book Organization Day"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="VOLUNTEER">Campus Volunteer</option>
                                        <option value="PTA_COMMITTEE">PTA Committee</option>
                                        <option value="FUNDRAISING">Fundraising & Support</option>
                                        <option value="EVENT_SUPPORT">Event Organization</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Hours Logged</label>
                                    <input
                                        type="number"
                                        value={form.hoursLogged}
                                        onChange={(e) => setForm({ ...form, hoursLogged: e.target.value })}
                                        placeholder="2"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Event Date</label>
                                <input
                                    type="date"
                                    value={form.eventDate}
                                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Log Participation</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
