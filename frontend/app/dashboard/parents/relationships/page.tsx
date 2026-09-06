"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    GitFork, 
    Plus, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    ShieldCheck, 
    X,
    FileText,
    Users
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StudentParentRelationshipsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [parents, setParents] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        parentId: "",
        studentId: "",
        relationship: "Mother",
        isPrimary: true,
        canPickup: true
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [pRes, sRes] = await Promise.all([
                fetchApi("/parent"),
                fetchApi("/student")
            ]);

            if (pRes.ok) setParents(await pRes.json());
            if (sRes.ok) setStudents(await sRes.json());
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.parentId || !form.studentId) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/link", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ parentId: "", studentId: "", relationship: "Mother", isPrimary: true, canPickup: true });
                loadData();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Flatten family relationships
    const relationshipsList: any[] = [];
    parents.forEach(p => {
        if (p.children && p.children.length > 0) {
            p.children.forEach((c: any) => {
                relationshipsList.push({
                    id: c.id,
                    parentName: `${p.firstName} ${p.lastName}`,
                    parentPhone: p.phoneNumber || "N/A",
                    studentName: c.student ? `${c.student.firstName} ${c.student.lastName}` : "Student",
                    relationship: c.relationship,
                    isPrimary: c.isPrimary,
                    canPickup: c.canPickup
                });
            });
        }
    });

    if (loading) return <LoadingState message="Loading family links and student-parent relationships..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 10.2: Student-Parent Relationships & Family Links
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal, Registrars & Homeroom Teachers.
                        <br />
                        <strong>Data Source:</strong> Database table `parent_student` queried via REST API (`/api/parent/link`).
                        <br />
                        <strong>SRS Purpose:</strong> Maps primary family relationships (Mother, Father, Guardian), emergency contact permissions, and campus pickup authorizations.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <GitFork className="w-7 h-7 text-purple-600" />
                        <span>2. Student-Parent Relationships</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Family mapping directory, emergency contacts, and student pickup permissions.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Link Parent to Student
                </Button>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-purple-600" />
                        Active Student-Parent Family Links
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {relationshipsList.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <GitFork className="w-12 h-12 mx-auto text-purple-300 mb-2" />
                            <p className="font-semibold text-gray-800">No family relationships mapped in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Link Parent to Student" above to establish guardian-student relationship links.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Parent / Guardian</th>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Relationship</th>
                                        <th className="px-6 py-3.5 font-semibold">Primary Contact</th>
                                        <th className="px-6 py-3.5 font-semibold">Pickup Authorized</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {relationshipsList.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{r.parentName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{r.studentName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                    {r.relationship}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-emerald-700">
                                                {r.isPrimary ? "YES (Primary)" : "Secondary"}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-800">
                                                {r.canPickup ? (
                                                    <span className="flex items-center text-emerald-700 font-bold">
                                                        <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> Authorized
                                                    </span>
                                                ) : "Not Authorized"}
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
                            <h3 className="text-lg font-bold text-gray-900">Link Parent to Student</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleLink} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Parent *</label>
                                <select
                                    required
                                    value={form.parentId}
                                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="">-- Choose Parent --</option>
                                    {parents.map(p => (
                                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.phoneNumber || "No Phone"})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Student *</label>
                                <select
                                    required
                                    value={form.studentId}
                                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentId || "No ID"})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Relationship Type</label>
                                <select
                                    value={form.relationship}
                                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="Mother">Mother</option>
                                    <option value="Father">Father</option>
                                    <option value="Guardian">Legal Guardian</option>
                                    <option value="Relative">Relative</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-4 pt-2">
                                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={form.isPrimary}
                                        onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                                        className="rounded border-gray-300 text-[#006b3f] focus:ring-[#006b3f]"
                                    />
                                    <span>Is Primary Emergency Contact</span>
                                </label>

                                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={form.canPickup}
                                        onChange={(e) => setForm({ ...form, canPickup: e.target.checked })}
                                        className="rounded border-gray-300 text-[#006b3f] focus:ring-[#006b3f]"
                                    />
                                    <span>Authorized for Pickup</span>
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Save Relationship Link</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
