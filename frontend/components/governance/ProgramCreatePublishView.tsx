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
import SearchableSelect, { SearchableOption } from "../ui/SearchableSelect";

export interface ProgramCreatePublishViewProps {
    parentProgram?: {
        id: string;
        name: string;
        createdOrganization?: { name: string; type: string };
    } | null;
    organizationId?: string | null;
    onBack?: () => void;
    onPublished?: () => void;
}

type TargetTierCategory = "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

export default function ProgramCreatePublishView({
    parentProgram,
    organizationId,
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

    // Delivery Mode & Target Selection (Matching Image 3)
    const [targetType, setTargetType] = useState<
        "ALL" | "ALL_REGIONS" | "SPECIFIC_REGION" | "ALL_ZONES" | "SPECIFIC_ZONE" | "ALL_WOREDAS" | "SPECIFIC_WOREDA" | "ALL_SCHOOLS" | "SPECIFIC_SCHOOL"
    >("ALL");
    const [selectedRegionId, setSelectedRegionId] = useState("");
    const [selectedZoneId, setSelectedZoneId] = useState("");
    const [selectedWoredaId, setSelectedWoredaId] = useState("");
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [treeData, setTreeData] = useState<any>(null);
    const [loadingTree, setLoadingTree] = useState(true);

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
        if (actorTier === "REGION" && treeData?.zones) return treeData.zones;
        if (!availableRegions.length || !selectedRegionId) return [];
        const reg = availableRegions.find((r: any) => r.id === selectedRegionId);
        return reg?.zones || reg?.children || [];
    }, [actorTier, treeData, availableRegions, selectedRegionId]);

    const availableWoredas = useMemo(() => {
        if (actorTier === "ZONE" && treeData?.woredas) return treeData.woredas;
        if (!availableZones.length || !selectedZoneId) return [];
        const zone = availableZones.find((z: any) => z.id === selectedZoneId);
        return zone?.woredas || zone?.children || [];
    }, [actorTier, treeData, availableZones, selectedZoneId]);

    const availableSchools = useMemo(() => {
        if (actorTier === "WOREDA" && treeData?.schools) return treeData.schools;
        if (!availableWoredas.length || !selectedWoredaId) return [];
        const woreda = availableWoredas.find((w: any) => w.id === selectedWoredaId);
        return woreda?.schools || woreda?.children || [];
    }, [actorTier, treeData, availableWoredas, selectedWoredaId]);

    const regionOptions: SearchableOption[] = useMemo(() => {
        return availableRegions.map((r: any) => ({
            value: r.id,
            label: r.name,
            badge: `${(r.zones || r.children || []).length} zones`
        }));
    }, [availableRegions]);

    const zoneOptions: SearchableOption[] = useMemo(() => {
        return availableZones.map((z: any) => ({
            value: z.id,
            label: z.name,
            badge: `${(z.woredas || z.children || []).length} woredas`
        }));
    }, [availableZones]);

    const woredaOptions: SearchableOption[] = useMemo(() => {
        return availableWoredas.map((w: any) => ({
            value: w.id,
            label: w.name,
            badge: `${(w.schools || w.children || []).length} schools`
        }));
    }, [availableWoredas]);

    const schoolOptions: SearchableOption[] = useMemo(() => {
        return availableSchools.map((s: any) => ({
            value: s.id,
            label: s.name,
            badge: "School"
        }));
    }, [availableSchools]);



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

        // Validate drill-down selection
        if (targetType === "SPECIFIC_REGION" && !selectedRegionId) {
            setError("Please select a target Region.");
            return;
        }
        if (targetType === "ALL_ZONES" && !selectedRegionId) {
            setError("Please select a Region to target all its Zones.");
            return;
        }
        if (targetType === "SPECIFIC_ZONE" && (!selectedRegionId || !selectedZoneId)) {
            setError("Please select both Region and target Zone.");
            return;
        }
        if (targetType === "ALL_WOREDAS" && (!selectedRegionId || !selectedZoneId)) {
            setError("Please select both Region and Zone to target all Woredas.");
            return;
        }
        if (targetType === "SPECIFIC_WOREDA" && (!selectedRegionId || !selectedZoneId || !selectedWoredaId)) {
            setError("Please select Region, Zone, and target Woreda.");
            return;
        }
        if (targetType === "ALL_SCHOOLS" && (!selectedRegionId || !selectedZoneId || !selectedWoredaId)) {
            setError("Please select Region, Zone, and Woreda to target all Schools.");
            return;
        }
        if (targetType === "SPECIFIC_SCHOOL" && (!selectedRegionId || !selectedZoneId || !selectedWoredaId || !selectedSchoolId)) {
            setError("Please select Region, Zone, Woreda, and target School.");
            return;
        }

        let isTargetAll = false;
        let targetLevels: any[] = [];
        let targetUnitIds: string[] = [];

        if (targetType === "ALL") {
            isTargetAll = true;
            targetUnitIds = [];
        } else if (targetType === "ALL_REGIONS") {
            targetLevels = ["REGION"];
            targetUnitIds = availableRegions.map((r: any) => r.id);
        } else if (targetType === "SPECIFIC_REGION") {
            targetLevels = ["REGION"];
            targetUnitIds = [selectedRegionId];
        } else if (targetType === "ALL_ZONES") {
            targetLevels = ["ZONE"];
            targetUnitIds = availableZones.map((z: any) => z.id);
        } else if (targetType === "SPECIFIC_ZONE") {
            targetLevels = ["ZONE"];
            targetUnitIds = [selectedZoneId];
        } else if (targetType === "ALL_WOREDAS") {
            targetLevels = ["WOREDA"];
            targetUnitIds = availableWoredas.map((w: any) => w.id);
        } else if (targetType === "SPECIFIC_WOREDA") {
            targetLevels = ["WOREDA"];
            targetUnitIds = [selectedWoredaId];
        } else if (targetType === "ALL_SCHOOLS") {
            targetLevels = ["SCHOOL"];
            targetUnitIds = availableSchools.map((s: any) => s.id);
        } else if (targetType === "SPECIFIC_SCHOOL") {
            targetLevels = ["SCHOOL"];
            targetUnitIds = [selectedSchoolId];
        }

        setSubmitting(true);

        try {
            const endpoint = parentProgram?.id
                ? `/programs/${parentProgram.id}/cascade-implementation`
                : "/programs";

            const res = await fetchApi(endpoint, {
                method: "POST",
                headers: organizationId ? { "x-organization-id": organizationId } : {},
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
                    targetLevelAll: isTargetAll,
                    targetLevels,
                    cascadeDescendants: targetType !== "ALL" ? cascadeDescendants : false,
                    targetUnitIds,
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
                recipientsCount: data.data?.totalRecipients || (targetUnitIds.length > 0 ? targetUnitIds.length : 1)
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
                                {targetType === "ALL"
                                    ? "All Subordinate Tiers & Descendants"
                                    : `Targeted Scope (${targetType.replace(/_/g, " ")})`}
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

                {/* Section 3: Hierarchical Target Scope Delivery (Matching Image 3) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                        3. Delivery & Hierarchical Target Scope
                    </h3>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                            Target Audience <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={targetType}
                            onChange={(e) => {
                                const val = e.target.value as any;
                                setTargetType(val);
                                setSelectedRegionId("");
                                setSelectedZoneId("");
                                setSelectedWoredaId("");
                                setSelectedSchoolId("");
                            }}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-600 font-medium text-slate-800 cursor-pointer"
                        >
                            <option value="ALL">Entire Country (All Jurisdictions, Regions, Zones, Woredas, & Schools)</option>
                            <option value="ALL_REGIONS">All Regions Nationwide (Regions Only)</option>
                            <option value="SPECIFIC_REGION">Target Specific Region (Region Only)</option>
                            <option value="ALL_ZONES">All Zones in a Specific Region</option>
                            <option value="SPECIFIC_ZONE">Target Specific Zone (Zone Only)</option>
                            <option value="ALL_WOREDAS">All Woredas in a Specific Zone</option>
                            <option value="SPECIFIC_WOREDA">Target Specific Woreda (Woreda Only)</option>
                            <option value="ALL_SCHOOLS">All Schools in a Specific Woreda</option>
                            <option value="SPECIFIC_SCHOOL">Target Specific School (School Only)</option>
                        </select>

                        {/* Drill-down: Specific Region (Searchable) */}
                        {targetType === "SPECIFIC_REGION" && (
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    1. Region <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={regionOptions}
                                    value={selectedRegionId}
                                    onChange={(val) => setSelectedRegionId(val)}
                                    placeholder="-- Region --"
                                    searchPlaceholder="Type region..."
                                />
                            </div>
                        )}

                        {/* Drill-down: All Zones in Region */}
                        {targetType === "ALL_ZONES" && (
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    1. Select Parent Region <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={regionOptions}
                                    value={selectedRegionId}
                                    onChange={(val) => setSelectedRegionId(val)}
                                    placeholder="-- Region --"
                                    searchPlaceholder="Type region..."
                                />
                            </div>
                        )}

                        {/* Drill-down: Specific Zone (Searchable Region -> Zone) */}
                        {targetType === "SPECIFIC_ZONE" && (
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        2. Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={!selectedRegionId}
                                        onChange={(val) => setSelectedZoneId(val)}
                                        placeholder={selectedRegionId ? "-- Zone --" : "-- Choose Region First --"}
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Drill-down: All Woredas in Zone */}
                        {targetType === "ALL_WOREDAS" && (
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        2. Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={!selectedRegionId}
                                        onChange={(val) => setSelectedZoneId(val)}
                                        placeholder={selectedRegionId ? "-- Zone --" : "-- Choose Region First --"}
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Drill-down: Specific Woreda (Searchable Region -> Zone -> Woreda) */}
                        {targetType === "SPECIFIC_WOREDA" && (
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        2. Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={!selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder={selectedRegionId ? "-- Zone --" : "-- Choose Region First --"}
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        3. Woreda <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={woredaOptions}
                                        value={selectedWoredaId}
                                        disabled={!selectedZoneId}
                                        onChange={(val) => setSelectedWoredaId(val)}
                                        placeholder={selectedZoneId ? "-- Woreda --" : "-- Choose Zone First --"}
                                        searchPlaceholder="Type woreda..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Drill-down: All Schools in Woreda */}
                        {targetType === "ALL_SCHOOLS" && (
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        2. Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={!selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder={selectedRegionId ? "-- Zone --" : "-- Choose Region First --"}
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        3. Woreda <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={woredaOptions}
                                        value={selectedWoredaId}
                                        disabled={!selectedZoneId}
                                        onChange={(val) => setSelectedWoredaId(val)}
                                        placeholder={selectedZoneId ? "-- Woreda --" : "-- Choose Zone First --"}
                                        searchPlaceholder="Type woreda..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Drill-down: Specific School (4-level Searchable Cascade: EXACT MATCH TO IMAGE 3) */}
                        {targetType === "SPECIFIC_SCHOOL" && (
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        2. Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={!selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder={selectedRegionId ? "-- Zone --" : "-- Choose Region First --"}
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        3. Woreda <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={woredaOptions}
                                        value={selectedWoredaId}
                                        disabled={!selectedZoneId}
                                        onChange={(val) => {
                                            setSelectedWoredaId(val);
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder={selectedZoneId ? "-- Woreda --" : "-- Choose Zone First --"}
                                        searchPlaceholder="Type woreda..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        4. School <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={schoolOptions}
                                        value={selectedSchoolId}
                                        disabled={!selectedWoredaId}
                                        onChange={(val) => setSelectedSchoolId(val)}
                                        placeholder={selectedWoredaId ? "-- School --" : "-- Choose Woreda First --"}
                                        searchPlaceholder="Type school..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Cascade descendants toggle */}
                        <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={cascadeDescendants}
                                    onChange={e => setCascadeDescendants(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <span className="text-xs text-slate-600">
                                    Automatically cascade implementation requirements to subordinate descendant institutions
                                </span>
                            </label>
                        </div>
                    </div>
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
