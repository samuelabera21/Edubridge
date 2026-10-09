"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    ArrowLeft,
    Send,
    UploadCloud,
    Image as ImageIcon,
    FileText,
    X,
    CheckCircle2,
    AlertCircle,
    Building2,
    MapPin,
    School,
    Loader2
} from "lucide-react";
import SearchableSelect, { SearchableOption } from "../ui/SearchableSelect";

export interface FederalSchoolItem {
    id: string;
    name: string;
}

export interface FederalWoredaItem {
    id: string;
    name: string;
    schools: FederalSchoolItem[];
}

export interface FederalZoneItem {
    id: string;
    name: string;
    woredas: FederalWoredaItem[];
}

export interface FederalRegionItem {
    id: string;
    name: string;
    zones: FederalZoneItem[];
}

export interface FederalHierarchyTree {
    federalId: string;
    federalName: string;
    regions: FederalRegionItem[];
}

interface DirectivesPublishViewProps {
    onBack?: () => void;
    onPublished?: () => void;
}

export default function DirectivesPublishView({ onBack, onPublished }: DirectivesPublishViewProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [title, setTitle] = useState("");
    const [targetType, setTargetType] = useState<
        "ALL" | "ALL_REGIONS" | "SPECIFIC_REGION" | "ALL_ZONES" | "SPECIFIC_ZONE" | "ALL_WOREDAS" | "SPECIFIC_WOREDA" | "ALL_SCHOOLS" | "SPECIFIC_SCHOOL"
    >("ALL");

    // Dynamic Cascade Selections
    const [selectedRegionId, setSelectedRegionId] = useState("");
    const [selectedZoneId, setSelectedZoneId] = useState("");
    const [selectedWoredaId, setSelectedWoredaId] = useState("");
    const [selectedSchoolId, setSelectedSchoolId] = useState("");

    // Dates
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");

    // Content
    const [content, setContent] = useState("");

    // Attachment
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachmentName, setAttachmentName] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isAcknowledgmentRequired, setIsAcknowledgmentRequired] = useState(true);

    // Hierarchy data
    const [hierarchy, setHierarchy] = useState<FederalHierarchyTree | null>(null);
    const [loadingHierarchy, setLoadingHierarchy] = useState(true);

    // Submission & Confirmation
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successReceipt, setSuccessReceipt] = useState<{
        title: string;
        recipientsCount: number;
        notificationsCount: number;
    } | null>(null);

    // Load nationwide hierarchy tree
    useEffect(() => {
        async function loadHierarchy() {
            setLoadingHierarchy(true);
            try {
                const res = await fetchApi("/directives/recipients-tree");
                if (res.ok) {
                    const payload = await res.json();
                    if (payload.data) {
                        setHierarchy(payload.data);
                    }
                }
            } catch (err) {
                console.error("Error loading federal recipient hierarchy:", err);
            } finally {
                setLoadingHierarchy(false);
            }
        }
        loadHierarchy();
    }, []);

    // Filter available zones, woredas, schools based on selection
    const availableZones = useMemo(() => {
        if (!hierarchy?.regions || !selectedRegionId) return [];
        const reg = hierarchy.regions.find(r => r.id === selectedRegionId);
        return reg?.zones || [];
    }, [hierarchy, selectedRegionId]);

    const availableWoredas = useMemo(() => {
        if (!availableZones.length || !selectedZoneId) return [];
        const zone = availableZones.find(z => z.id === selectedZoneId);
        return zone?.woredas || [];
    }, [availableZones, selectedZoneId]);

    const availableSchools = useMemo(() => {
        if (!availableWoredas.length || !selectedWoredaId) return [];
        const woreda = availableWoredas.find(w => w.id === selectedWoredaId);
        return woreda?.schools || [];
    }, [availableWoredas, selectedWoredaId]);

    // Searchable Select Options
    const regionOptions: SearchableOption[] = useMemo(() => {
        if (!hierarchy?.regions) return [];
        return hierarchy.regions.map(r => ({
            value: r.id,
            label: r.name,
            badge: `${r.zones.length} zones`
        }));
    }, [hierarchy]);

    const zoneOptions: SearchableOption[] = useMemo(() => {
        if (!availableZones) return [];
        return availableZones.map(z => ({
            value: z.id,
            label: z.name,
            badge: `${z.woredas.length} woredas`
        }));
    }, [availableZones]);

    const woredaOptions: SearchableOption[] = useMemo(() => {
        if (!availableWoredas) return [];
        return availableWoredas.map(w => ({
            value: w.id,
            label: w.name,
            badge: `${w.schools.length} schools`
        }));
    }, [availableWoredas]);

    const schoolOptions: SearchableOption[] = useMemo(() => {
        if (!availableSchools) return [];
        return availableSchools.map(s => ({
            value: s.id,
            label: s.name,
            badge: "School"
        }));
    }, [availableSchools]);

    // MinIO File Upload Handler (Supports PDF, JPG, PNG)
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
                    folder: "announcements"
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

    // Form Submission
    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Please enter a directive/announcement title.");
            return;
        }
        if (!content.trim()) {
            setError("Please write the directive details and mandates.");
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
            setError("Please select Region and Zone to target all Woredas.");
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

        try {
            setSubmitting(true);

            let targetLevelAll = false;
            let targetLevels: string[] = [];
            let targetOrganizationUnitIds: string[] = [];
            let cascadeDescendants = false;

            if (targetType === "ALL") {
                targetLevelAll = true;
                targetLevels = []; // All jurisdictions nationwide
                targetOrganizationUnitIds = [];
                cascadeDescendants = true;
            } else if (targetType === "ALL_REGIONS") {
                targetLevelAll = true;
                targetLevels = ["REGION"];
                cascadeDescendants = false;
            } else if (targetType === "SPECIFIC_REGION") {
                targetOrganizationUnitIds = [selectedRegionId];
                targetLevels = ["REGION"];
                cascadeDescendants = false; // Deliver to THAT EXACT REGION ONLY
            } else if (targetType === "ALL_ZONES") {
                const reg = hierarchy?.regions.find(r => r.id === selectedRegionId);
                targetOrganizationUnitIds = reg?.zones.map(z => z.id) || [];
                targetLevels = ["ZONE"];
                cascadeDescendants = false;
            } else if (targetType === "SPECIFIC_ZONE") {
                targetOrganizationUnitIds = [selectedZoneId];
                targetLevels = ["ZONE"];
                cascadeDescendants = false; // Deliver to THAT EXACT ZONE ONLY
            } else if (targetType === "ALL_WOREDAS") {
                const reg = hierarchy?.regions.find(r => r.id === selectedRegionId);
                const zone = reg?.zones.find(z => z.id === selectedZoneId);
                targetOrganizationUnitIds = zone?.woredas.map(w => w.id) || [];
                targetLevels = ["WOREDA"];
                cascadeDescendants = false;
            } else if (targetType === "SPECIFIC_WOREDA") {
                targetOrganizationUnitIds = [selectedWoredaId];
                targetLevels = ["WOREDA"];
                cascadeDescendants = false; // Deliver to THAT EXACT WOREDA ONLY
            } else if (targetType === "ALL_SCHOOLS") {
                const reg = hierarchy?.regions.find(r => r.id === selectedRegionId);
                const zone = reg?.zones.find(z => z.id === selectedZoneId);
                const woreda = zone?.woredas.find(w => w.id === selectedWoredaId);
                targetOrganizationUnitIds = woreda?.schools.map(s => s.id) || [];
                targetLevels = ["SCHOOL"];
                cascadeDescendants = false;
            } else if (targetType === "SPECIFIC_SCHOOL") {
                targetOrganizationUnitIds = [selectedSchoolId];
                targetLevels = ["SCHOOL"];
                cascadeDescendants = false; // Deliver to THAT EXACT SCHOOL ONLY
            }

            const payload = {
                title: title.trim(),
                content: content.trim(),
                type: "DIRECTIVE",
                priority: "NORMAL",
                issueDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
                effectiveDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
                deadline: endDate ? new Date(endDate).toISOString() : undefined,
                targetLevelAll,
                targetLevels,
                targetOrganizationUnitIds,
                cascadeDescendants,
                attachmentUrl: attachmentUrl.trim() || undefined,
                attachmentName: attachmentName.trim() || undefined,
                isAcknowledgmentRequired
            };

            const res = await fetchApi("/directives", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setSuccessReceipt({
                    title: title.trim(),
                    recipientsCount: data.data?.recipientsCount || 0,
                    notificationsCount: data.data?.notificationsCount || 0
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.message || "Failed to publish directive/announcement.");
            }
        } catch (err: any) {
            console.error("Error publishing federal directive:", err);
            setError("A network error occurred while publishing.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-6 px-4 font-sans text-slate-800">
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">Publish National Policy or Directive</h1>
                        <p className="text-xs text-slate-500">Send an official policy, directive, or announcement across the education hierarchy.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{submitting ? "Publishing..." : "Publish Directive"}</span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Main Clean Form Card */}
            <form onSubmit={handlePublish} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                {/* 1. Target Audience Hierarchy Selection */}
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
                                Select Region <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={regionOptions}
                                value={selectedRegionId}
                                onChange={(val) => setSelectedRegionId(val)}
                                placeholder="-- Choose or Search Region --"
                                searchPlaceholder="Type region name..."
                            />
                        </div>
                    )}

                    {/* Drill-down: All Zones in Region */}
                    {targetType === "ALL_ZONES" && (
                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Select Parent Region <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={regionOptions}
                                value={selectedRegionId}
                                onChange={(val) => setSelectedRegionId(val)}
                                placeholder="-- Choose or Search Region --"
                                searchPlaceholder="Type region name..."
                            />
                        </div>
                    )}

                    {/* Drill-down: Specific Zone (Searchable Region -> Zone) */}
                    {targetType === "SPECIFIC_ZONE" && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    1. Select Region <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={regionOptions}
                                    value={selectedRegionId}
                                    onChange={(val) => {
                                        setSelectedRegionId(val);
                                        setSelectedZoneId("");
                                    }}
                                    placeholder="-- Search Region --"
                                    searchPlaceholder="Type region name..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    2. Select Zone <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={!selectedRegionId}
                                    onChange={(val) => setSelectedZoneId(val)}
                                    placeholder={selectedRegionId ? "-- Search Zone --" : "-- Choose Region First --"}
                                    searchPlaceholder="Type zone name..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: All Woredas in Zone */}
                    {targetType === "ALL_WOREDAS" && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    1. Select Region <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={regionOptions}
                                    value={selectedRegionId}
                                    onChange={(val) => {
                                        setSelectedRegionId(val);
                                        setSelectedZoneId("");
                                    }}
                                    placeholder="-- Search Region --"
                                    searchPlaceholder="Type region name..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    2. Select Parent Zone <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={!selectedRegionId}
                                    onChange={(val) => setSelectedZoneId(val)}
                                    placeholder={selectedRegionId ? "-- Search Zone --" : "-- Choose Region First --"}
                                    searchPlaceholder="Type zone name..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific Woreda (Searchable Region -> Zone -> Woreda) */}
                    {targetType === "SPECIFIC_WOREDA" && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    1. Select Region <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={regionOptions}
                                    value={selectedRegionId}
                                    onChange={(val) => {
                                        setSelectedRegionId(val);
                                        setSelectedZoneId("");
                                        setSelectedWoredaId("");
                                    }}
                                    placeholder="-- Search Region --"
                                    searchPlaceholder="Type region name..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    2. Select Zone <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={!selectedRegionId}
                                    onChange={(val) => {
                                        setSelectedZoneId(val);
                                        setSelectedWoredaId("");
                                    }}
                                    placeholder={selectedRegionId ? "-- Search Zone --" : "-- Choose Region First --"}
                                    searchPlaceholder="Type zone name..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    3. Select Woreda <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={woredaOptions}
                                    value={selectedWoredaId}
                                    disabled={!selectedZoneId}
                                    onChange={(val) => setSelectedWoredaId(val)}
                                    placeholder={selectedZoneId ? "-- Search Woreda --" : "-- Choose Zone First --"}
                                    searchPlaceholder="Type woreda name..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: All Schools in Woreda */}
                    {targetType === "ALL_SCHOOLS" && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    1. Select Region <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={regionOptions}
                                    value={selectedRegionId}
                                    onChange={(val) => {
                                        setSelectedRegionId(val);
                                        setSelectedZoneId("");
                                        setSelectedWoredaId("");
                                    }}
                                    placeholder="-- Search Region --"
                                    searchPlaceholder="Type region name..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    2. Select Zone <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={!selectedRegionId}
                                    onChange={(val) => {
                                        setSelectedZoneId(val);
                                        setSelectedWoredaId("");
                                    }}
                                    placeholder={selectedRegionId ? "-- Search Zone --" : "-- Choose Region First --"}
                                    searchPlaceholder="Type zone name..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    3. Select Parent Woreda <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={woredaOptions}
                                    value={selectedWoredaId}
                                    disabled={!selectedZoneId}
                                    onChange={(val) => setSelectedWoredaId(val)}
                                    placeholder={selectedZoneId ? "-- Search Woreda --" : "-- Choose Zone First --"}
                                    searchPlaceholder="Type woreda name..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific School (4-level Searchable Cascade) */}
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
                                    placeholder="-- Zone --"
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
                                    placeholder="-- Woreda --"
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
                                    placeholder="-- School --"
                                    searchPlaceholder="Type school..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Directive Title */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                        Directive / Policy Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., National STEM Curriculum Rollout & Examination Guidelines"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium"
                    />
                </div>

                {/* 3. Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Compliance Deadline (Optional)</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
                        />
                    </div>
                </div>

                {/* 4. Attachment (Image or PDF via MinIO) */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Attachment (Image or PDF)
                    </label>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {!attachmentUrl ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                            >
                                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-blue-600" />}
                                <span>{uploadingFile ? "Uploading to storage..." : "Choose Image or PDF File"}</span>
                            </button>
                            <span className="text-2xs text-slate-400">PDF, JPG, or PNG (auto-stored via MinIO)</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {attachmentName.toLowerCase().endsWith(".pdf") ? (
                                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                                ) : (
                                    <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                )}
                                <span className="truncate font-medium text-slate-800">{attachmentName || "Attached Document"}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setAttachmentUrl("");
                                    setAttachmentName("");
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Remove file"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* 5. Directive Details Content */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                        Directive Content & Mandate Body <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        required
                        rows={5}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write the official directive mandate instructions, statutory compliance guidelines, and implementation rules..."
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                </div>

                {/* 6. Acknowledgment & Status Confirmation Toggle */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                    <input
                        type="checkbox"
                        id="requireAckToggleFederal"
                        checked={isAcknowledgmentRequired}
                        onChange={(e) => setIsAcknowledgmentRequired(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="requireAckToggleFederal" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                        Track Delivery & Require Recipient Confirmation
                        <span className="block text-2xs font-normal text-slate-500 mt-0.5">
                            Recipients receive an interactive &quot;Confirm Receipt&quot; prompt, and live delivery status (Seen / Read / Confirmed) will appear on your directive ledger.
                        </span>
                    </label>
                </div>

                {/* 7. Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || uploadingFile}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>{submitting ? "Publishing..." : "Publish Directive"}</span>
                    </button>
                </div>
            </form>

            {/* Success Modal */}
            {successReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="w-full max-w-sm rounded-xl border border-slate-100 bg-white p-5 shadow-xl space-y-3.5 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Directive Published!</h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                                &quot;{successReceipt.title}&quot; has been published to {successReceipt.recipientsCount} recipient units.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessReceipt(null);
                                    setTitle("");
                                    setContent("");
                                    setAttachmentUrl("");
                                    setAttachmentName("");
                                    setSelectedRegionId("");
                                    setSelectedZoneId("");
                                    setSelectedWoredaId("");
                                    setSelectedSchoolId("");
                                }}
                                className="flex-1 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                                Publish Another
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessReceipt(null);
                                    if (onPublished) onPublished();
                                    else if (onBack) onBack();
                                    else router.push("/dashboard/federal?tab=directives");
                                }}
                                className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs cursor-pointer"
                            >
                                View in Registry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
