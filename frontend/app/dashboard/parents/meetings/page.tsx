"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Calendar, 
    Plus, 
    Search, 
    Sparkles, 
    MapPin, 
    Clock, 
    Users, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentMeetingsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        meetingType: "PTA_GENERAL",
        scheduledDate: new Date().toISOString().split("T")[0],
        location: "Main Assembly Hall",
        agenda: ""
    });

    const loadMeetings = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/parent/meetings");
            if (res.ok) {
                const data = await res.json();
                setMeetings(Array.isArray(data) ? data : []);
            } else {
                setMeetings([]);
            }
        } catch (err: any) {
            console.error(err);
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMeetings();
    }, []);

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/meetings", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    title: "",
                    meetingType: "PTA_GENERAL",
                    scheduledDate: new Date().toISOString().split("T")[0],
                    location: "Main Assembly Hall",
                    agenda: ""
                });
                loadMeetings();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading parent meetings & PTA conference schedule from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 10.4: Parent Meetings & PTA Conferences
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & PTA Executive Committee.
                        <br />
                        <strong>Data Source:</strong> Database table `parent_meeting` queried via REST API (`/api/parent/meetings`).
                        <br />
                        <strong>SRS Purpose:</strong> Schedules PTA General Assemblies, Parent-Teacher conferences, meeting agendas, and venue management.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Calendar className="w-7 h-7 text-[#006b3f]" />
                        <span>4. Parent Meetings & PTA Conferences</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Schedule and manage PTA general meetings and parent-teacher consultations.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Schedule Parent Meeting
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Scheduled Parent Meetings & PTA Gatherings
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {meetings.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No parent meetings scheduled in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Schedule Parent Meeting" above to set up a new PTA conference or assembly.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Meeting Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Type</th>
                                        <th className="px-6 py-3.5 font-semibold">Scheduled Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Venue / Location</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {meetings.map((m) => (
                                        <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{m.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                    {m.meetingType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700">
                                                {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : "TBD"}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600 flex items-center">
                                                <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                                {m.location}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {m.status}
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
                            <h3 className="text-lg font-bold text-gray-900">Schedule Parent Meeting</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateMeeting} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Meeting Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Q1 General PTA Assembly & Gradebook Review"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Meeting Type</label>
                                    <select
                                        value={form.meetingType}
                                        onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="PTA_GENERAL">PTA General Assembly</option>
                                        <option value="PARENT_TEACHER_CONFERENCE">Parent-Teacher Conference</option>
                                        <option value="EMERGENCY_MEETING">Emergency Meeting</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={form.scheduledDate}
                                        onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Venue / Location</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="Main Assembly Hall"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Agenda & Meeting Topics</label>
                                <textarea
                                    value={form.agenda}
                                    onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                                    placeholder="e.g. Discuss school infrastructure improvements and Q1 report cards..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Schedule Meeting</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
