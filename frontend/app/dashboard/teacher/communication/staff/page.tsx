"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { MessageSquare, ArrowLeft, Bell } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

interface Announcement {
    id: string;
    title: string;
    content: string;
    target: string;
    createdAt: string;
    author?: { name: string };
}

export default function StaffCommunicationPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi("/communication/announcements?target=TEACHERS")
            .then(res => res.ok ? res.json() : [])
            .then(data => setAnnouncements(Array.isArray(data) ? data.slice(0, 10) : []))
            .catch(() => setAnnouncements([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingState message="Loading staff announcements..." />;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Teacher & Staff Communication</h1>
                <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Faculty announcements and school-wide notices from administration.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <span>Faculty & Staff Announcements</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                    {announcements.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No teacher-directed announcements found.</p>
                    ) : (
                        announcements.map(a => (
                            <div key={a.id} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                                <div className="flex justify-between font-bold text-blue-900">
                                    <span>{a.title}</span>
                                    <span className="text-[10px] text-blue-600">{new Date(a.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-blue-800 leading-relaxed">{a.content}</p>
                                <p className="text-[10px] text-blue-500">Posted by {a.author?.name || "Administration"}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-center">
                <Link
                    href="/dashboard/communication/messages"
                    className="flex items-center gap-2 text-sm text-[#006b3f] hover:underline font-medium"
                >
                    <MessageSquare className="w-4 h-4" />
                    Go to full Messages inbox
                </Link>
            </div>
        </div>
    );
}
