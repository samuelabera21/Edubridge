"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    ArrowLeft,
    Send,
    FileText,
    CheckCircle2,
    AlertCircle,
    Bell,
    Layers,
    Building2,
    MapPin,
    School,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Search,
    X,
    Filter,
    ChevronsUpDown,
    CheckCheck,
    RotateCcw
} from "lucide-react";

export interface HierarchyNode {
    id: string;
    name: string;
    type: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    parentId: string | null;
    children?: HierarchyNode[];
}

export interface SelectedTarget {
    id: string;
    name: string;
    type: "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    parentName?: string;
}

interface DirectivesPublishViewProps {
    onBack?: () => void;
    onPublished?: () => void;
}

export default function DirectivesPublishView({ onBack, onPublished }: DirectivesPublishViewProps) {
    const router = useRouter();

    // 1. Core Mandate Information
    const [title, setTitle] = useState("");
    const [code, setCode] = useState("");
    const [type, setType] = useState<"POLICY" | "DIRECTIVE">("DIRECTIVE");
    const [category, setCategory] = useState("Curriculum & Syllabus");
    const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL">("NORMAL");
    const [content, setContent] = useState("");
    const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [deadline, setDeadline] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachmentName, setAttachmentName] = useState("");
    const [isAcknowledgmentRequired, setIsAcknowledgmentRequired] = useState(true);

    // 2. Hierarchy Targeting State
    const [targetScopeMode, setTargetScopeMode] = useState<"ALL" | "SPECIFIC">("ALL");
    const [selectedLevels, setSelectedLevels] = useState<string[]>(["REGION", "ZONE", "WOREDA", "SCHOOL"]);
    const [cascadeDescendants, setCascadeDescendants] = useState(true);
    const [selectedTargets, setSelectedTargets] = useState<SelectedTarget[]>([]);

    // Hierarchy tree data & expansion
    const [treeNodes, setTreeNodes] = useState<HierarchyNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(false);
    const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
    const [treeSearch, setTreeSearch] = useState("");

    // Submission & Confirmation state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<{
        title: string;
        recipientsCount: number;
        notificationsCount: number;
    } | null>(null);

    // Load full hierarchy tree from backend
    useEffect(() => {
        async function loadTree() {
            setLoadingTree(true);
            try {
                const res = await fetchApi("/hierarchy/tree");
                if (res.ok) {
                    const payload = await res.json();
                    if (payload.success && payload.data) {
                        const rawData: HierarchyNode[] = Array.isArray(payload.data)
                            ? payload.data
                            : [payload.data];
                        setTreeNodes(rawData);

                        // Auto-expand all regions and zones by default
                        const initialExpanded = new Set<string>();
                        function autoExpand(node: HierarchyNode) {
                            if (node.type === "FEDERAL" || node.type === "REGION" || node.type === "ZONE") {
                                initialExpanded.add(node.id);
                            }
                            if (node.children) {
                                node.children.forEach(autoExpand);
                            }
                        }
                        rawData.forEach(autoExpand);
                        setExpandedNodeIds(initialExpanded);
                    }
                }
            } catch (err) {
                console.error("Failed to load hierarchy tree:", err);
            } finally {
                setLoadingTree(false);
            }
        }
        loadTree();
    }, []);

    // Extract all Region nodes cleanly from treeNodes
    const regionsList: HierarchyNode[] = useMemo(() => {
        if (!treeNodes || treeNodes.length === 0) return [];

        const regions: HierarchyNode[] = [];
        function extractRegions(node: HierarchyNode) {
            if (node.type === "REGION") {
                regions.push(node);
            } else if (node.children) {
                node.children.forEach(extractRegions);
            }
        }

        treeNodes.forEach(extractRegions);
        return regions;
    }, [treeNodes]);

    // Fast target lookup set for O(1) checks
    const selectedTargetIds = useMemo(() => {
        return new Set(selectedTargets.map(t => t.id));
    }, [selectedTargets]);

    const isTargetSelected = useCallback((id: string) => selectedTargetIds.has(id), [selectedTargetIds]);

    // Toggle single node target selection
    const toggleTargetSelection = (target: SelectedTarget) => {
        setSelectedTargets(prev => {
            const exists = prev.some(t => t.id === target.id);
            if (exists) {
                return prev.filter(t => t.id !== target.id);
            } else {
                return [...prev, target];
            }
        });
    };

    const removeTarget = (id: string) => {
        setSelectedTargets(prev => prev.filter(t => t.id !== id));
    };

    const clearAllTargets = () => {
        setSelectedTargets([]);
    };

    // Toggle node expansion
    const toggleExpand = (nodeId: string) => {
        setExpandedNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    // Expand All / Collapse All
    const handleExpandAll = () => {
        const allIds = new Set<string>();
        function collect(node: HierarchyNode) {
            allIds.add(node.id);
            if (node.children) {
                node.children.forEach(collect);
            }
        }
        treeNodes.forEach(collect);
        setExpandedNodeIds(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedNodeIds(new Set());
    };

    // Batch Selectors across the entire country
    const handleSelectAllOfLevel = (levelType: "REGION" | "ZONE" | "WOREDA" | "SCHOOL") => {
        const toAdd: SelectedTarget[] = [];
        function traverse(node: HierarchyNode, parentName?: string) {
            if (node.type === levelType) {
                toAdd.push({
                    id: node.id,
                    name: node.name,
                    type: node.type as any,
                    parentName
                });
            }
            if (node.children) {
                node.children.forEach(c => traverse(c, node.name));
            }
        }
        treeNodes.forEach(root => traverse(root));

        setSelectedTargets(prev => {
            const map = new Map<string, SelectedTarget>();
            prev.forEach(t => map.set(t.id, t));
            toAdd.forEach(t => map.set(t.id, t));
            return Array.from(map.values());
        });
    };

    // Batch Selectors for a specific branch (e.g. all zones in a region, all woredas in a zone, all schools in a woreda)
    const handleSelectBranchLevel = (
        parentNode: HierarchyNode,
        targetChildType: "ZONE" | "WOREDA" | "SCHOOL"
    ) => {
        const toAdd: SelectedTarget[] = [];
        function traverse(node: HierarchyNode, pName: string) {
            if (node.type === targetChildType) {
                toAdd.push({
                    id: node.id,
                    name: node.name,
                    type: node.type as any,
                    parentName: pName
                });
            }
            if (node.children) {
                node.children.forEach(c => traverse(c, node.name));
            }
        }
        if (parentNode.children) {
            parentNode.children.forEach(c => traverse(c, parentNode.name));
        }

        setSelectedTargets(prev => {
            const map = new Map<string, SelectedTarget>();
            prev.forEach(t => map.set(t.id, t));
            toAdd.forEach(t => map.set(t.id, t));
            return Array.from(map.values());
        });
    };

    // Target Administrative Level pills toggling
    const toggleLevel = (lvl: string) => {
        setSelectedLevels(prev =>
            prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl]
        );
    };

    const handleSelectAllLevels = () => {
        setSelectedLevels(["REGION", "ZONE", "WOREDA", "SCHOOL"]);
    };

    const handleDeselectAllLevels = () => {
        setSelectedLevels([]);
    };

    // Hierarchy counts breakdown of selected targets
    const selectedCounts = useMemo(() => {
        const counts = { REGION: 0, ZONE: 0, WOREDA: 0, SCHOOL: 0 };
        selectedTargets.forEach(t => {
            if (counts[t.type] !== undefined) counts[t.type]++;
        });
        return counts;
    }, [selectedTargets]);

    // Handle Form Submit
    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Title is required.");
            return;
        }
        if (!content.trim()) {
            setError("Directive body content is required.");
            return;
        }
        if (selectedLevels.length === 0) {
            setError("Please select at least one target administrative level.");
            return;
        }
        if (targetScopeMode === "SPECIFIC" && selectedTargets.length === 0) {
            setError("Please select at least one target jurisdiction (Region, Zone, Woreda, or School).");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                code: code.trim() || undefined,
                type,
                category: category.trim() || undefined,
                priority,
                content: content.trim(),
                issueDate,
                effectiveDate,
                deadline: deadline || undefined,
                attachmentUrl: attachmentUrl.trim() || undefined,
                attachmentName: attachmentName.trim() || undefined,
                isAcknowledgmentRequired,
                targetLevelAll: targetScopeMode === "ALL",
                targetLevels: selectedLevels,
                targetOrganizationUnitIds: targetScopeMode === "SPECIFIC" ? selectedTargets.map(t => t.id) : [],
                cascadeDescendants
            };

            const res = await fetchApi("/directives", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json();
                setReceipt({
                    title: title.trim(),
                    recipientsCount: result.recipientsCount || 0,
                    notificationsCount: result.notificationsCount || 0
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || "Failed to publish directive.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to submit directive.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push("/dashboard/federal?tab=directives");
        }
    };

    // Success Confirmation Screen
    if (receipt) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-900">Directive Published Successfully</h2>
                        <p className="text-sm text-slate-600 font-medium">"{receipt.title}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block">Recipient Units</span>
                            <span className="text-xl font-bold text-slate-900">{receipt.recipientsCount} Jurisdictions</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block">In-App Notifications</span>
                            <span className="text-xl font-bold text-slate-900">{receipt.notificationsCount} Dispatched</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setReceipt(null);
                                setTitle("");
                                setContent("");
                                setCode("");
                                setSelectedTargets([]);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                            Publish Another
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (onPublished) onPublished();
                                else handleGoBack();
                            }}
                            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                        >
                            View Registry & Tracking
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleGoBack}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Registry</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">Federal Ministry Governance</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1">
                <h1 className="text-lg font-bold text-slate-900">Publish National Policy or Directive</h1>
                <p className="text-xs text-slate-500">
                    Officially issue a binding directive or policy standard across Ethiopia's education hierarchy.
                </p>
            </div>

            {error && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handlePublish} className="space-y-5">
                {/* 1. General Information */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        1. General Information
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Type <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType("DIRECTIVE")}
                                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                                        type === "DIRECTIVE"
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    Directive (Mandate)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("POLICY")}
                                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                                        type === "POLICY"
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    Policy (Guideline)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Priority Level <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
                            >
                                <option value="NORMAL">Normal (Routine)</option>
                                <option value="HIGH">High Priority</option>
                                <option value="URGENT">Urgent (Action Required)</option>
                                <option value="CRITICAL">Critical (Immediate Compliance)</option>
                                <option value="LOW">Low (Informational)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g., National STEM Curriculum Rollout 2026/27"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Reference Code
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="e.g., DIR-2026-009"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400 font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400"
                            >
                                <option value="Curriculum & Syllabus">Curriculum & Syllabus</option>
                                <option value="National Examinations">National Examinations</option>
                                <option value="School Governance & Standards">School Governance & Standards</option>
                                <option value="Teacher Licensure & Capacity">Teacher Licensure & Capacity</option>
                                <option value="Administrative Instructions">Administrative Instructions</option>
                                <option value="General Operational Directive">General Operational Directive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Effective Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={effectiveDate}
                                onChange={e => setEffectiveDate(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Compliance Deadline (Optional)
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Directive Body */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        2. Directive Content & Mandate Body <span className="text-rose-500">*</span>
                    </h2>

                    <textarea
                        required
                        rows={6}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Enter official directive mandate instructions, statutory compliance guidelines, implementation rules, and action requirements..."
                        className="w-full p-3.5 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400 leading-relaxed font-sans"
                    />
                </div>

                {/* 3. Hierarchy Target Drill-down & Level Selection */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        3. Target Recipients & Hierarchy Scope
                    </h2>

                    {/* Scope Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Geographical Scope
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                                targetScopeMode === "ALL" ? "bg-slate-50 border-slate-900 text-slate-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}>
                                <input
                                    type="radio"
                                    name="targetScopeMode"
                                    checked={targetScopeMode === "ALL"}
                                    onChange={() => setTargetScopeMode("ALL")}
                                    className="mt-0.5"
                                />
                                <div>
                                    <span className="text-xs font-bold block">All Jurisdictions (National)</span>
                                    <span className="text-[11px] text-slate-500 block">Issues directive to all regions, zones, woredas, and schools nationwide.</span>
                                </div>
                            </label>

                            <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                                targetScopeMode === "SPECIFIC" ? "bg-slate-50 border-slate-900 text-slate-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}>
                                <input
                                    type="radio"
                                    name="targetScopeMode"
                                    checked={targetScopeMode === "SPECIFIC"}
                                    onChange={() => setTargetScopeMode("SPECIFIC")}
                                    className="mt-0.5"
                                />
                                <div>
                                    <span className="text-xs font-bold block">Selected Target(s) / Hierarchy Drill-Down</span>
                                    <span className="text-[11px] text-slate-500 block">Select specific Region(s), Zone(s), Woreda(s), or School(s).</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* HIERARCHY DRILL-DOWN SELECTOR */}
                    {targetScopeMode === "SPECIFIC" && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                            {/* Top Search & Batch Controls */}
                            <div className="space-y-3 border-b border-slate-200 pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 block">
                                            Hierarchy Drill-Down Explorer
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Expand any Region to select its Zones, drill down to Woredas, and pick individual Schools.
                                        </p>
                                    </div>

                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search region, zone, woreda, school..."
                                            value={treeSearch}
                                            onChange={e => setTreeSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* Fast Level Selectors Toolbar */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3 text-slate-400" /> Quick Select:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllOfLevel("REGION")}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                    >
                                        + All Regions
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllOfLevel("ZONE")}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                    >
                                        + All Zones
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllOfLevel("WOREDA")}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                    >
                                        + All Woredas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllOfLevel("SCHOOL")}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                    >
                                        + All Schools
                                    </button>

                                    <div className="ml-auto flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleExpandAll}
                                            className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                        >
                                            Expand All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCollapseAll}
                                            className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                        >
                                            Collapse All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Targets Chip Summary */}
                            {selectedTargets.length > 0 && (
                                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-2 font-bold text-slate-800">
                                            <span>Selected Recipients ({selectedTargets.length}):</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                                {selectedCounts.REGION > 0 && (
                                                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">
                                                        {selectedCounts.REGION} Regions
                                                    </span>
                                                )}
                                                {selectedCounts.ZONE > 0 && (
                                                    <span className="bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded">
                                                        {selectedCounts.ZONE} Zones
                                                    </span>
                                                )}
                                                {selectedCounts.WOREDA > 0 && (
                                                    <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded">
                                                        {selectedCounts.WOREDA} Woredas
                                                    </span>
                                                )}
                                                {selectedCounts.SCHOOL > 0 && (
                                                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">
                                                        {selectedCounts.SCHOOL} Schools
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearAllTargets}
                                            className="text-rose-600 hover:underline font-semibold cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                                        {selectedTargets.map(target => (
                                            <span
                                                key={target.id}
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                                            >
                                                <span className={`text-[9px] uppercase font-bold px-1 rounded ${
                                                    target.type === "REGION" ? "bg-blue-100 text-blue-800" :
                                                    target.type === "ZONE" ? "bg-sky-100 text-sky-800" :
                                                    target.type === "WOREDA" ? "bg-amber-100 text-amber-800" :
                                                    "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    {target.type}
                                                </span>
                                                <span className="max-w-44 truncate">{target.name}</span>
                                                {target.parentName && (
                                                    <span className="text-[10px] text-slate-400">({target.parentName})</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTarget(target.id)}
                                                    className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tree Container */}
                            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                {loadingTree ? (
                                    <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                                        <span>Loading administrative hierarchy...</span>
                                    </div>
                                ) : regionsList.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        No administrative units found.
                                    </div>
                                ) : (
                                    regionsList.map(region => {
                                        const isRegionExpanded = expandedNodeIds.has(region.id);
                                        const isRegSelected = isTargetSelected(region.id);
                                        const zones = region.children || [];

                                        // Filter search
                                        const searchLower = treeSearch.toLowerCase().trim();
                                        if (searchLower && !region.name.toLowerCase().includes(searchLower)) {
                                            const hasMatchingChild = JSON.stringify(region).toLowerCase().includes(searchLower);
                                            if (!hasMatchingChild) return null;
                                        }

                                        return (
                                            <div key={region.id} className="p-2 space-y-1">
                                                {/* REGION LEVEL */}
                                                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(region.id)}
                                                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                                            title={isRegionExpanded ? "Collapse Region" : "Expand Region"}
                                                        >
                                                            {isRegionExpanded ? (
                                                                <ChevronDown className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </button>

                                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={isRegSelected}
                                                                onChange={() =>
                                                                    toggleTargetSelection({
                                                                        id: region.id,
                                                                        name: region.name,
                                                                        type: "REGION"
                                                                    })
                                                                }
                                                                className="rounded text-blue-600"
                                                            />
                                                            <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                            <span>{region.name}</span>
                                                        </label>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {zones.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSelectBranchLevel(region, "ZONE")}
                                                                className="text-[10px] font-semibold text-blue-600 hover:underline px-1.5 py-0.5 rounded hover:bg-blue-50 cursor-pointer"
                                                            >
                                                                + Select All {zones.length} Zones
                                                            </button>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {zones.length} Zones
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* ZONES UNDER REGION */}
                                                {isRegionExpanded && zones.length > 0 && (
                                                    <div className="pl-6 space-y-1 border-l-2 border-slate-100 ml-3">
                                                        {zones.map(zone => {
                                                            const isZoneExpanded = expandedNodeIds.has(zone.id);
                                                            const isZoneSelected = isTargetSelected(zone.id);
                                                            const woredas = zone.children || [];

                                                            if (searchLower && !zone.name.toLowerCase().includes(searchLower)) {
                                                                const hasMatchingGrandChild = JSON.stringify(zone).toLowerCase().includes(searchLower);
                                                                if (!hasMatchingGrandChild) return null;
                                                            }

                                                            return (
                                                                <div key={zone.id} className="space-y-1">
                                                                    {/* ZONE LEVEL */}
                                                                    <div className="flex items-center justify-between p-1 rounded hover:bg-slate-50">
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleExpand(zone.id)}
                                                                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                                                                title={isZoneExpanded ? "Collapse Zone" : "Expand Zone"}
                                                                            >
                                                                                {isZoneExpanded ? (
                                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                                ) : (
                                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                                )}
                                                                            </button>

                                                                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isZoneSelected}
                                                                                    onChange={() =>
                                                                                        toggleTargetSelection({
                                                                                            id: zone.id,
                                                                                            name: zone.name,
                                                                                            type: "ZONE",
                                                                                            parentName: region.name
                                                                                        })
                                                                                    }
                                                                                    className="rounded text-sky-600"
                                                                                />
                                                                                <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                                                <span>{zone.name}</span>
                                                                            </label>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            {woredas.length > 0 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSelectBranchLevel(zone, "WOREDA")}
                                                                                    className="text-[10px] font-semibold text-sky-600 hover:underline px-1 py-0.5 rounded hover:bg-sky-50 cursor-pointer"
                                                                                >
                                                                                    + All {woredas.length} Woredas
                                                                                </button>
                                                                            )}
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {woredas.length} Woredas
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* WOREDAS UNDER ZONE */}
                                                                    {isZoneExpanded && woredas.length > 0 && (
                                                                        <div className="pl-6 space-y-1 border-l-2 border-slate-100 ml-3">
                                                                            {woredas.map(woreda => {
                                                                                const isWoredaExpanded = expandedNodeIds.has(woreda.id);
                                                                                const isWoredaSelected = isTargetSelected(woreda.id);
                                                                                const schools = woreda.children || [];

                                                                                if (searchLower && !woreda.name.toLowerCase().includes(searchLower)) {
                                                                                    const hasMatchingSchool = JSON.stringify(woreda).toLowerCase().includes(searchLower);
                                                                                    if (!hasMatchingSchool) return null;
                                                                                }

                                                                                return (
                                                                                    <div key={woreda.id} className="space-y-1">
                                                                                        {/* WOREDA LEVEL */}
                                                                                        <div className="flex items-center justify-between p-1 rounded hover:bg-slate-50">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => toggleExpand(woreda.id)}
                                                                                                    className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                                                                                    title={isWoredaExpanded ? "Collapse Woreda" : "Expand Woreda"}
                                                                                                >
                                                                                                    {isWoredaExpanded ? (
                                                                                                        <ChevronDown className="w-3 h-3" />
                                                                                                    ) : (
                                                                                                        <ChevronRight className="w-3 h-3" />
                                                                                                    )}
                                                                                                </button>

                                                                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={isWoredaSelected}
                                                                                                        onChange={() =>
                                                                                                            toggleTargetSelection({
                                                                                                                id: woreda.id,
                                                                                                                name: woreda.name,
                                                                                                                type: "WOREDA",
                                                                                                                parentName: zone.name
                                                                                                            })
                                                                                                        }
                                                                                                        className="rounded text-amber-600"
                                                                                                    />
                                                                                                    <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                                                                                    <span>{woreda.name}</span>
                                                                                                </label>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-2">
                                                                                                {schools.length > 0 && (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleSelectBranchLevel(woreda, "SCHOOL")}
                                                                                                        className="text-[10px] font-semibold text-amber-600 hover:underline px-1 py-0.5 rounded hover:bg-amber-50 cursor-pointer"
                                                                                                    >
                                                                                                        + All {schools.length} Schools
                                                                                                    </button>
                                                                                                )}
                                                                                                <span className="text-[10px] text-slate-400">
                                                                                                    {schools.length} Schools
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* SCHOOLS UNDER WOREDA */}
                                                                                        {isWoredaExpanded && schools.length > 0 && (
                                                                                            <div className="pl-6 space-y-1 border-l-2 border-slate-100 ml-3">
                                                                                                {schools.map(school => {
                                                                                                    const isSchoolSelected = isTargetSelected(school.id);

                                                                                                    if (searchLower && !school.name.toLowerCase().includes(searchLower)) {
                                                                                                        return null;
                                                                                                    }

                                                                                                    return (
                                                                                                        <label
                                                                                                            key={school.id}
                                                                                                            className="flex items-center justify-between p-1 rounded hover:bg-slate-50 text-xs text-slate-600 cursor-pointer select-none"
                                                                                                        >
                                                                                                            <div className="flex items-center gap-2 pl-4">
                                                                                                                <input
                                                                                                                    type="checkbox"
                                                                                                                    checked={isSchoolSelected}
                                                                                                                    onChange={() =>
                                                                                                                        toggleTargetSelection({
                                                                                                                            id: school.id,
                                                                                                                            name: school.name,
                                                                                                                            type: "SCHOOL",
                                                                                                                            parentName: woreda.name
                                                                                                                        })
                                                                                                                    }
                                                                                                                    className="rounded text-emerald-600"
                                                                                                                />
                                                                                                                <School className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                                                                <span>{school.name}</span>
                                                                                                            </div>
                                                                                                            <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                                                                                                School
                                                                                                            </span>
                                                                                                        </label>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Target Levels Checkboxes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700">
                                Target Administrative Levels:
                            </label>
                            <div className="flex items-center gap-2 text-[11px] font-semibold">
                                <button
                                    type="button"
                                    onClick={handleSelectAllLevels}
                                    className="text-blue-600 hover:underline cursor-pointer"
                                >
                                    Select All Levels
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={handleDeselectAllLevels}
                                    className="text-slate-500 hover:underline cursor-pointer"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                                { id: "REGION", label: "Regions", icon: Layers },
                                { id: "ZONE", label: "Zones", icon: Building2 },
                                { id: "WOREDA", label: "Woredas", icon: MapPin },
                                { id: "SCHOOL", label: "Schools", icon: School }
                            ].map(item => {
                                const checked = selectedLevels.includes(item.id);
                                const Icon = item.icon;
                                return (
                                    <label
                                        key={item.id}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                            checked
                                                ? "bg-slate-900 text-white border-slate-900 font-semibold"
                                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleLevel(item.id)}
                                            className="hidden"
                                        />
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Options */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cascadeDescendants}
                                onChange={e => setCascadeDescendants(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                            <span className="font-semibold">Hierarchical Cascade:</span>
                            <span className="text-slate-500">Automatically deliver to subordinate child units (Zones, Woredas, Schools)</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAcknowledgmentRequired}
                                onChange={e => setIsAcknowledgmentRequired(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                            <span className="font-semibold">Require Recipient Acknowledgment:</span>
                            <span className="text-slate-500">Recipients must officially confirm and sign off receipt</span>
                        </label>
                    </div>
                </div>

                {/* 4. Supporting Document */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        4. Supporting Attachment (Optional)
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Document URL
                            </label>
                            <input
                                type="text"
                                value={attachmentUrl}
                                onChange={e => setAttachmentUrl(e.target.value)}
                                placeholder="https://moe.gov.et/directives/stem-2026.pdf"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Attachment Label
                            </label>
                            <input
                                type="text"
                                value={attachmentName}
                                onChange={e => setAttachmentName(e.target.value)}
                                placeholder="e.g., Official Gazette Syllabus Specification.pdf"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Bar */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Bell className="w-4 h-4 text-slate-400" />
                        <span>All assigned administrators in target scopes will receive in-app notifications.</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleGoBack}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Publishing...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Publish Directive</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
