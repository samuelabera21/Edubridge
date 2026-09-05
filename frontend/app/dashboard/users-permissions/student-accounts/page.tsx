"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    GraduationCap, 
    Sparkles, 
    Search, 
    UserCheck, 
    IdCard
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StudentAccountsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/student");
            if (res.ok) {
                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            } else {
                setStudents([]);
            }
        } catch (err: any) {
            console.error(err);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, []);

    if (loading) return <LoadingState message="Loading student body portal accounts from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 15.5: Student Body Portal User Accounts
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Student Registrar.
                        <br />
                        <strong>Data Source:</strong> Database table `student` queried via REST API (`/api/student`).
                        <br />
                        <strong>SRS Purpose:</strong> Student ID login credentials, portal access status, and profile verification.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <GraduationCap className="w-7 h-7 text-blue-600" />
                        <span>5. Student Body User Accounts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Student portal login IDs, enrollment status, and access credentials.</p>
                </div>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <IdCard className="w-5 h-5 mr-2 text-blue-600" />
                        Registered Student Logins
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {students.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <GraduationCap className="w-12 h-12 mx-auto text-blue-300 mb-2" />
                            <p className="font-semibold text-gray-800">No student accounts found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Student logins will display automatically when student enrollments occur.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Student ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Gender</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{s.firstName} {s.lastName}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-blue-900">{s.studentId}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-600">{s.gender || "MALE"}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    ENROLLED
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
