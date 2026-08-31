"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { Package, Plus, Search, Trash2, Edit3, X, Wrench, CheckCircle2, AlertTriangle, Building, BookOpen, Laptop, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface Resource {
    id: string;
    name: string;
    type: "CLASSROOM" | "LABORATORY" | "LIBRARY" | "SPORTS_FACILITY" | "EQUIPMENT" | "OTHER";
    capacity?: number | null;
    status: string;
    description?: string | null;
    createdAt?: string;
}

export default function ResourcesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [resources, setResources] = useState<Resource[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "CLASSROOM",
        capacity: "",
        status: "AVAILABLE",
        description: ""
    });

    const hasCreatePermission = authData?.access.some(acc =>
        acc.role.permissions.some((p: any) => ["ADMIN", "SCHOOL_ADMIN", "OPERATIONAL:CREATE"].includes(p.permission.name))
    );

    const loadResources = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const response = await fetchApi("/operational/resource");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load resources");
            }
            setResources(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to fetch school resources.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadResources();
    }, []);

    const handleOpenModal = (resource?: Resource) => {
        setErrorMsg(null);
        if (resource) {
            setEditingId(resource.id);
            setFormData({
                name: resource.name,
                type: resource.type,
                capacity: resource.capacity ? String(resource.capacity) : "",
                status: resource.status || "AVAILABLE",
                description: resource.description || ""
            });
        } else {
            setEditingId(null);
            setFormData({
                name: "",
                type: "CLASSROOM",
                capacity: "",
                status: "AVAILABLE",
                description: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setErrorMsg("Resource name is required.");
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);
            const payload = {
                name: formData.name.trim(),
                type: formData.type,
                capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
                status: formData.status,
                description: formData.description.trim() || undefined
            };

            let response;
            if (editingId) {
                response = await fetchApi(`/operational/resource/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetchApi("/operational/resource", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to save resource.");
            }

            setSuccessMsg(`Resource "${formData.name}" ${editingId ? "updated" : "created"} successfully.`);
            setIsModalOpen(false);
            loadResources();
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while saving the resource.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            setErrorMsg(null);
            const response = await fetchApi(`/operational/resource/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete resource.");
            }

            setSuccessMsg(`Resource "${name}" removed from inventory.`);
            loadResources();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to delete resource.");
        }
    };

    // Filter Logic
    const filteredResources = resources.filter(res => {
        const matchesCategory = selectedCategory === "ALL" || res.type === selectedCategory;
        const matchesSearch = searchQuery.trim() === "" ||
            res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // Metrics
    const totalCount = resources.length;
    const classroomsCount = resources.filter(r => r.type === "CLASSROOM").length;
    const labsCount = resources.filter(r => r.type === "LABORATORY").length;
    const availableCount = resources.filter(r => r.status === "AVAILABLE" || r.status === "OPERATIONAL").length;
    const maintenanceCount = resources.filter(r => r.status === "UNDER_MAINTENANCE" || r.status === "DAMAGED").length;

    if (loading) return <LoadingState message="Loading resource & inventory directory..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Package className="w-7 h-7 text-[#006b3f]" />
                        <span>Resource & Facility Directory</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage classrooms, labs, libraries, equipment, and school physical infrastructure.</p>
                </div>
                {hasCreatePermission && (
                    <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
                        Add Resource
                    </Button>
                )}
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <Building className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Facilities</p>
                            <p className="text-xl font-bold text-gray-900">{totalCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Classrooms</p>
                            <p className="text-xl font-bold text-gray-900">{classroomsCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Science/IT Labs</p>
                            <p className="text-xl font-bold text-gray-900">{labsCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Operational / Maint.</p>
                            <p className="text-xl font-bold text-gray-900">{availableCount} / <span className="text-amber-700">{maintenanceCount}</span></p>
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
                        {["ALL", "CLASSROOM", "LABORATORY", "LIBRARY", "SPORTS_FACILITY", "EQUIPMENT", "OTHER"].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedCategory === cat
                                        ? "bg-[#006b3f] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {cat.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredResources.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p className="font-semibold text-gray-700">No resources found</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your category filter or search term.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Resource Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Capacity / Quantity</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredResources.map((res) => (
                                        <tr key={res.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{res.name}</p>
                                                {res.description && <p className="text-xs text-gray-500">{res.description}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                    {res.type.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-700">
                                                {res.capacity ? `${res.capacity} Seats / Units` : "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                {res.status === "AVAILABLE" || res.status === "OPERATIONAL" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        Available
                                                    </span>
                                                ) : res.status === "UNDER_MAINTENANCE" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        Maintenance
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                        {res.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {hasCreatePermission && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenModal(res)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                            title="Edit Resource"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(res.id, res.name)}
                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Delete Resource"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit Resource Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingId ? "Edit Resource" : "Provision New Resource"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Resource Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Physics Lab 01, Computer Lab A"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="CLASSROOM">Classroom</option>
                                        <option value="LABORATORY">Laboratory</option>
                                        <option value="LIBRARY">Library</option>
                                        <option value="SPORTS_FACILITY">Sports Facility</option>
                                        <option value="EQUIPMENT">Equipment / Desks</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Capacity / Seats</label>
                                    <input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                        placeholder="e.g. 45"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="AVAILABLE">Available / Operational</option>
                                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                                    <option value="DAMAGED">Damaged / Requires Repair</option>
                                    <option value="IN_USE">Currently In Use</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Specific location or equipment inventory details..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting}>
                                    {editingId ? "Save Changes" : "Create Resource"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
