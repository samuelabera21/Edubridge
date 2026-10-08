"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchApi } from "../../lib/api";
import {
    ArrowLeft,
    Layers,
    Building2,
    MapPin,
    School,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink,
    HelpCircle,
    Calendar,
    Target,
    ListFilter,
    FileSpreadsheet,
    Link2,
    Copy,
    ChevronUp,
    ChevronDown,
    Check,
    Search,
    X
} from "lucide-react";

export type DataRequestFieldType =
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "NUMBER"
    | "YES_NO"
    | "DATE"
    | "SINGLE_SELECT"
    | "MULTI_SELECT";

export interface FieldItem {
    id: string;
    label: string;
    fieldType: DataRequestFieldType;
    required: boolean;
    description: string;
    options: string[];
    rawOptionsInput?: string;
}

export interface DataRequestCreateViewProps {
    onBack?: () => void;
    onCreated?: (createdId: string) => void;
}

export default function DataRequestCreateView({
    onBack,
    onCreated
}: DataRequestCreateViewProps) {
    // Basic Information
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [objective, setObjective] = useState("");
    const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [deadline, setDeadline] = useState("");
    const [instructions, setInstructions] = useState("");
    const [requiredAction, setRequiredAction] = useState("");

    // Dynamic Fields
    const [fields, setFields] = useState<FieldItem[]>([
        {
            id: "f-1",
            label: "Number of computers",
            fieldType: "NUMBER",
            required: true,
            description: "Total count of desktop and laptop computers in inventory",
            options: []
        },
        {
            id: "f-2",
            label: "Number of functional computers",
            fieldType: "NUMBER",
            required: true,
            description: "Computers currently powered on and usable",
            options: []
        },
        {
            id: "f-3",
            label: "Is internet available?",
            fieldType: "YES_NO",
            required: true,
            description: "Dedicated broadband, 4G, or fiber internet connection",
            options: []
        },
        {
            id: "f-4",
            label: "Comments & Infrastructure condition",
            fieldType: "LONG_TEXT",
            required: false,
            description: "Any extra remarks regarding lab facilities or power stability",
            options: []
        }
    ]);

    // Target scope & hierarchy units
    const [targetScopeMode, setTargetScopeMode] = useState<"ALL_DESK" | "SPECIFIC">("SPECIFIC");
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [treeData, setTreeData] = useState<any>(null);
    const [loadingUnits, setLoadingUnits] = useState(true);

    // Cascading Filter Selection State
    const [targetCategory, setTargetCategory] = useState<"REGION" | "ZONE" | "WOREDA" | "SCHOOL">("REGION");
    const [filterRegionId, setFilterRegionId] = useState<string>("");
    const [filterZoneId, setFilterZoneId] = useState<string>("");
    const [filterWoredaId, setFilterWoredaId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Execution & Progress State
    const [submitting, setSubmitting] = useState(false);
    const [progressStatus, setProgressStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<{
        id: string;
        title: string;
        googleResponderUri: string;
        googleFormEditUrl: string;
        targetCount: number;
    } | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Google OAuth Status
    const [googleAuthUrl, setGoogleAuthUrl] = useState<string | null>(null);
    const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

    // Check Google Connection status
    useEffect(() => {
        async function checkGoogleStatus() {
            try {
                const res = await fetchApi("/data-requests/google-oauth/url");
                if (res.ok) {
                    const json = await res.json();
                    setGoogleAuthUrl(json.data?.authUrl || null);
                    setIsGoogleConnected(Boolean(json.data?.isConnected));
                }
            } catch (err) {
                console.warn("Failed to check Google OAuth status:", err);
            }
        }
        checkGoogleStatus();
    }, []);

    // Load available recipients tree
    useEffect(() => {
        async function loadRecipients() {
            setLoadingUnits(true);
            try {
                const res = await fetchApi("/programs/recipients-tree");
                if (res.ok) {
                    const json = await res.json();
                    setTreeData(json.data);

                    const actorTier = json.data?.actorTier || "FEDERAL";
                    if (actorTier === "FEDERAL") {
                        setTargetCategory("REGION");
                    } else if (actorTier === "REGION") {
                        setTargetCategory("ZONE");
                    } else if (actorTier === "ZONE") {
                        setTargetCategory("WOREDA");
                    } else {
                        setTargetCategory("SCHOOL");
                    }
                }
            } catch (err) {
                console.error("Failed to load hierarchy tree:", err);
            } finally {
                setLoadingUnits(false);
            }
        }
        loadRecipients();
    }, []);

    const actorTier = treeData?.actorTier || "FEDERAL";

    // Allowed target categories based on actor's jurisdictional level
    const allowedCategories = useMemo(() => {
        if (actorTier === "FEDERAL") return ["REGION", "ZONE", "WOREDA", "SCHOOL"] as const;
        if (actorTier === "REGION") return ["ZONE", "WOREDA", "SCHOOL"] as const;
        if (actorTier === "ZONE") return ["WOREDA", "SCHOOL"] as const;
        if (actorTier === "WOREDA") return ["SCHOOL"] as const;
        return ["SCHOOL"] as const;
    }, [actorTier]);

    // 1. Available Regions (Only for Federal)
    const availableRegions = useMemo(() => {
        if (!treeData || actorTier !== "FEDERAL") return [];
        if (treeData.regions) return treeData.regions;
        return (treeData.units || []).filter((u: any) => u.type === "REGION");
    }, [treeData, actorTier]);

    // 2. Available Zones (For Federal and Region)
    const availableZones = useMemo(() => {
        if (!treeData) return [];
        if (actorTier === "FEDERAL") {
            if (filterRegionId) {
                const r = (treeData.regions || []).find((reg: any) => reg.id === filterRegionId);
                return r?.children || [];
            }
            return (treeData.regions || []).flatMap((reg: any) => reg.children || []);
        }
        if (actorTier === "REGION") {
            return treeData.zones || (treeData.units || []).filter((u: any) => u.type === "ZONE");
        }
        return [];
    }, [treeData, actorTier, filterRegionId]);

    // 3. Available Woredas (For Federal, Region, and Zone)
    const availableWoredas = useMemo(() => {
        if (!treeData) return [];
        if (actorTier === "ZONE") {
            return treeData.woredas || (treeData.units || []).filter((u: any) => u.type === "WOREDA");
        }
        if (actorTier === "FEDERAL" || actorTier === "REGION") {
            if (filterZoneId) {
                const z = availableZones.find((zone: any) => zone.id === filterZoneId);
                return z?.children || [];
            }
            return availableZones.flatMap((z: any) => z.children || []);
        }
        return [];
    }, [treeData, actorTier, availableZones, filterZoneId]);

    // 4. Available Schools (For Federal, Region, Zone, Woreda)
    const availableSchools = useMemo(() => {
        if (!treeData) return [];
        if (actorTier === "WOREDA") {
            return treeData.schools || (treeData.units || []).filter((u: any) => u.type === "SCHOOL");
        }
        if (filterWoredaId) {
            const w = availableWoredas.find((woreda: any) => woreda.id === filterWoredaId);
            return w?.children || [];
        }
        if (availableWoredas.length > 0) {
            return availableWoredas.flatMap((w: any) => w.children || []);
        }
        if (treeData.schools) return treeData.schools;
        return (treeData.units || []).filter((u: any) => u.type === "SCHOOL");
    }, [treeData, actorTier, availableWoredas, filterWoredaId]);

    // Active displayed units based on current category tab
    const displayedUnits = useMemo(() => {
        let list: any[] = [];
        if (targetCategory === "REGION") list = availableRegions;
        else if (targetCategory === "ZONE") list = availableZones;
        else if (targetCategory === "WOREDA") list = availableWoredas;
        else if (targetCategory === "SCHOOL") list = availableSchools;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((u: any) => u.name.toLowerCase().includes(q) || (u.code && u.code.toLowerCase().includes(q)));
        }
        return list;
    }, [targetCategory, availableRegions, availableZones, availableWoredas, availableSchools, searchQuery]);

    // Unit Map for selected chips
    const unitMap = useMemo(() => {
        const map = new Map<string, { id: string; name: string; type: string }>();
        if (!treeData) return map;
        if (treeData.units) {
            for (const u of treeData.units) map.set(u.id, u);
        }
        const traverse = (items: any[]) => {
            for (const it of items) {
                map.set(it.id, { id: it.id, name: it.name, type: it.type });
                if (it.children) traverse(it.children);
            }
        };
        if (treeData.regions) traverse(treeData.regions);
        if (treeData.zones) traverse(treeData.zones);
        if (treeData.woredas) traverse(treeData.woredas);
        if (treeData.schools) traverse(treeData.schools);
        return map;
    }, [treeData]);

    const toggleUnitSelection = (id: string) => {
        setSelectedUnitIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const selectAllCurrentUnits = () => {
        const currentIds = displayedUnits.map((u: any) => u.id);
        const allSelected = currentIds.every((id: string) => selectedUnitIds.includes(id));

        if (allSelected) {
            setSelectedUnitIds((prev) => prev.filter((id) => !currentIds.includes(id)));
        } else {
            setSelectedUnitIds((prev) => Array.from(new Set([...prev, ...currentIds])));
        }
    };

    // Dynamic field manipulation
    const handleAddField = () => {
        const newField: FieldItem = {
            id: `f-${Date.now()}`,
            label: `New Question ${fields.length + 1}`,
            fieldType: "SHORT_TEXT",
            required: true,
            description: "",
            options: []
        };
        setFields((prev) => [...prev, newField]);
    };

    const handleRemoveField = (index: number) => {
        if (fields.length <= 1) {
            setError("At least one question is required for a Data Request.");
            return;
        }
        setFields((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFieldChange = (index: number, key: keyof FieldItem, value: any) => {
        setFields((prev) => {
            const copy = [...prev];
            const item = { ...copy[index]!, [key]: value };

            if (key === "rawOptionsInput" && typeof value === "string") {
                item.options = value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
            }
            copy[index] = item;
            return copy;
        });
    };

    const moveField = (index: number, direction: "up" | "down") => {
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;

        setFields((prev) => {
            const copy = [...prev];
            const temp = copy[index]!;
            copy[index] = copy[newIndex]!;
            copy[newIndex] = temp;
            return copy;
        });
    };

    // Handle Form Creation
    const handleCreateAndGenerateGoogleForm = async () => {
        setError(null);

        // Validation
        if (!title.trim()) {
            setError("Please provide a descriptive title for this Data Request.");
            return;
        }
        if (!objective.trim()) {
            setError("Please state the specific objective of this data collection.");
            return;
        }
        if (!startDate || !deadline) {
            setError("Please provide both the start date and the submission deadline.");
            return;
        }
        if (new Date(deadline) < new Date(startDate)) {
            setError("Submission deadline cannot be earlier than start date.");
            return;
        }

        // Validate fields
        for (let i = 0; i < fields.length; i++) {
            if (!fields[i]!.label.trim()) {
                setError(`Question #${i + 1} is missing a label.`);
                return;
            }
            if (
                (fields[i]!.fieldType === "SINGLE_SELECT" || fields[i]!.fieldType === "MULTI_SELECT") &&
                (!fields[i]!.options || fields[i]!.options.length < 2)
            ) {
                setError(`Question #${i + 1} (${fields[i]!.label}) requires at least 2 choices (comma-separated).`);
                return;
            }
        }

        if (targetScopeMode === "SPECIFIC" && selectedUnitIds.length === 0) {
            setError("Please select at least one target organization unit.");
            return;
        }

        setSubmitting(true);
        try {
            setProgressStatus("Saving Data Request in EduBridge...");

            // 1. Create Data Request in EduBridge
            const createPayload = {
                title: title.trim(),
                description: description.trim() || undefined,
                objective: objective.trim(),
                priority,
                startDate,
                deadline,
                instructions: instructions.trim() || undefined,
                requiredAction: requiredAction.trim() || undefined,
                targetScope: targetScopeMode === "ALL_DESK" ? "ALL_AUTHORIZED_DESCENDANTS" : "SELECTED_ORGANIZATIONS",
                targetUnitIds: targetScopeMode === "SPECIFIC" ? selectedUnitIds : undefined,
                fields: fields.map((f, idx) => ({
                    label: f.label.trim(),
                    fieldType: f.fieldType,
                    required: f.required,
                    description: f.description?.trim() || null,
                    options: f.options,
                    order: idx + 1
                }))
            };

            const createRes = await fetchApi("/data-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createPayload)
            });

            if (!createRes.ok) {
                const errJson = await createRes.json();
                throw new Error(errJson.message || "Failed to create Data Request");
            }

            const createdJson = await createRes.json();
            const requestId = createdJson.data?.id;

            setProgressStatus("Connecting to Google Forms API to generate form...");

            // 2. Trigger Google Form Generation
            const googleRes = await fetchApi(`/data-requests/${requestId}/google-form`, {
                method: "POST"
            });

            if (!googleRes.ok) {
                const errJson = await googleRes.json();
                throw new Error(errJson.message || "Failed to generate Google Form");
            }

            const googleJson = await googleRes.json();
            const responderUri = googleJson.data?.responderUri || `https://docs.google.com/forms/d/e/${requestId}/viewform`;
            const formUrl = googleJson.data?.formUrl || `https://docs.google.com/forms/d/${requestId}/edit`;

            setProgressStatus("Finalizing Data Request...");

            setSuccessData({
                id: requestId,
                title: title.trim(),
                googleResponderUri: responderUri,
                googleFormEditUrl: formUrl,
                targetCount: createdJson.data?.targets?.length || selectedUnitIds.length || 1
            });
        } catch (err: any) {
            console.error("Data Request creation failed:", err);
            setError(err.message || "Failed to create Data Request.");
        } finally {
            setSubmitting(false);
            setProgressStatus(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

    // Success Screen
    if (successData) {
        return (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-6 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-slate-900">Data Request & Google Form Created!</h2>
                    <p className="text-xs md:text-sm text-slate-500">
                        "{successData.title}" was published to {successData.targetCount} targeted unit(s).
                    </p>
                </div>

                {/* Live Form Link Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            Live Google Form Submission URL
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            Active
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={successData.googleResponderUri}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
                        />
                        <button
                            type="button"
                            onClick={() => copyToClipboard(successData.googleResponderUri)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Copy link"
                        >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <a
                            href={successData.googleResponderUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Public Form</span>
                        </a>

                        {successData.googleFormEditUrl && (
                            <a
                                href={successData.googleFormEditUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Edit Form in Google Drive</span>
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => onCreated ? onCreated(successData.id) : onBack?.()}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                        View Request Ledger & Responses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Data Requests</span>
                </button>
            </div>

            {/* Google OAuth Connection Status Card */}
            {!isGoogleConnected ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                            <span className="font-semibold text-amber-900">Google Account Authorization Required: </span>
                            <span className="text-amber-700">Connect your Google account to create live Google Forms.</span>
                        </div>
                    </div>
                    {googleAuthUrl && (
                        <a
                            href={googleAuthUrl}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Connect Google Account</span>
                        </a>
                    )}
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shadow-sm">
                    <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Google Forms API Connected & Ready</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        Authorized
                    </span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs font-medium text-red-800 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Section 1: Basic Information */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">1. Data Request Details</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Define the title, purpose, priority, and timeline for this request.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2026 National School ICT & Lab Equipment Survey"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-blue-500"
                            >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Submission Deadline <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Objective & Scope Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Describe what information is being gathered and why (e.g. Assessment for nationwide high school computer lab modernization)..."
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-blue-500 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Target Selection */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">2. Target Organizations & Recipients</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Choose subordinate units that must submit data.</p>
                </div>

                {/* Cascading Picker */}
                <div className="space-y-4">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                        {allowedCategories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                    setTargetCategory(cat);
                                    if (cat === "REGION") {
                                        setFilterRegionId("");
                                        setFilterZoneId("");
                                        setFilterWoredaId("");
                                    } else if (cat === "ZONE") {
                                        setFilterZoneId("");
                                        setFilterWoredaId("");
                                    } else if (cat === "WOREDA") {
                                        setFilterWoredaId("");
                                    }
                                }}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    targetCategory === cat
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                {cat}s
                            </button>
                        ))}
                    </div>

                    {/* Hierarchy Parent Filters */}
                    {(() => {
                        const showRegionFilter = actorTier === "FEDERAL" && targetCategory !== "REGION";
                        const showZoneFilter = (actorTier === "FEDERAL" || actorTier === "REGION") && (targetCategory === "WOREDA" || targetCategory === "SCHOOL");
                        const showWoredaFilter = targetCategory === "SCHOOL" && (actorTier === "FEDERAL" || actorTier === "REGION" || actorTier === "ZONE");

                        if (!showRegionFilter && !showZoneFilter && !showWoredaFilter) return null;

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                {showRegionFilter && (
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Region</label>
                                        <select
                                            value={filterRegionId}
                                            onChange={(e) => {
                                                setFilterRegionId(e.target.value);
                                                setFilterZoneId("");
                                                setFilterWoredaId("");
                                            }}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 shadow-2xs"
                                        >
                                            <option value="">All Regions</option>
                                            {availableRegions.map((r: any) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {showZoneFilter && (
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Zone</label>
                                        <select
                                            value={filterZoneId}
                                            onChange={(e) => {
                                                setFilterZoneId(e.target.value);
                                                setFilterWoredaId("");
                                            }}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 shadow-2xs"
                                        >
                                            <option value="">All Zones</option>
                                            {availableZones.map((z: any) => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {showWoredaFilter && (
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Woreda</label>
                                        <select
                                            value={filterWoredaId}
                                            onChange={(e) => setFilterWoredaId(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 shadow-2xs"
                                        >
                                            <option value="">All Woredas</option>
                                            {availableWoredas.map((w: any) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Search and Action Bar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search ${targetCategory.toLowerCase()}s...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={selectAllCurrentUnits}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Select/Deselect All in List
                            </button>
                            <span className="text-xs text-slate-500 font-medium">
                                ({selectedUnitIds.length} total selected)
                            </span>
                        </div>
                    </div>

                    {/* Units Grid */}
                    <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto p-2 bg-slate-50/50">
                        {loadingUnits ? (
                            <div className="p-8 text-center text-xs text-slate-500">Loading units...</div>
                        ) : displayedUnits.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">No units match the filter</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {displayedUnits.map((u: any) => {
                                    const isSelected = selectedUnitIds.includes(u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => toggleUnitSelection(u.id)}
                                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                                isSelected
                                                    ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-2xs"
                                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                            }`}
                                        >
                                            <span className="truncate pr-2">{u.name}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 3: Dynamic Questions Builder */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">3. Form Questions Schema ({fields.length})</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Build questions for your Google Form. Questions map directly into the live form.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddField}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {fields.map((f, index) => (
                        <div
                            key={f.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800">
                                    Question #{index + 1}
                                </span>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => moveField(index, "up")}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Move up"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === fields.length - 1}
                                        onClick={() => moveField(index, "down")}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Move down"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveField(index)}
                                        className="p-1 text-red-500 hover:text-red-700 ml-1"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Question Title *</label>
                                    <input
                                        type="text"
                                        value={f.label}
                                        onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                                        placeholder="e.g. Total student computer ratio"
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Question Type</label>
                                    <select
                                        value={f.fieldType}
                                        onChange={(e) => handleFieldChange(index, "fieldType", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                    >
                                        <option value="SHORT_TEXT">Short Text</option>
                                        <option value="LONG_TEXT">Paragraph / Long Text</option>
                                        <option value="NUMBER">Number</option>
                                        <option value="YES_NO">Yes / No</option>
                                        <option value="DATE">Date</option>
                                        <option value="SINGLE_SELECT">Multiple Choice (Single)</option>
                                        <option value="MULTI_SELECT">Checkboxes (Multiple)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hint / Description (Optional)</label>
                                <input
                                    type="text"
                                    value={f.description}
                                    onChange={(e) => handleFieldChange(index, "description", e.target.value)}
                                    placeholder="e.g. Specify count of working devices as of this week"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                />
                            </div>

                            {(f.fieldType === "SINGLE_SELECT" || f.fieldType === "MULTI_SELECT") && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Options (comma separated) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={f.rawOptionsInput ?? f.options.join(", ")}
                                        onChange={(e) => handleFieldChange(index, "rawOptionsInput", e.target.value)}
                                        placeholder="Good, Fair, Poor, Critical"
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id={`req-${f.id}`}
                                    checked={f.required}
                                    onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <label htmlFor={`req-${f.id}`} className="text-xs text-slate-700 font-medium cursor-pointer">
                                    Required question
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={handleCreateAndGenerateGoogleForm}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs md:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{progressStatus || "Creating..."}</span>
                        </>
                    ) : (
                        <>
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Create & Generate Google Form</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
