"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    Plus, 
    Search, 
    Award, 
    Star, 
    Users, 
    X,
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function EnrichmentProgramsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [clubs, setClubs] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        clubName: "",
        category: "STEM",
        coordinatorTeacher: "",
        meetingSchedule: "Wednesday 3:30 PM",
        description: ""
    });

    const loadClubs = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/support/enrichment");
            if (res.ok) {
                const data = await res.json();
                setClubs(Array.isArray(data) ? data : []);
            } else {
                setClubs([]);
            }
        } catch (err: any) {
            console.error(err);
            setClubs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClubs();
    }, []);

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clubName.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/support/enrichment", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    clubName: "",
                    category: "STEM",
                    coordinatorTeacher: "",
                    meetingSchedule: "Wednesday 3:30 PM",
                    description: ""
                });
                loadClubs();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading enrichment & talent development programs from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 9.4: Academic Enrichment & High-Achiever Program Manager
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & STEM Talent Coordinators.
                        <br />
                        <strong>Data Source:</strong> Database table `enrichment_program` queried via REST API (`/api/support/enrichment`).
                        <br />
                        <strong>SRS Purpose:</strong> Provides advanced academic challenges (Math Olympiad, Science Fairs, Robotics, Coding) for high-performing students.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Star className="w-7 h-7 text-amber-500" />
                        <span>4. Enrichment & Academic Talent Clubs</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">High-achiever academic programs, Olympiads, and STEM talent development registries.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Register Enrichment Program
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-amber-500" />
                        Active Enrichment Clubs & Talent Rosters
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {clubs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Star className="w-12 h-12 mx-auto text-amber-300 mb-2" />
                            <p className="font-semibold text-gray-800">No enrichment programs registered in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Register Enrichment Program" above to add Math Olympiads, Science Fairs, or Coding Clubs.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Program / Club Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Faculty Advisor</th>
                                        <th className="px-6 py-3.5 font-semibold">Schedule</th>
                                        <th className="px-6 py-3.5 font-semibold">Members</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {clubs.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{c.clubName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                    {c.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-800">{c.coordinatorTeacher || "Faculty Lead"}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600">{c.meetingSchedule}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-emerald-700">
                                                {c.memberCount} Members
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
                            <h3 className="text-lg font-bold text-gray-900">Register Enrichment Program / Club</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateClub} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Club / Program Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.clubName}
                                    onChange={(e) => setForm({ ...form, clubName: e.target.value })}
                                    placeholder="e.g. National Math Olympiad Squad"
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
                                        <option value="STEM">STEM & Robotics</option>
                                        <option value="OLYMPIAD">Math/Science Olympiad</option>
                                        <option value="LEADERSHIP">Student Leadership</option>
                                        <option value="DEBATE">Debate & Public Speaking</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Faculty Lead</label>
                                    <input
                                        type="text"
                                        value={form.coordinatorTeacher}
                                        onChange={(e) => setForm({ ...form, coordinatorTeacher: e.target.value })}
                                        placeholder="e.g. Marta Haile"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Meeting Schedule</label>
                                <input
                                    type="text"
                                    value={form.meetingSchedule}
                                    onChange={(e) => setForm({ ...form, meetingSchedule: e.target.value })}
                                    placeholder="Wednesday 3:30 PM - 5:00 PM"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Save Program</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
