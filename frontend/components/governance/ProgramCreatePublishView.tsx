"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { fetchApi } from "../../lib/api";
import {
    ArrowLeft,
    Send,
    UploadCloud,
    Paperclip,
    X,
    CheckCircle2,
    AlertCircle,
    Building2,
    MapPin,
    School,
    Layers,
    Loader2,
    Calendar,
    Target,
    Compass,
    Search,
    Check,
    ChevronDown,
    Filter
} from "lucide-react";

export interface ProgramCreatePublishViewProps {
    parentProgram?: {
        id: string;
        name: string;
        createdOrganization?: { name: string; type: string };
    } | null;
    onBack?: () => void;
    onPublished?: () => void;
}

type TargetTierCategory = "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

export default function ProgramCreatePublishView({
    parentProgram,
    onBack,
    onPublished
}: ProgramCreatePublishViewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [objective, setObjective] = useState("");
    const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL">("NORMAL");
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");
    const [instructions, setInstructions] = useState("");
    const [requiredAction, setRequiredAction] = useState("");
    const [targetLevelAll, setTargetLevelAll] = useState(true);
    const [cascadeDescendants, setCascadeDescendants] = useState(false);

    // Delivery Mode & Target Selection
    const [deliveryMode, setDeliveryMode] = useState<"ALL" | "SPECIFIC">("ALL");
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [treeData, setTreeData] = useState<any>(null);
    const [loadingTree, setLoadingTree] = useState(true);

    // Cascading Filter Selection State
    const [selectedCategory, setSelectedCategory] = useState<TargetTierCategory>("REGION");
    const [filterRegionId, setFilterRegionId] = useState<string>("");
    const [filterZoneId, setFilterZoneId] = useState<string>("");
    const [filterWoredaId, setFilterWoredaId] = useState<string>("");
    const [unitSearchQuery, setUnitSearchQuery] = useState("");

    // Attachment
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachmentName, setAttachmentName] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);

    // Submission & Confirmation
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successReceipt, setSuccessReceipt] = useState<{
        name: string;
        recipientsCount: number;
    } | null>(null);

    // Load accessible units tree
    useEffect(() => {
        async function loadRecipientsTree() {
            setLoadingTree(true);
            try {
                const res = await fetchApi("/programs/recipients-tree");
                if (res.ok) {
                    const json = await res.json();
                    setTreeData(json.data);

                    const actorTier = json.data?.actorTier || "FEDERAL";
                    if (actorTier === "FEDERAL") {
                        setSelectedCategory("REGION");
                    } else if (actorTier === "REGION") {
                        setSelectedCategory("ZONE");
                    } else if (actorTier === "ZONE") {
                        setSelectedCategory("WOREDA");
                    } else if (actorTier === "WOREDA") {
                        setSelectedCategory("SCHOOL");
                    }
                }
            } catch (err: any) {
                console.error("Failed to load recipients tree:", err);
            } finally {
                setLoadingTree(false);
            }
        }
        loadRecipientsTree();
    }, []);

    // Extract available regions, zones, woredas, schools
    const actorTier = treeData?.actorTier || "FEDERAL";

    const availableRegions = useMemo(() => {
        if (!treeData) return [];
        if (treeData.regions) return treeData.regions;
        return treeData.units?.filter((u: any) => u.type === "REGION") || [];
    }, [treeData]);

    const availableZones = useMemo(() => {
        if (!treeData) return [];
        if (treeData.actorTier === "REGION" && treeData.zones) return treeData.zones;
        if (treeData.regions) {
            if (filterRegionId) {
                const r = treeData.regions.find((reg: any) => reg.id === filterRegionId);
                return r?.children || [];
            }
            return treeData.regions.flatMap((reg: any) => reg.children || []);
        }
        return treeData.units?.filter((u: any) => u.type === "ZONE") || [];
    }, [treeData, filterRegionId]);

    const availableWoredas = useMemo(() => {
        if (!treeData) return [];
        if (treeData.actorTier === "ZONE" && treeData.woredas) return treeData.woredas;

        let zonesToScan: any[] = [];
        if (treeData.regions) {
            if (filterRegionId) {
                const r = treeData.regions.find((reg: any) => reg.id === filterRegionId);
                zonesToScan = r?.children || [];
            } else {
                zonesToScan = treeData.regions.flatMap((reg: any) => reg.children || []);
            }
        } else if (treeData.zones) {
            zonesToScan = treeData.zones;
        }

        if (filterZoneId) {
            const z = zonesToScan.find((zone: any) => zone.id === filterZoneId);
            return z?.children || [];
        }

        if (zonesToScan.length > 0) {
            return zonesToScan.flatMap((z: any) => z.children || []);
        }

        return treeData.units?.filter((u: any) => u.type === "WOREDA") || [];
    }, [treeData, filterRegionId, filterZoneId]);

    const availableSchools = useMemo(() => {
        if (!treeData) return [];
        if (treeData.actorTier === "WOREDA" && treeData.schools) return treeData.schools;

        let woredasToScan: any[] = [];
        if (treeData.regions) {
            let zones = treeData.regions.flatMap((reg: any) => reg.children || []);
            if (filterRegionId) {
                const r = treeData.regions.find((reg: any) => reg.id === filterRegionId);
                zones = r?.children || [];
            }
            if (filterZoneId) {
                zones = zones.filter((z: any) => z.id === filterZoneId);
            }
            woredasToScan = zones.flatMap((z: any) => z.children || []);
        } else if (treeData.zones) {
            let zones = treeData.zones;
            if (filterZoneId) {
                zones = zones.filter((z: any) => z.id === filterZoneId);
            }
            woredasToScan = zones.flatMap((z: any) => z.children || []);
        } else if (treeData.woredas) {
            woredasToScan = treeData.woredas;
        }

        if (filterWoredaId) {
            const w = woredasToScan.find((wor: any) => wor.id === filterWoredaId);
            return w?.children || [];
        }

        if (woredasToScan.length > 0) {
            return woredasToScan.flatMap((w: any) => w.children || []);
        }

        return treeData.units?.filter((u: any) => u.type === "SCHOOL") || [];
    }, [treeData, filterRegionId, filterZoneId, filterWoredaId]);

    // Current units displayed for selection
    const selectableUnits = useMemo(() => {
        let list: any[] = [];
        if (selectedCategory === "REGION") list = availableRegions;
        else if (selectedCategory === "ZONE") list = availableZones;
        else if (selectedCategory === "WOREDA") list = availableWoredas;
        else if (selectedCategory === "SCHOOL") list = availableSchools;

        if (!unitSearchQuery.trim()) return list;
        return list.filter((u: any) => u.name.toLowerCase().includes(unitSearchQuery.toLowerCase()));
    }, [selectedCategory, availableRegions, availableZones, availableWoredas, availableSchools, unitSearchQuery]);

    // Map of all accessible units for displaying selected tags
    const allUnitsMap = useMemo(() => {
        const map = new Map<string, { id: string; name: string; type: string }>();
        if (!treeData) return map;

        if (treeData.units) {
            for (const u of treeData.units) map.set(u.id, u);
        }
        if (treeData.regions) {
            for (const r of treeData.regions) {
                map.set(r.id, { id: r.id, name: r.name, type: r.type });
                if (r.children) {
                    for (const z of r.children) {
                        map.set(z.id, { id: z.id, name: z.name, type: z.type });
                        if (z.children) {
                            for (const w of z.children) {
                                map.set(w.id, { id: w.id, name: w.name, type: w.type });
                                if (w.children) {
                                    for (const s of w.children) {
                                        map.set(s.id, { id: s.id, name: s.name, type: s.type });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return map;
    }, [treeData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setUploadingFile(true);

        try {
            const presignRes = await fetchApi("/storage/presign", {
                method: "POST",
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || "application/octet-stream",
                    folder: "programs"
                })
            });

            if (!presignRes.ok) {
                const errData = await presignRes.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to generate upload link.");
            }

            const { presignedUrl, publicUrl } = await presignRes.json();

            const uploadRes = await fetch(presignedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "application/octet-stream"
                },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error("Failed to upload file to storage server.");
            }

            setAttachmentUrl(publicUrl);
            setAttachmentName(file.name);
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "File upload failed. Please try again.");
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const toggleUnitSelection = (unitId: string) => {
        setSelectedUnitIds(prev =>
            prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
        );
    };

    const selectAllCurrentUnits = () => {
        const newIds = new Set(selectedUnitIds);
        selectableUnits.forEach((u: any) => newIds.add(u.id));
        setSelectedUnitIds(Array.from(newIds));
    };

    const deselectAllCurrentUnits = () => {
        const currentIds = new Set(selectableUnits.map((u: any) => u.id));
        setSelectedUnitIds(prev => prev.filter(id => !currentIds.has(id)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Please provide a program name.");
            return;
        }
        if (!description.trim()) {
            setError("Please provide a description.");
            return;
        }
        if (!objective.trim()) {
            setError("Please provide a program objective.");
            return;
        }
        if (!instructions.trim()) {
            setError("Please provide implementation instructions.");
            return;
        }
        if (!requiredAction.trim()) {
            setError("Please specify the required action.");
            return;
        }
        if (!startDate || !endDate) {
            setError("Both start and end dates are required.");
            return;
        }

        const isTargetSpecific = deliveryMode === "SPECIFIC";
        if (isTargetSpecific && selectedUnitIds.length === 0) {
            setError("Please select at least one specific target unit or choose 'Deliver to All Subordinates Across Jurisdiction'.");
            return;
        }

        setSubmitting(true);

        try {
            const endpoint = parentProgram?.id
                ? `/programs/${parentProgram.id}/cascade-implementation`
                : "/programs";

            const res = await fetchApi(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    objective: objective.trim(),
                    priority,
                    startDate,
                    endDate,
                    instructions: instructions.trim(),
                    requiredAction: requiredAction.trim(),
                    attachmentUrl: attachmentUrl || null,
                    attachmentName: attachmentName || null,
                    targetLevelAll: !isTargetSpecific,
                    targetLevels: isTargetSpecific ? [selectedCategory] : [],
                    cascadeDescendants: isTargetSpecific ? cascadeDescendants : false,
                    targetUnitIds: isTargetSpecific ? selectedUnitIds : [],
                    parentProgramId: parentProgram?.id || null
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to publish program.");
            }

            const data = await res.json();
            setSuccessReceipt({
                name: data.data?.name || name,
                recipientsCount: data.data?.totalRecipients || (isTargetSpecific ? selectedUnitIds.length : 1)
            });
        } catch (err: any) {
            setError(err.message || "An error occurred while publishing the program.");
        } finally {
            setSubmitting(false);
        }
    };

    if (successReceipt) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-5 shadow-sm">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-900">
                            {parentProgram ? "Subordinate Initiative Cascaded!" : "Program Successfully Published!"}
                        </h2>
                        <p className="text-xs text-slate-500">
                            Delivered to <strong>{successReceipt.recipientsCount}</strong> subordinate recipient organizations across your jurisdiction. Notifications sent to assigned administrators.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                        <div>
                            <span className="text-slate-400 font-medium">Program Name:</span>
                            <p className="font-semibold text-slate-800">{successReceipt.name}</p>
                        </div>
                        {parentProgram && (
                            <div>
                                <span className="text-slate-400 font-medium">Parent Program:</span>
                                <p className="font-semibold text-slate-800">{parentProgram.name}</p>
                            </div>
                        )}
                        <div>
                            <span className="text-slate-400 font-medium">Delivery Scope:</span>
                            <p className="font-semibold text-slate-800">
                                {deliveryMode === "SPECIFIC"
                                    ? `Targeted (${selectedUnitIds.length} designated units)`
                                    : "All Subordinate Tiers & Descendants"}
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3">
                        <button
                            onClick={onPublished || onBack}
                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            Return to Programs Registry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Go back"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Compass className="w-4 h-4 text-slate-700" />
                            <span>{parentProgram ? "Cascade Subordinate Implementation" : "Issue National / Regional Program"}</span>
                        </h2>
                        <p className="text-xs text-slate-500">
                            {parentProgram
                                ? `Creating localized implementation for: ${parentProgram.name}`
                                : "Deploy structured initiatives requiring measurable implementation across subordinate tiers."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Parent Program Notice (if cascading) */}
            {parentProgram && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <Target className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block">Parent National Program:</span>
                        <span>{parentProgram.name}</span>
                        {parentProgram.createdOrganization && (
                            <span className="text-[11px] text-blue-700 block font-normal">
                                Issued by {parentProgram.createdOrganization.name}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
                {/* Section 1: Basic Details */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                        1. Program Definition & Objectives
                    </h3>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Program / Initiative Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. National School Improvement Program 2026"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Priority Level
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800 bg-white cursor-pointer"
                            >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">
                                    Start Date <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800 bg-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">
                                    End Date / Deadline <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800 bg-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Program Objective <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={objective}
                            onChange={e => setObjective(e.target.value)}
                            placeholder="e.g. Modernize pedagogical infrastructure and raise baseline literacy standard"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Program Summary & Scope Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Provide comprehensive background and context for this initiative..."
                            className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400"
                            required
                        />
                    </div>
                </div>

                {/* Section 2: Execution Requirements */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                        2. Execution & Implementation Requirements
                    </h3>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Required Action for Recipients <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={requiredAction}
                            onChange={e => setRequiredAction(e.target.value)}
                            placeholder="e.g. Complete the school improvement assessment checklist and upload rubrics"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Implementation Instructions <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                            rows={4}
                            placeholder="Step-by-step guidance for subordinate administrators and school leadership..."
                            className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400 font-mono text-[11px]"
                            required
                        />
                    </div>

                    {/* Attachment Upload */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Supporting Document / Guideline Attachment (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*,.zip"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="program-file-input"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-slate-600" />}
                                <span>{uploadingFile ? "Uploading..." : "Upload Document / PDF / Word"}</span>
                            </button>

                            {attachmentName && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                                    <Paperclip className="w-3 h-3 text-slate-400" />
                                    <span className="truncate max-w-[200px]">{attachmentName}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAttachmentUrl("");
                                            setAttachmentName("");
                                        }}
                                        className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 3: Hierarchical Target Scope Delivery */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                            3. Delivery & Hierarchical Target Scope
                        </h3>
                        {selectedUnitIds.length > 0 && deliveryMode === "SPECIFIC" && (
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                {selectedUnitIds.length} units selected
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                deliveryMode === "ALL"
                                    ? "bg-slate-50/80 border-slate-800 shadow-xs"
                                    : "bg-white border-slate-200 hover:bg-slate-50/50"
                            }`}
                        >
                            <input
                                type="radio"
                                checked={deliveryMode === "ALL"}
                                onChange={() => {
                                    setDeliveryMode("ALL");
                                    setSelectedUnitIds([]);
                                }}
                                name="deliveryMode"
                                className="mt-0.5 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                    Deliver to All Subordinates
                                </span>
                                <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                                    Broadcasts this program across all subordinate organizations and tiers under your jurisdiction.
                                </span>
                            </div>
                        </label>

                        <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                deliveryMode === "SPECIFIC"
                                    ? "bg-slate-50/80 border-slate-800 shadow-xs"
                                    : "bg-white border-slate-200 hover:bg-slate-50/50"
                            }`}
                        >
                            <input
                                type="radio"
                                checked={deliveryMode === "SPECIFIC"}
                                onChange={() => setDeliveryMode("SPECIFIC")}
                                name="deliveryMode"
                                className="mt-0.5 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                    Target Specific Administrative Units
                                </span>
                                <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                                    Filter and select specific regions, zones, woredas, or schools using hierarchical drop-downs.
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Hierarchical Picker Panel (when Specific is chosen) */}
                    {deliveryMode === "SPECIFIC" && (
                        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-4">
                            {/* Step A: Select Target Category */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                    Step 1: Choose Target Level
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {actorTier === "FEDERAL" && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory("REGION");
                                                setUnitSearchQuery("");
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                selectedCategory === "REGION"
                                                    ? "bg-slate-900 text-white shadow-xs"
                                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            <span>Regions ({availableRegions.length})</span>
                                        </button>
                                    )}

                                    {(actorTier === "FEDERAL" || actorTier === "REGION") && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory("ZONE");
                                                setUnitSearchQuery("");
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                selectedCategory === "ZONE"
                                                    ? "bg-slate-900 text-white shadow-xs"
                                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span>Zones</span>
                                        </button>
                                    )}

                                    {(actorTier === "FEDERAL" || actorTier === "REGION" || actorTier === "ZONE") && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory("WOREDA");
                                                setUnitSearchQuery("");
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                selectedCategory === "WOREDA"
                                                    ? "bg-slate-900 text-white shadow-xs"
                                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>Woredas</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCategory("SCHOOL");
                                            setUnitSearchQuery("");
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            selectedCategory === "SCHOOL"
                                                ? "bg-slate-900 text-white shadow-xs"
                                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                        }`}
                                    >
                                        <School className="w-3.5 h-3.5" />
                                        <span>Schools</span>
                                    </button>
                                </div>
                            </div>

                            {/* Step B: Cascading Parent Filters */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                {actorTier === "FEDERAL" && (selectedCategory === "ZONE" || selectedCategory === "WOREDA" || selectedCategory === "SCHOOL") && (
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                            Filter by Region
                                        </label>
                                        <select
                                            value={filterRegionId}
                                            onChange={e => {
                                                setFilterRegionId(e.target.value);
                                                setFilterZoneId("");
                                                setFilterWoredaId("");
                                            }}
                                            className="w-full p-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none cursor-pointer"
                                        >
                                            <option value="">All Regions</option>
                                            {availableRegions.map((r: any) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(actorTier === "FEDERAL" || actorTier === "REGION") && (selectedCategory === "WOREDA" || selectedCategory === "SCHOOL") && (
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                            Filter by Zone
                                        </label>
                                        <select
                                            value={filterZoneId}
                                            onChange={e => {
                                                setFilterZoneId(e.target.value);
                                                setFilterWoredaId("");
                                            }}
                                            className="w-full p-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none cursor-pointer"
                                        >
                                            <option value="">All Zones</option>
                                            {availableZones.map((z: any) => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(actorTier === "FEDERAL" || actorTier === "REGION" || actorTier === "ZONE") && selectedCategory === "SCHOOL" && (
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                            Filter by Woreda
                                        </label>
                                        <select
                                            value={filterWoredaId}
                                            onChange={e => setFilterWoredaId(e.target.value)}
                                            className="w-full p-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none cursor-pointer"
                                        >
                                            <option value="">All Woredas</option>
                                            {availableWoredas.map((w: any) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Step C: Searchable Unit Selection List */}
                            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={unitSearchQuery}
                                            onChange={e => setUnitSearchQuery(e.target.value)}
                                            placeholder={`Search available ${selectedCategory.toLowerCase()}s...`}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={selectAllCurrentUnits}
                                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                                        >
                                            Select All ({selectableUnits.length})
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={deselectAllCurrentUnits}
                                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                                        >
                                            Deselect
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                                    {loadingTree ? (
                                        <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Loading organizational hierarchy...</span>
                                        </div>
                                    ) : selectableUnits.length === 0 ? (
                                        <div className="py-6 text-center text-xs text-slate-400">
                                            No {selectedCategory.toLowerCase()}s match your search / filter criteria.
                                        </div>
                                    ) : (
                                        selectableUnits.map((u: any) => {
                                            const isChecked = selectedUnitIds.includes(u.id);
                                            return (
                                                <label
                                                    key={u.id}
                                                    className={`flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                                                        isChecked ? "bg-blue-50/40" : ""
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleUnitSelection(u.id)}
                                                            className="rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                                                        />
                                                        <span className="font-semibold text-slate-800 truncate">{u.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                                        {u.type}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Step D: Selected Units Tag Chips */}
                            {selectedUnitIds.length > 0 && (
                                <div className="pt-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            Designated Target Units ({selectedUnitIds.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUnitIds([])}
                                            className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-xl">
                                        {selectedUnitIds.map(id => {
                                            const unit = allUnitsMap.get(id);
                                            return (
                                                <span
                                                    key={id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px] font-medium border border-slate-200"
                                                >
                                                    <span>{unit?.name || id}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase">({unit?.type || "UNIT"})</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleUnitSelection(id)}
                                                        className="text-slate-400 hover:text-slate-700 cursor-pointer ml-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cascade descendants toggle */}
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={cascadeDescendants}
                            onChange={e => setCascadeDescendants(e.target.checked)}
                            className="rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-medium">
                            Automatically cascade implementation requirements to subordinate descendant institutions
                        </span>
                    </label>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={submitting || uploadingFile}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Publishing Program...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                <span>{parentProgram ? "Publish Cascaded Initiative" : "Publish Program & Deliver"}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
