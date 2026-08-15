"use client";

import { useState } from "react";
import { Bell, Filter, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotificationsPage() {
    const [notifications] = useState<any[]>([]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <Bell className="w-6 h-6 mr-2 text-[#006b3f]" />
                        System Notifications
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Review your automated system alerts and personal notifications.</p>
                </div>
                <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">Mark All as Read</Button>
                </div>
            </div>

            {notifications.length === 0 ? (
                <EmptyState 
                    title="You're all caught up!" 
                    message="There are no new notifications to display at this time." 
                />
            ) : (
                <Card>
                    <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between py-4">
                        <CardTitle>Recent Alerts</CardTitle>
                        <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <tbody className="divide-y divide-gray-100">
                                    {notifications.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {item.message}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-right flex justify-end items-center">
                                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                {item.createdAt}
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
