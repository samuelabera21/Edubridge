"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Briefcase, 
    Sparkles, 
    UserCheck, 
    ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StaffAccountsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState<any[]>([]);

    const loadStaff = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/support-staff");
            if (res.ok) {
                const data = await res.json();
                setStaff(Array.isArray(data) ? data : []);
            } else {
                setStaff([]);
            }
        } catch (err: any) {
            console.error(err);
            setStaff([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStaff();
    }, []);

    if (loading) return <LoadingState message="Loading support staff accounts from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 15.7: Administrative & Support Staff Accounts
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Uses This:</strong> School Principal & HR Officer.
                        <br />
                        <strong>Data Source:</strong> Database table `support_staff` queried via REST API (`/api/support-staff`).
                        <br />
                        <strong>SRS Purpose:</strong> Non-academic staff credentials, administrative role assignments, and campus scope.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Briefcase className="w-7 h-7 text-amber-600" />
                        <span>7. Support & Administrative Staff Accounts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Non-teaching staff portal credentials, administrative roles, and employment status.</p>
                </div>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2 text-amber-600" />
                        Staff Accounts Registry
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {staff.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Briefcase className="w-12 h-12 mx-auto text-amber-300 mb-2" />
                            <p className="font-semibold text-gray-800">No support staff accounts found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Staff accounts will display automatically when support staff are registered.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Staff Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Job Title / Role</th>
                                        <th className="px-6 py-3.5 font-semibold">Employee ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {staff.map((st) => (
                                        <tr key={st.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{st.firstName} {st.lastName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-700">{st.jobTitle || "Administrative Staff"}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-amber-900">{st.employeeId || "STF-001"}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {st.status || "ACTIVE"}
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
