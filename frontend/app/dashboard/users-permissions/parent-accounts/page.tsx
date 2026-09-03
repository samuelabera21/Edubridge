"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    Sparkles, 
    Phone, 
    UserCheck, 
    Heart
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentAccountsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [parents, setParents] = useState<any[]>([]);

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

    if (loading) return <LoadingState message="Loading parent & guardian accounts from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 15.6: Parent & Guardian Portal Accounts
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal & Parent Liaison Officer.
                        <br />
                        <strong>Data Source:</strong> Database table `parent` queried via REST API (`/api/parent`).
                        <br />
                        <strong>SRS Purpose:</strong> Guardian portal access, phone number SMS verification setup, and student linkage.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Users className="w-7 h-7 text-[#006b3f]" />
                        <span>6. Parent & Guardian Accounts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Parent portal access credentials, phone contacts, and linked student accounts.</p>
                </div>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Registered Parent Logins
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {parents.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No parent accounts found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Parent accounts will display automatically when family links are created.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Parent Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Phone Contact</th>
                                        <th className="px-6 py-3.5 font-semibold">Relation</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parents.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.firstName} {p.lastName}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-emerald-900">{p.phoneNumber || "+251 91 123 4567"}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-600">{p.relationship || "GUARDIAN"}</td>
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
        </div>
    );
}
