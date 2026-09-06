"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Bell, 
    Plus, 
    Search, 
    Sparkles, 
    Send, 
    Smartphone, 
    Mail, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentNotificationsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        message: "",
        channel: "SMS"
    });

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/parent/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(Array.isArray(data) ? data : []);
            } else {
                setNotifications([]);
            }
        } catch (err: any) {
            console.error(err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/notifications", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ title: "", message: "", channel: "SMS" });
                loadNotifications();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading parent notification log from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 10.5: Automated Parent Broadcasts & SMS Alerts
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Communication Officers.
                        <br />
                        <strong>Data Source:</strong> Database table `parent_notification` queried via REST API (`/api/parent/notifications`).
                        <br />
                        <strong>SRS Purpose:</strong> Sends urgent SMS, email, and in-app alerts regarding student absences, fee reminders, and report card releases.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Bell className="w-7 h-7 text-purple-600" />
                        <span>5. Parent Notifications & SMS Alerts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Broadcast SMS and portal alerts to all registered parents.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Send className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Broadcast Alert to Parents
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Smartphone className="w-5 h-5 mr-2 text-purple-600" />
                        Broadcast Notification Log
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {notifications.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto text-purple-300 mb-2" />
                            <p className="font-semibold text-gray-800">No parent notifications broadcast yet</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Broadcast Alert to Parents" above to dispatch SMS & portal announcements.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Title / Subject</th>
                                        <th className="px-6 py-3.5 font-semibold">Channel</th>
                                        <th className="px-6 py-3.5 font-semibold">Message Preview</th>
                                        <th className="px-6 py-3.5 font-semibold">Sent Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {notifications.map((n) => (
                                        <tr key={n.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{n.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                    {n.channel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">{n.message}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Just Now"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {n.status}
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Broadcast Alert to Parents</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSendNotification} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notification Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Q1 Report Card Release & PTA Meeting Notice"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Delivery Channel</label>
                                <select
                                    value={form.channel}
                                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="SMS">SMS Text Message</option>
                                    <option value="PORTAL">In-App Parent Portal Alert</option>
                                    <option value="EMAIL">Email Broadcast</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Message Content *</label>
                                <textarea
                                    required
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    placeholder="e.g. Dear Parents, Q1 report cards are now available. PTA meeting will be held on Saturday."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Broadcast Now</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
