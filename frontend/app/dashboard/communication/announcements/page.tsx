"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Megaphone, Plus, Filter, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AnnouncementsPage() {
    const { authData } = useAuth();
    // Assuming backend might not be fully fleshed out for this domain yet
    const [announcements] = useState<any[]>([]);

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "COMMUNICATION:MANAGE" || p.permission.name === "ADMIN")
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <Megaphone className="w-6 h-6 mr-2 text-blue-500" />
                        Announcements
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Broadcast important news and updates to students, parents, and staff.</p>
                </div>
                {hasCreatePermission && (
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        New Announcement
                    </Button>
                )}
            </div>

            {announcements.length === 0 ? (
                <EmptyState 
                    title="No Announcements" 
                    message="There are no active announcements broadcasted at this time." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Recent Broadcasts</CardTitle>
                        <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Title</th>
                                        <th className="px-6 py-3 font-semibold">Audience</th>
                                        <th className="px-6 py-3 font-semibold">Date Posted</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {announcements.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {item.title}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {item.audience}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 flex items-center">
                                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                {item.createdAt}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="sm">View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
