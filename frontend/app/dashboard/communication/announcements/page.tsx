"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Megaphone, 
    Plus, 
    Calendar, 
    User, 
    Trash2, 
    Filter, 
    Clock,
    X,
    Users,
    Bell
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

type AnnouncementTarget = "ALL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "SPECIFIC_GRADE" | "SPECIFIC_SECTION";

export default function AnnouncementsPage() {
    const { authData } = useAuth();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [filterTarget, setFilterTarget] = useState<string>("ALL_TAB");

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [form, setForm] = useState({
        title: "",
        content: "",
        target: "ALL" as AnnouncementTarget,
        expiresAt: ""
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Announcements
    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/announcement");
            if (!res.ok) throw new Error("Failed to load announcements");
            const data = await res.json();
            setAnnouncements(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    // Filtered Announcements
    const filteredAnnouncements = useMemo(() => {
        if (filterTarget === "ALL_TAB") return announcements;
        return announcements.filter(a => a.target === filterTarget);
    }, [announcements, filterTarget]);

    // Handle Publish Announcement
    const handlePublishAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.content) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/communication/announcement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error("Failed to publish announcement");

            setIsCreateModalOpen(false);
            setForm({ title: "", content: "", target: "ALL", expiresAt: "" });
            loadAnnouncements();
        } catch (err: any) {
            alert(err.message || "Failed to publish announcement");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Delete Announcement
    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;

        try {
            const res = await fetchApi(`/communication/announcement/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Failed to delete announcement");

            loadAnnouncements();
        } catch (err: any) {
            alert(err.message || "Failed to delete announcement");
        }
    };

    // Target Badge Styles
    const getTargetBadge = (target: AnnouncementTarget) => {
        switch (target) {
            case "ALL":
                return <span className="bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded text-xs">School-Wide (All)</span>;
            case "TEACHERS":
                return <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded text-xs">Teachers Only</span>;
            case "PARENTS":
                return <span className="bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded text-xs">Parents Only</span>;
            case "STUDENTS":
                return <span className="bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded text-xs">Students Only</span>;
            default:
                return <span className="bg-gray-50 text-gray-700 font-semibold px-2.5 py-0.5 rounded text-xs">{target}</span>;
        }
    };

    if (loading) return <LoadingState message="Loading school announcements..." />;
    if (error) return <ErrorState message={error} onRetry={loadAnnouncements} />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Megaphone className="w-7 h-7 mr-2 text-[#006b3f]" />
                        School Broadcasts & Announcements
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Broadcast important updates to students, parents, teachers, and school staff
                    </p>
                </div>

                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="bg-[#006b3f] hover:bg-[#005432]"
                >
                    Publish Announcement
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Broadcasts</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{announcements.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-[#006b3f]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-700 font-semibold uppercase">School-Wide</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">
                                {announcements.filter(a => a.target === "ALL").length}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/50 border-purple-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-purple-700 font-semibold uppercase">Targeted Group</p>
                            <p className="text-2xl font-bold text-purple-900 mt-1">
                                {announcements.filter(a => a.target !== "ALL").length}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-purple-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
                {[
                    { id: "ALL_TAB", label: "All Broadcasts" },
                    { id: "ALL", label: "School-Wide" },
                    { id: "TEACHERS", label: "Teachers Only" },
                    { id: "PARENTS", label: "Parents Only" },
                    { id: "STUDENTS", label: "Students Only" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterTarget(tab.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                            filterTarget === tab.id
                                ? "bg-[#006b3f] text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Announcements List */}
            {filteredAnnouncements.length === 0 ? (
                <EmptyState 
                    title="No Announcements Found" 
                    message="There are no broadcasts published for this audience category. Click 'Publish Announcement' to create one!" 
                />
            ) : (
                <div className="space-y-4">
                    {filteredAnnouncements.map((item) => (
                        <Card key={item.id} className="border-gray-200 shadow-sm hover:shadow-md transition">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                                        {getTargetBadge(item.target)}
                                    </div>

                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span className="flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                        {item.expiresAt && (
                                            <span className="flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                                                <Clock className="w-3.5 h-3.5 mr-1" />
                                                Expires: {new Date(item.expiresAt).toLocaleDateString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteAnnouncement(item.id)}
                                            className="text-rose-500 hover:text-rose-700 transition"
                                            title="Delete announcement"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {item.content}
                                </p>

                                {item.author && (
                                    <div className="pt-2 border-t border-gray-100 flex items-center text-xs text-gray-500">
                                        <User className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                        Posted by: <strong className="text-gray-800 ml-1">{item.author.name || item.author.email}</strong>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Publish Announcement Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={handlePublishAnnouncement} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                Publish New Announcement
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Target Audience
                            </label>
                            <select
                                value={form.target}
                                onChange={(e) => setForm(prev => ({ ...prev, target: e.target.value as AnnouncementTarget }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                            >
                                <option value="ALL">School-Wide (Everyone)</option>
                                <option value="TEACHERS">Teachers Only</option>
                                <option value="PARENTS">Parents Only</option>
                                <option value="STUDENTS">Students Only</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Announcement Title
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. First Term Examination Schedule & Guidelines"
                                value={form.title}
                                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Content / Announcement Details
                            </label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Write the announcement message details here..."
                                value={form.content}
                                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Expiration Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={form.expiresAt}
                                onChange={(e) => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                Publish Announcement
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
