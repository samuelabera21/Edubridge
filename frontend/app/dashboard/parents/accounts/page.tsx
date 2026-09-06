"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    Plus, 
    Search, 
    Sparkles, 
    Phone, 
    Mail, 
    UserCheck, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentAccountsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [parents, setParents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: ""
    });

    const loadParents = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/parent");
            if (res.ok) {
                const data = await res.json();
                setParents(Array.isArray(data) ? data : []);
            } else {
                setParents([]);
            }
        } catch (err: any) {
            console.error(err);
            setParents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadParents();
    }, []);

    const handleCreateParent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.firstName.trim() || !form.lastName.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ firstName: "", lastName: "", phoneNumber: "", email: "" });
                loadParents();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = parents.filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phoneNumber && p.phoneNumber.includes(searchQuery))
    );

    if (loading) return <LoadingState message="Loading registered parent & guardian accounts from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 10.1: Parent & Guardian Accounts
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & School Registrars.
                        <br />
                        <strong>Data Source:</strong> Database table `parent` queried via REST API (`/api/parent`).
                        <br />
                        <strong>SRS Purpose:</strong> Registers primary guardians, manages phone/email contacts, and provisions portal access credentials.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Users className="w-7 h-7 text-[#006b3f]" />
                        <span>1. Parent & Guardian Accounts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Directory of registered parents, primary phone numbers, and linked user profiles.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Register Parent Account
                </Button>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Registered Parent & Guardian Accounts
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search parent name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No parent accounts found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Register Parent Account" above to add new parent & guardian contacts.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Full Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Phone Number</th>
                                        <th className="px-6 py-3.5 font-semibold">Email</th>
                                        <th className="px-6 py-3.5 font-semibold">Linked Children</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.firstName} {p.lastName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-emerald-800 flex items-center">
                                                <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                                {p.phoneNumber || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600">
                                                {p.email ? (
                                                    <span className="flex items-center">
                                                        <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                                        {p.email}
                                                    </span>
                                                ) : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-purple-700">
                                                {p.children?.length || 0} Children
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    ACTIVE
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

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Register Parent Account</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateParent} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.firstName}
                                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                        placeholder="e.g. Kebede"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.lastName}
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                        placeholder="e.g. Tadesse"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Primary Phone Number</label>
                                <input
                                    type="text"
                                    value={form.phoneNumber}
                                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                    placeholder="+251 91 123 4567"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="kebede@gmail.com"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Create Account</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
