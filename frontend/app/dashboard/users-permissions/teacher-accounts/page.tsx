"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    BookOpen, 
    Sparkles, 
    Search, 
    UserCheck, 
    Mail, 
    ShieldCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TeacherAccountsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState<any[]>([]);

    const loadTeachers = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/teacher");
            if (res.ok) {
                const data = await res.json();
                setTeachers(Array.isArray(data) ? data : []);
            } else {
                setTeachers([]);
            }
        } catch (err: any) {
            console.error(err);
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTeachers();
    }, []);

    if (loading) return <LoadingState message="Loading teaching faculty user credentials from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 15.4: Teaching Faculty User Credentials
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal, Academic Vice-Principal & HR Officer.
                        <br />
                        <strong>Data Source:</strong> Database table `teacher` queried via REST API (`/api/teacher`).
                        <br />
                        <strong>SRS Purpose:</strong> Faculty user account status, employee ID logins, and portal access permissions.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BookOpen className="w-7 h-7 text-purple-600" />
                        <span>4. Teacher & Faculty Accounts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Teaching staff portal credentials, employee IDs, and email accounts.</p>
                </div>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2 text-purple-600" />
                        Faculty Accounts Registry
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {teachers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto text-purple-300 mb-2" />
                            <p className="font-semibold text-gray-800">No teacher accounts found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Faculty accounts will display automatically when teachers are registered.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Teacher Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Employee ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Qualification</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teachers.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{t.firstName} {t.lastName}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-purple-900">{t.employeeId || "TCH-001"}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600">{t.qualification || "B.Sc. Education"}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {t.status || "ACTIVE"}
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
