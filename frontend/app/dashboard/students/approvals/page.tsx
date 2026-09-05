"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { CheckSquare, ShieldCheck, Clock, FileText, Check, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";

export default function StudentApprovalsPage() {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadApprovals = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/student/approvals/queue");
            if (res.ok) {
                const data = await res.json();
                setApprovals(data);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApprovals();
    }, []);

    if (loading) return <LoadingState message="Loading Principal student record correction approval queue..." />;

    return (
        <div className="space-y-6 text-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#006b3f]">
                        <CheckSquare className="w-5 h-5" />
                        <h1 className="text-xl font-bold tracking-tight text-gray-900">5. Record Corrections & Principal Approvals</h1>
                    </div>
                    <p className="text-xs text-gray-500">
                        Review and grant official authorization for student name updates, date of birth corrections, gradebook overrides, and transcript revisions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Pending Queue</span>
                        <h3 className="text-2xl font-black text-amber-950">{approvals.length}</h3>
                        <p className="text-xs text-amber-800">Awaiting Principal authorization</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Approved This Month</span>
                        <h3 className="text-2xl font-black text-emerald-950">14</h3>
                        <p className="text-xs text-emerald-800">Official record changes signed</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Security Compliance</span>
                        <h3 className="text-2xl font-black text-blue-950">100%</h3>
                        <p className="text-xs text-gray-500">Cryptographic audit log signed</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="py-3 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2 text-[#006b3f]" />
                        Official Approval Request Queue
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {approvals.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs">
                            No pending student record correction requests. All student records are currently verified and locked.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 text-xs">
                            {approvals.map((item: any) => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-900">Action: {item.action}</p>
                                        <p className="text-gray-500">Resource: {item.resource} ({item.resourceId || "N/A"})</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button className="bg-[#006b3f] hover:bg-[#005230] text-white text-[11px] px-3 py-1 flex items-center space-x-1">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Approve</span>
                                        </Button>
                                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-[11px] px-3 py-1 flex items-center space-x-1">
                                            <X className="w-3.5 h-3.5" />
                                            <span>Reject</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
