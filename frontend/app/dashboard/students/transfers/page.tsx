"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { ArrowRightLeft, ShieldCheck, Clock, Building, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";

export default function StudentTransfersPage() {
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTransfers = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/student/transfers/history");
            if (res.ok) {
                const data = await res.json();
                setTransfers(data);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransfers();
    }, []);

    if (loading) return <LoadingState message="Loading student transfer clearance records..." />;

    return (
        <div className="space-y-6 text-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#006b3f]">
                        <ArrowRightLeft className="w-5 h-5" />
                        <h1 className="text-xl font-bold tracking-tight text-gray-900">3. Student Transfers & Clearance</h1>
                    </div>
                    <p className="text-xs text-gray-500">
                        Manage student transfer clearance certificates, mid-year section relocations, and external school transfers.
                    </p>
                </div>

                <Button className="bg-[#006b3f] hover:bg-[#005230] text-white text-xs flex items-center space-x-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Initiate Student Transfer</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Transfers Registered</span>
                        <h3 className="text-2xl font-black text-gray-900">{transfers.length}</h3>
                        <p className="text-xs text-gray-500">Transferred in / out of school</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Clearances Approved</span>
                        <h3 className="text-2xl font-black text-emerald-950">{transfers.length}</h3>
                        <p className="text-xs text-emerald-800">100% Verified documentation</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Average Clearance Time</span>
                        <h3 className="text-2xl font-black text-purple-950">24 Hours</h3>
                        <p className="text-xs text-gray-500">Fast administrative approval</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="py-3 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2 text-[#006b3f]" />
                        Official Student Transfer Audit Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {transfers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs">
                            No student transfer clearance requests recorded yet. All enrolled students are actively in their original sections.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 text-xs">
                            {transfers.map((item: any) => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-900">
                                            {item.enrollment?.student?.firstName} {item.enrollment?.student?.lastName}
                                        </p>
                                        <p className="text-gray-500">
                                            Grade: {item.enrollment?.schoolGrade?.grade?.name} | Section: {item.enrollment?.section?.name}
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold">
                                        {item.reason || "OFFICIAL_TRANSFER"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
