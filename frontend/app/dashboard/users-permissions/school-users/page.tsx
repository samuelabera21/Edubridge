"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    Sparkles, 
    Search, 
    ShieldCheck, 
    Lock, 
    UserCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SchoolUsersPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } else {
                setUsers([]);
            }
        } catch (err: any) {
            console.error(err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    if (loading) return <LoadingState message="Loading institutional user directory from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 15.1: Master School-Wide User Directory
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal & System Administrator.
                        <br />
                        <strong>Data Source:</strong> Database table `user` queried via REST API (`/api/communication/users`).
                        <br />
                        <strong>SRS Purpose:</strong> Centralized user account directory, active session monitoring, and credential management.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Users className="w-7 h-7 text-[#006b3f]" />
                        <span>1. School Users Directory</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Master registry of active institutional accounts, email credentials, and status.</p>
                </div>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Active Institutional Accounts
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No registered school users found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Users will display automatically when teacher, student, or parent accounts are provisioned.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">User Full Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Email / Credential</th>
                                        <th className="px-6 py-3.5 font-semibold">Account Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{u.name || "School User"}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-600">{u.email}</td>
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
