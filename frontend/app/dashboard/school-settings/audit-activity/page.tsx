"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    FileText, 
    Sparkles, 
    ShieldCheck, 
    Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AuditActivityPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/school-settings/audit-logs");
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(Array.isArray(data) ? data : []);
            } else {
                setAuditLogs([]);
            }
        } catch (err: any) {
            console.error(err);
            setAuditLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, []);

    if (loading) return <LoadingState message="Loading administrative audit activity log from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 16.5: Administrative System Audit Trail
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal & Security Systems Auditor.
                        <br />
                        <strong>Data Source:</strong> Database table `audit_log` queried via REST API (`/api/school-settings/audit-logs`).
                        <br />
                        <strong>SRS Purpose:</strong> Immutable log of administrative actions, data mutation events, timestamps, and IP addresses.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <FileText className="w-7 h-7 text-[#006b3f]" />
                        <span>5. Audit Activity Log</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Master audit trail tracking user modifications, settings changes, and security events.</p>
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-[#006b3f]" />
                        System Event Log
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {auditLogs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FileText className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No audit activity logged yet</p>
                            <p className="text-xs text-gray-400 mt-1">Audit entries will automatically populate as administrative changes occur.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Action</th>
                                        <th className="px-6 py-3.5 font-semibold">Entity Type</th>
                                        <th className="px-6 py-3.5 font-semibold">Details</th>
                                        <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-xs text-[#006b3f]">{log.action}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-700">{log.entityType}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600 max-w-xs">{log.details || "N/A"}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
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
