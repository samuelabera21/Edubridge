"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Plus, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ImprovementsPage() {
    const { authData } = useAuth();
    const [plans] = useState<any[]>([]);

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "ADMIN")
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
                        Improvement Plans
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Strategic initiatives, QA feedback, and school improvement tracking.</p>
                </div>
                {hasCreatePermission && (
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        New Plan
                    </Button>
                )}
            </div>

            {plans.length === 0 ? (
                <EmptyState 
                    title="No Active Plans" 
                    message="There are no active school improvement plans." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Strategic Initiatives</CardTitle>
                        <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Initiative</th>
                                        <th className="px-6 py-3 font-semibold">Progress</th>
                                        <th className="px-6 py-3 font-semibold">Timeline</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
