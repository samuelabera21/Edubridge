"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    GraduationCap, 
    Plus, 
    Search, 
    Sparkles, 
    User, 
    Calendar, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StudentCommunicationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        content: "",
        target: "STUDENTS"
    });

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/announcements?target=STUDENTS");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
            }
        } catch (err: any) {
            console.error(err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/communication/announcements", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ title: "", content: "", target: "STUDENTS" });
                loadAnnouncements();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading student body notices & announcements..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 11.3: Student Body Announcements & Notices
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Student Council Advisors.
                        <br />
                        <strong>Data Source:</strong> Database table `announcement` filtered by `target=STUDENTS` via REST API.
                        <br />
                        <strong>SRS Purpose:</strong> Exam venue rules, student council announcements, sports club trials, and library policy updates.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <GraduationCap className="w-7 h-7 text-blue-600" />
                        <span>3. Student Communication & Bulletins</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Student newsfeed, exam schedules, and extracurricular announcements.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Post Student Notice
                </Button>
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <Card className="shadow-sm">
                        <CardContent className="p-12 text-center text-gray-500">
                            <GraduationCap className="w-12 h-12 mx-auto text-blue-300 mb-2" />
                            <p className="font-semibold text-gray-800">No student notices posted yet</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Post Student Notice" above to publish announcements to students.</p>
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map((item) => (
                        <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                            STUDENTS ONLY
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-gray-900">{item.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4 text-sm text-gray-700">
                                <p className="whitespace-pre-line leading-relaxed">{item.content}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Post Student Notice</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Mid-Term Examination Room Conduct Rules"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Details *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write details for students here..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Publish Notice</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
