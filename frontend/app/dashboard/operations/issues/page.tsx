"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { AlertOctagon, Plus, Search, CheckCircle2, AlertTriangle, Clock, ShieldAlert, X, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface Issue {
    id: string;
    title: string;
    description: string;
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    createdAt: string;
    reportedBy?: { id: string; name: string } | null;
    resourceId?: string | null;
}

interface Resource {
    id: string;
    name: string;
}

export default function IssuesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [issues, setIssues] = useState<Issue[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "MEDIUM",
        resourceId: ""
    });

    const hasCreatePermission = authData?.access.some(acc =>
        acc.role.permissions.some((p: any) => ["ADMIN", "SCHOOL_ADMIN", "ISSUE:CREATE", "OPERATIONAL:CREATE"].includes(p.permission.name))
    );

    const loadData = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            const [issuesRes, resourcesRes] = await Promise.all([
                fetchApi("/operational/issue"),
                fetchApi("/operational/resource")
            ]);

            const issuesData = await issuesRes.json();
            const resourcesData = await resourcesRes.json();

            setIssues(Array.isArray(issuesData) ? issuesData : []);
            setResources(Array.isArray(resourcesData) ? resourcesData : []);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load facility issues.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = () => {
        setErrorMsg(null);
        setFormData({
            title: "",
            description: "",
            priority: "MEDIUM",
            resourceId: ""
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) {
            setErrorMsg("Issue title and description are required.");
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                priority: formData.priority,
                resourceId: formData.resourceId || undefined,
                reportedById: authData?.user.id
            };

            const response = await fetchApi("/operational/issue", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to report issue.");
            }

            setSuccessMsg(`Issue "${formData.title}" reported successfully.`);
            setIsModalOpen(false);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to submit issue.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (issueId: string, newStatus: string) => {
        try {
            setErrorMsg(null);
            const response = await fetchApi(`/operational/issue/${issueId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to update status.");
            }

            setSuccessMsg(`Issue status updated to ${newStatus}.`);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update status.");
        }
    };

    // Filters
    const filteredIssues = issues.filter(item => {
        const matchesStatus = selectedStatus === "ALL" || item.status === selectedStatus;
        const matchesSearch = searchQuery.trim() === "" ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Metrics
    const totalCount = issues.length;
    const openCount = issues.filter(i => i.status === "OPEN").length;
    const inProgressCount = issues.filter(i => i.status === "IN_PROGRESS").length;
    const resolvedCount = issues.filter(i => i.status === "RESOLVED" || i.status === "CLOSED").length;

    if (loading) return <LoadingState message="Loading facility issue tracker..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <AlertOctagon className="w-7 h-7 text-[#006b3f]" />
                        <span>Facility Infrastructure & Problem Tracker</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Report, assign, and track physical breakdown and maintenance requests.</p>
                </div>
                {hasCreatePermission && (
                    <Button onClick={handleOpenModal} leftIcon={<Plus className="w-4 h-4" />}>
                        Report Problem / Issue
                    </Button>
                )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-red-50/60 border-red-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Open Issues</p>
                            <p className="text-xl font-bold text-gray-900">{openCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">In Progress</p>
                            <p className="text-xl font-bold text-gray-900">{inProgressCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Resolved</p>
                            <p className="text-xl font-bold text-gray-900">{resolvedCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-gray-200 text-gray-700 rounded-lg">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Logged</p>
                            <p className="text-xl font-bold text-gray-900">{totalCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notification messages */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span>{errorMsg}</span></span>
                    <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Filter Tabs & Search */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
                        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(st => (
                            <button
                                key={st}
                                onClick={() => setSelectedStatus(st)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedStatus === st
                                        ? "bg-[#006b3f] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {st.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search issues..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredIssues.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-700">No issues matching criteria</p>
                            <p className="text-xs text-gray-400 mt-1">Infrastructure problem reports will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Title & Description</th>
                                        <th className="px-6 py-3.5 font-semibold">Priority</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-6 py-3.5 font-semibold">Reported By</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Update Workflow</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredIssues.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.priority === "CRITICAL" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                                        CRITICAL
                                                    </span>
                                                ) : item.priority === "HIGH" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                                        HIGH
                                                    </span>
                                                ) : item.priority === "MEDIUM" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                        MEDIUM
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        LOW
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.status === "OPEN" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                                        OPEN
                                                    </span>
                                                ) : item.status === "IN_PROGRESS" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                        IN PROGRESS
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                                        {item.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600">
                                                {item.reportedBy?.name || "School Personnel"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                                    className="text-xs border border-gray-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-[#006b3f]"
                                                >
                                                    <option value="OPEN">Set OPEN</option>
                                                    <option value="IN_PROGRESS">Set IN PROGRESS</option>
                                                    <option value="RESOLVED">Set RESOLVED</option>
                                                    <option value="CLOSED">Set CLOSED</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Problem Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Report Infrastructure Issue</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Issue Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Science Lab Water Pump Leaking"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority *</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="CRITICAL">CRITICAL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Affected Facility</label>
                                    <select
                                        value={formData.resourceId}
                                        onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="">General Facility</option>
                                        {resources.map(res => (
                                            <option key={res.id} value={res.id}>{res.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Problem Description *</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the breakdown, severity, and immediate impact..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting}>
                                    Submit Issue Report
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
