"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchApi } from "../../lib/api";
import {
    ChevronRight,
    ChevronDown,
    Building2,
    Landmark,
    School,
    MapPin,
    Layers,
    ArrowUpRight,
    Search,
    RefreshCw,
    Network,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
    SlidersHorizontal,
    MoveRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type OrgType = "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

export interface HierarchyNode {
    id: string;
    name: string;
    type: OrgType;
    parentId: string | null;
    createdAt?: string;
    updatedAt?: string;
    children: HierarchyNode[];
}

const TIER_ICONS: Record<OrgType, any> = {
    FEDERAL: Landmark,
    REGION: Layers,
    ZONE: Building2,
    WOREDA: MapPin,
    SCHOOL: School,
};

const TIER_BADGES: Record<OrgType, { bg: string; text: string; border: string }> = {
    FEDERAL: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    REGION: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    ZONE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    WOREDA: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    SCHOOL: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

const NEXT_CHILD_TYPE: Record<OrgType, OrgType | null> = {
    FEDERAL: "REGION",
    REGION: "ZONE",
    ZONE: "WOREDA",
    WOREDA: "SCHOOL",
    SCHOOL: null,
};

const NEXT_CHILD_LABEL: Record<OrgType, string> = {
    FEDERAL: "Region",
    REGION: "Zone",
    ZONE: "Woreda",
    WOREDA: "School",
    SCHOOL: "",
};

function countDescendants(node: HierarchyNode): { total: number; schools: number } {
    let total = 0;
    let schools = 0;

    function traverse(n: HierarchyNode) {
        for (const child of n.children || []) {
            total += 1;
            if (child.type === "SCHOOL") schools += 1;
            traverse(child);
        }
    }

    traverse(node);
    return { total, schools };
}

function collectWoredas(nodes: HierarchyNode[]): Array<{ id: string; name: string; lineageStr: string }> {
    const woredas: Array<{ id: string; name: string; lineageStr: string }> = [];

    function traverse(node: HierarchyNode, path: string[]) {
        const currentPath = [...path, node.name];
        if (node.type === "WOREDA") {
            woredas.push({
                id: node.id,
                name: node.name,
                lineageStr: currentPath.slice(0, -1).join(" → ")
            });
        }
        for (const child of node.children || []) {
            traverse(child, currentPath);
        }
    }

    for (const root of nodes) {
        traverse(root, []);
    }
    return woredas;
}

export default function HierarchyTreeViewer({
    rootOrgId,
    userTier = "FEDERAL"
}: {
    rootOrgId?: string;
    userTier?: string;
}) {
    const router = useRouter();
    const [tree, setTree] = useState<HierarchyNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // School Placement Modal State
    const [placementModalOpen, setPlacementModalOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<HierarchyNode | null>(null);
    const [selectedTargetWoredaId, setSelectedTargetWoredaId] = useState("");
    const [placementSubmitting, setPlacementSubmitting] = useState(false);
    const [placementMessage, setPlacementMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Hierarchy Creation Modal State (FEDERAL -> REGION, REGION -> ZONE, ZONE -> WOREDA)
    const [createUnitModalOpen, setCreateUnitModalOpen] = useState(false);
    const [parentUnitForCreation, setParentUnitForCreation] = useState<HierarchyNode | null>(null);
    const [targetCreationType, setTargetCreationType] = useState<OrgType>("REGION");
    const [unitName, setUnitName] = useState("");
    const [unitSubmitting, setUnitSubmitting] = useState(false);
    const [unitMessage, setUnitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // School Registration Modal State (WOREDA -> SCHOOL)
    const [registerSchoolModalOpen, setRegisterSchoolModalOpen] = useState(false);
    const [targetWoredaForReg, setTargetWoredaForReg] = useState<HierarchyNode | null>(null);
    const [schoolName, setSchoolName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [establishedYear, setEstablishedYear] = useState<string>("");
    const [regSubmitting, setRegSubmitting] = useState(false);
    const [regMessage, setRegMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadTree = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = rootOrgId ? `/hierarchy/tree?rootId=${encodeURIComponent(rootOrgId)}` : `/hierarchy/tree`;
            const res = await fetchApi(url);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to load hierarchy tree");
            }
            const payload = await res.json();
            const data: HierarchyNode[] = payload.data || [];
            setTree(data);

            // Auto-expand top levels
            const autoExpand = new Set<string>();
            for (const root of data) {
                autoExpand.add(root.id);
                for (const child of root.children || []) {
                    autoExpand.add(child.id);
                    for (const sub of child.children || []) {
                        autoExpand.add(sub.id);
                    }
                }
            }
            setExpandedIds(autoExpand);
        } catch (err: any) {
            setError(err.message || "Failed to load organizational hierarchy");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTree();
    }, [rootOrgId]);

    const toggleNode = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allIds = new Set<string>();
        function traverse(n: HierarchyNode) {
            allIds.add(n.id);
            for (const child of n.children || []) {
                traverse(child);
            }
        }
        for (const root of tree) traverse(root);
        setExpandedIds(allIds);
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    const availableWoredas = useMemo(() => {
        return collectWoredas(tree);
    }, [tree]);

    // Open Placement modal
    const openPlacementModal = (school: HierarchyNode) => {
        setSelectedSchool(school);
        setSelectedTargetWoredaId(school.parentId || "");
        setPlacementMessage(null);
        setPlacementModalOpen(true);
    };

    // Open Unit Creation modal
    const openCreateUnitModal = (parent: HierarchyNode) => {
        const childType = NEXT_CHILD_TYPE[parent.type];
        if (!childType) return;
        if (childType === "SCHOOL") {
            openRegisterSchoolModal(parent);
            return;
        }
        setParentUnitForCreation(parent);
        setTargetCreationType(childType);
        setUnitName("");
        setUnitMessage(null);
        setCreateUnitModalOpen(true);
    };

    // Open School Registration modal
    const openRegisterSchoolModal = (woredaNode?: HierarchyNode) => {
        const defaultWoreda = woredaNode || (availableWoredas.length > 0 ? ({ id: availableWoredas[0].id, name: availableWoredas[0].name, type: "WOREDA" as OrgType, parentId: null, children: [] }) : null);
        setTargetWoredaForReg(defaultWoreda);
        setSchoolName("");
        setContactEmail("");
        setPhoneNumber("");
        setAddress("");
        setEstablishedYear("");
        setRegMessage(null);
        setRegisterSchoolModalOpen(true);
    };

    // Primary action helper for top-level button
    const handleTopActionClick = () => {
        if (userTier === "WOREDA" || (tree.length > 0 && tree[0].type === "WOREDA")) {
            openRegisterSchoolModal(tree[0]);
        } else if (tree.length > 0) {
            openCreateUnitModal(tree[0]);
        }
    };

    const handlePlacementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchool || !selectedTargetWoredaId) return;

        setPlacementSubmitting(true);
        setPlacementMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/schools/${encodeURIComponent(selectedSchool.id)}/placement`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ woredaId: selectedTargetWoredaId })
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Failed to assign school placement");
            }

            setPlacementMessage({
                type: "success",
                text: payload.message || "School placement updated successfully!"
            });

            await loadTree();

            setTimeout(() => {
                setPlacementModalOpen(false);
                setSelectedSchool(null);
            }, 1200);
        } catch (err: any) {
            setPlacementMessage({
                type: "error",
                text: err.message || "Could not complete school placement"
            });
        } finally {
            setPlacementSubmitting(false);
        }
    };

    const handleCreateUnitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentUnitForCreation || !unitName.trim()) return;

        setUnitSubmitting(true);
        setUnitMessage(null);
        try {
            const res = await fetchApi(`/hierarchy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: unitName.trim(),
                    type: targetCreationType,
                    parentId: parentUnitForCreation.id
                })
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || `Failed to create ${targetCreationType}`);
            }

            setUnitMessage({
                type: "success",
                text: `${targetCreationType} "${unitName.trim()}" created successfully!`
            });

            // Expand parent node so new child is visible
            setExpandedIds((prev) => new Set([...prev, parentUnitForCreation.id]));
            await loadTree();

            setTimeout(() => {
                setCreateUnitModalOpen(false);
                setParentUnitForCreation(null);
                setUnitName("");
            }, 1200);
        } catch (err: any) {
            setUnitMessage({
                type: "error",
                text: err.message || `Failed to create ${targetCreationType}`
            });
        } finally {
            setUnitSubmitting(false);
        }
    };

    const handleRegisterSchoolSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetWoredaForReg || !schoolName.trim()) return;

        setRegSubmitting(true);
        setRegMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/schools/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: schoolName.trim(),
                    woredaId: targetWoredaForReg.id,
                    contactEmail: contactEmail.trim() || undefined,
                    phoneNumber: phoneNumber.trim() || undefined,
                    address: address.trim() || undefined,
                    establishedYear: establishedYear ? parseInt(establishedYear, 10) : undefined
                })
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Failed to register school");
            }

            setRegMessage({
                type: "success",
                text: `School "${schoolName.trim()}" registered successfully under ${targetWoredaForReg.name}!`
            });

            // Expand woreda node
            setExpandedIds((prev) => new Set([...prev, targetWoredaForReg.id]));
            await loadTree();

            setTimeout(() => {
                setRegisterSchoolModalOpen(false);
                setSchoolName("");
                setContactEmail("");
                setPhoneNumber("");
                setAddress("");
                setEstablishedYear("");
            }, 1200);
        } catch (err: any) {
            setRegMessage({
                type: "error",
                text: err.message || "Failed to register school"
            });
        } finally {
            setRegSubmitting(false);
        }
    };

    const renderNode = (node: HierarchyNode, depth: number = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const Icon = TIER_ICONS[node.type] || Building2;
        const badge = TIER_BADGES[node.type] || TIER_BADGES.SCHOOL;
        const { schools: childSchoolCount } = countDescendants(node);
        const nextChild = NEXT_CHILD_TYPE[node.type];
        const nextChildLabel = NEXT_CHILD_LABEL[node.type];

        const isMatch = searchQuery
            ? node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              node.type.toLowerCase().includes(searchQuery.toLowerCase())
            : true;

        return (
            <div key={node.id} className="space-y-1">
                <div
                    className={`group flex items-center justify-between py-2.5 px-3 rounded-xl border transition-all ${
                        node.type === "SCHOOL"
                            ? "bg-white hover:bg-cyan-50/40 border-gray-200"
                            : depth === 0
                            ? "bg-indigo-50/30 border-indigo-100 font-semibold"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                    } ${!isMatch && searchQuery ? "opacity-40" : ""}`}
                    style={{ marginLeft: `${Math.min(depth * 20, 160)}px` }}
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {hasChildren ? (
                            <button
                                onClick={() => toggleNode(node.id)}
                                className="p-1 hover:bg-gray-200/60 rounded-md text-gray-500 transition-colors cursor-pointer shrink-0"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-700" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-700" />
                                )}
                            </button>
                        ) : (
                            <span className="w-6 shrink-0" />
                        )}

                        <div className={`p-1.5 rounded-lg border ${badge.bg} ${badge.border} ${badge.text} shrink-0`}>
                            <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-900 truncate">{node.name}</span>
                                <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badge.bg} ${badge.border} ${badge.text}`}
                                >
                                    {node.type}
                                </span>
                                {node.type !== "SCHOOL" && (
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        ({hasChildren ? node.children.length : 0} {node.type === "WOREDA" ? "Schools" : "Child Units"}
                                        {node.type !== "WOREDA" && childSchoolCount > 0 ? ` • ${childSchoolCount} Schools` : ""})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {node.type === "SCHOOL" ? (
                            <>
                                <Link
                                    href={`/dashboard?schoolId=${encodeURIComponent(node.id)}`}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                                    title="Open Canonical School Application"
                                >
                                    <span>Open School</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            </>
                        ) : (
                            <>
                                {nextChild && userTier === node.type && (
                                    <button
                                        onClick={() => openCreateUnitModal(node)}
                                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        title={node.type === "WOREDA" ? "Register School under this Woreda" : `Create ${nextChildLabel} under ${node.name}`}
                                    >
                                        <PlusCircle className="w-3 h-3" />
                                        <span>+ {nextChildLabel}</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        const tierRoute = node.type === "FEDERAL" ? "federal" : node.type.toLowerCase();
                                        router.push(`/dashboard/${tierRoute}?targetOrgId=${encodeURIComponent(node.id)}`);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Inspect Tier</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="space-y-1">
                        {node.children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-white rounded-2xl border border-gray-200">
                <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
                <p className="text-xs font-semibold text-gray-600">Loading organizational hierarchy structure...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>Hierarchy Unavailable</span>
                </div>
                <p className="text-xs text-rose-700">{error}</p>
                <button
                    onClick={loadTree}
                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    const topActionLabel =
        userTier === "FEDERAL"
            ? "+ Add Region"
            : userTier === "REGION"
            ? "+ Add Zone"
            : userTier === "ZONE"
            ? "+ Add Woreda"
            : userTier === "WOREDA"
            ? "+ Register School"
            : "+ Add Unit";

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Network className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-gray-900">National Administrative Hierarchy Tree</h2>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Canonical hierarchy mapping: <span className="font-semibold text-gray-700">Federal → Region → Zone → Woreda → School</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {tree.length > 0 && userTier !== "SCHOOL" && (
                            <button
                                onClick={handleTopActionClick}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{topActionLabel}</span>
                            </button>
                        )}
                        <button
                            onClick={expandAll}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            Expand All
                        </button>
                        <button
                            onClick={collapseAll}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            Collapse All
                        </button>
                        <button
                            onClick={loadTree}
                            className="p-2 border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            title="Refresh Hierarchy"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search organizations, regions, zones, woredas, or schools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Tree Container */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                {tree.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                        No organization units found in this scope.
                    </div>
                ) : (
                    tree.map((root) => renderNode(root, 0))
                )}
            </div>

            {/* Modal 1: Create Hierarchy Unit (REGION, ZONE, WOREDA) */}
            {createUnitModalOpen && parentUnitForCreation && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-bold text-gray-900">
                                    Create {targetCreationType}
                                </h3>
                            </div>
                            <button
                                onClick={() => setCreateUnitModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateUnitSubmit} className="space-y-4 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Parent Organization</p>
                                <p className="text-xs font-bold text-gray-900">{parentUnitForCreation.name} ({parentUnitForCreation.type})</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 block">
                                    {targetCreationType} Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={`e.g., ${targetCreationType === "REGION" ? "Sidama Region" : targetCreationType === "ZONE" ? "North Gondar Zone" : "Bole Woreda 03"}`}
                                    value={unitName}
                                    onChange={(e) => setUnitName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {unitMessage && (
                                <div
                                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                                        unitMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    {unitMessage.type === "success" ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                    )}
                                    <span>{unitMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setCreateUnitModalOpen(false)}
                                    disabled={unitSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={unitSubmitting || !unitName.trim()}
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {unitSubmitting ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="w-3.5 h-3.5" />
                                            <span>Create {targetCreationType}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Register School (WOREDA -> SCHOOL) */}
            {registerSchoolModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <School className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-bold text-gray-900">Register New School</h3>
                            </div>
                            <button
                                onClick={() => setRegisterSchoolModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRegisterSchoolSubmit} className="space-y-3.5 text-xs">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 block">
                                    Target Woreda <span className="text-rose-500">*</span>
                                </label>
                                {availableWoredas.length > 1 ? (
                                    <select
                                        value={targetWoredaForReg?.id || ""}
                                        onChange={(e) => {
                                            const found = availableWoredas.find((w) => w.id === e.target.value);
                                            if (found) {
                                                setTargetWoredaForReg({
                                                    id: found.id,
                                                    name: found.name,
                                                    type: "WOREDA",
                                                    parentId: null,
                                                    children: []
                                                });
                                            }
                                        }}
                                        required
                                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                    >
                                        {availableWoredas.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name} ({w.lineageStr})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 font-semibold">
                                        {targetWoredaForReg?.name || "Authorized Woreda"}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 block">
                                    School Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Kirkos Comprehensive High School"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700 block">Contact Email</label>
                                    <input
                                        type="email"
                                        placeholder="admin@school.edu.et"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700 block">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+251 911 000000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700 block">Physical Address</label>
                                    <input
                                        type="text"
                                        placeholder="Woreda 03, House 412"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700 block">Established Year</label>
                                    <input
                                        type="number"
                                        placeholder="2015"
                                        min="1900"
                                        max="2099"
                                        value={establishedYear}
                                        onChange={(e) => setEstablishedYear(e.target.value)}
                                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            {regMessage && (
                                <div
                                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                                        regMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    {regMessage.type === "success" ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                    )}
                                    <span>{regMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setRegisterSchoolModalOpen(false)}
                                    disabled={regSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={regSubmitting || !schoolName.trim() || !targetWoredaForReg}
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {regSubmitting ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Registering School...</span>
                                        </>
                                    ) : (
                                        <>
                                            <School className="w-3.5 h-3.5" />
                                            <span>Register School</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: School Placement / Reassignment Modal */}
            {placementModalOpen && selectedSchool && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <School className="w-5 h-5 text-blue-600" />
                                <h3 className="text-sm font-bold text-gray-900">School Placement & Reassignment</h3>
                            </div>
                            <button
                                onClick={() => setPlacementModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                                <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Target School</p>
                                <p className="text-sm font-bold text-gray-900">{selectedSchool.name}</p>
                                <p className="text-[11px] text-gray-600">ID: {selectedSchool.id}</p>
                            </div>

                            <form onSubmit={handlePlacementSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700 block">
                                        Select Destination Woreda <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={selectedTargetWoredaId}
                                        onChange={(e) => setSelectedTargetWoredaId(e.target.value)}
                                        required
                                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                                    >
                                        <option value="">-- Choose Authorized Woreda --</option>
                                        {availableWoredas.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name} ({w.lineageStr})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-500">
                                        Schools must be placed directly under an authorized Woreda in your administrative branch.
                                    </p>
                                </div>

                                {placementMessage && (
                                    <div
                                        className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                                            placementMessage.type === "success"
                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                : "bg-rose-50 text-rose-800 border-rose-200"
                                        }`}
                                    >
                                        {placementMessage.type === "success" ? (
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                        )}
                                        <span>{placementMessage.text}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setPlacementModalOpen(false)}
                                        disabled={placementSubmitting}
                                        className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={placementSubmitting || !selectedTargetWoredaId}
                                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        {placementSubmitting ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Updating Placement...</span>
                                            </>
                                        ) : (
                                            <>
                                                <MoveRight className="w-3.5 h-3.5" />
                                                <span>Confirm Placement</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
