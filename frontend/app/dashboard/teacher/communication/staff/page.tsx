"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { MessageSquare, ArrowLeft, Bell } from "lucide-react";

export default function StaffCommunicationPage() {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Teacher & Staff Communication</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        Department notices, faculty announcements, and staff collaboration updates.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <span>Faculty & Staff Announcements</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                        <div className="flex justify-between font-bold text-blue-900">
                            <span>Department Head Notice</span>
                            <span className="text-[10px] text-blue-600">Today</span>
                        </div>
                        <p className="text-blue-800">Quarterly grade entry submissions deadline is scheduled for Friday at 5:00 PM.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                        <div className="flex justify-between font-bold text-gray-900">
                            <span>Academic Committee</span>
                            <span className="text-[10px] text-gray-400">Yesterday</span>
                        </div>
                        <p className="text-gray-600">All teachers please verify student attendance logs before closing weekly records.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
