"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import {
    FileSpreadsheet,
    Upload,
    Download,
    ExternalLink,
    Search,
    Filter,
    RefreshCw,
    Eye,
    Trash2,
    Calendar,
    GraduationCap,
    BookOpen,
    Users,
    CheckCircle2,
    Award,
    TrendingUp,
    AlertCircle,
    X,
    FileText,
    Copy,
    Check
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

interface AcademicYearOption {
    id: string;
    name: string;
    status: string;
}

interface GradeOption {
    id: string;
    name: string;
    sections: Array<{ id: string; name: string }>;
}

interface SubjectOption {
    id: string;
    name: string;
    code: string;
}

interface ResultSheetItem {
    id: string;
    title: string;
    fileName: string;
    schoolGradeId?: string;
    gradeName: string;
    sectionId?: string;
    sectionName: string;
    subjectId?: string;
    subjectName: string;
    subjectCode?: string;
    teacherName: string;
    submittedAt: string;
    totalStudents: number;
    averageScore: number;
    passRate: number;
    maxScore?: number;
    passingScore?: number;
    columnsCount: number;
    columns: string[];
}

interface SheetDetailData extends ResultSheetItem {
    rows: Array<Record<string, any>>;
}

export default function ResultsDashboardPage() {
    const { authData } = useAuth();

    // Data State
    const [sheets, setSheets] = useState<ResultSheetItem[]>([]);
    const [filterOptions, setFilterOptions] = useState<{
        activeAcademicYear: AcademicYearOption | null;
        academicYears: AcademicYearOption[];
        grades: GradeOption[];
        subjects: SubjectOption[];
    }>({
        activeAcademicYear: null,
        academicYears: [],
        grades: [],
        subjects: []
    });

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Active Filters
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Inspect Sheet Drawer State
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    const [sheetDetail, setSheetDetail] = useState<SheetDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
    const [drawerSearch, setDrawerSearch] = useState<string>("");
    const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
    const [parsedData, setParsedData] = useState<{
        fileName: string;
        columns: string[];
        rows: Array<Record<string, any>>;
    } | null>(null);
    const [importTitle, setImportTitle] = useState<string>("");
    const [importGradeId, setImportGradeId] = useState<string>("");
    const [importSectionId, setImportSectionId] = useState<string>("");
    const [importSubjectId, setImportSubjectId] = useState<string>("");
    const [isSubmittingImport, setIsSubmittingImport] = useState<boolean>(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        loadFilterOptions();
    }, []);

    useEffect(() => {
        if (filterOptions.activeAcademicYear) {
            loadSheets();
        }
    }, [selectedYearId, selectedGradeId, selectedSectionId, selectedSubjectId, filterOptions.activeAcademicYear]);

    const loadFilterOptions = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchApi("/assessment/admin/filters");
            if (!res.ok) throw new Error("Failed to load filter options");
            const data = await res.json();
            setFilterOptions(data);

            if (data.activeAcademicYear) {
                setSelectedYearId(data.activeAcademicYear.id);
            }
        } catch (err: any) {
            console.error("Filter options loading error:", err);
            setError(err.message || "Failed to initialize Results portal");
        } finally {
            setLoading(false);
        }
    };

    const loadSheets = async () => {
        try {
            setError(null);
            const params = new URLSearchParams();
            if (selectedYearId) params.append("academicYearId", selectedYearId);
            if (selectedGradeId) params.append("schoolGradeId", selectedGradeId);
            if (selectedSectionId) params.append("sectionId", selectedSectionId);
            if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());

            const res = await fetchApi(`/assessment/sheets?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load result sheets");
            const data = await res.json();
            setSheets(data);
        } catch (err: any) {
            console.error("Sheets loading error:", err);
            setError(err.message || "Failed to load marksheets");
        }
    };

    // Load Sheet Detail for Inspection
    const openSheetDetail = async (id: string) => {
        setSelectedSheetId(id);
        setSheetDetail(null);
        setDrawerSearch("");
        setLoadingDetail(true);
        try {
            const res = await fetchApi(`/assessment/sheets/${id}`);
            if (!res.ok) throw new Error("Failed to load sheet details");
            const data = await res.json();
            setSheetDetail(data);
        } catch (err: any) {
            console.error("Sheet detail error:", err);
            alert("Failed to load sheet data: " + err.message);
            setSelectedSheetId(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Delete Sheet
    const handleDeleteSheet = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete the result marksheet "${title}"?`)) {
            return;
        }
        try {
            const res = await fetchApi(`/assessment/sheets/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete sheet");
            if (selectedSheetId === id) {
                setSelectedSheetId(null);
                setSheetDetail(null);
            }
            loadSheets();
        } catch (err: any) {
            alert("Failed to delete result sheet: " + err.message);
        }
    };

    // External Excel Open / Download Handler
    const openSheetInExcelExternally = (sheet: ResultSheetItem | SheetDetailData, fullRows?: Array<Record<string, any>>) => {
        try {
            const rowsToExport = fullRows || (sheet as SheetDetailData).rows || [];
            
            let worksheet: XLSX.WorkSheet;
            if (rowsToExport.length > 0) {
                worksheet = XLSX.utils.json_to_sheet(rowsToExport);
            } else {
                worksheet = XLSX.utils.aoa_to_sheet([
                    ["Result Sheet Title", sheet.title],
                    ["Grade & Section", `${sheet.gradeName} - ${sheet.sectionName}`],
                    ["Subject", sheet.subjectName],
                    ["Teacher", sheet.teacherName],
                    ["Total Students", sheet.totalStudents],
                    ["Average Score", `${sheet.averageScore}%`],
                    ["Pass Rate", `${sheet.passRate}%`],
                    ["Submission Date", new Date(sheet.submittedAt).toLocaleDateString()]
                ]);
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Student Results");

            const safeName = (sheet.title || "Results").replace(/[^a-zA-Z0-9_-]/g, "_");
            const filename = `${safeName}_${sheet.gradeName.replace(/\s+/g, "")}.xlsx`;

            // Triggers binary download which Windows/macOS automatically opens with Microsoft Excel desktop
            XLSX.writeFile(workbook, filename);
        } catch (err: any) {
            console.error("Excel generation error:", err);
            alert("Could not launch Excel file: " + err.message);
        }
    };

    // Direct External Excel launch from table row
    const handleDirectExcelOpen = async (sheet: ResultSheetItem) => {
        try {
            const res = await fetchApi(`/assessment/sheets/${sheet.id}`);
            if (res.ok) {
                const detail: SheetDetailData = await res.json();
                openSheetInExcelExternally(detail, detail.rows);
            } else {
                openSheetInExcelExternally(sheet);
            }
        } catch {
            openSheetInExcelExternally(sheet);
        }
    };

    // File Upload Parser (Accepts ANY Excel file structure)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportError(null);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const buffer = evt.target?.result;
                const workbook = XLSX.read(buffer, { type: "binary", cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    throw new Error("The uploaded Excel workbook contains no readable sheets.");
                }

                const worksheet = workbook.Sheets[firstSheetName];
                // Read sheet as JSON with raw values
                const jsonData: Array<Record<string, any>> = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (jsonData.length === 0) {
                    throw new Error("No data rows detected in the uploaded sheet.");
                }

                // Dynamically read ALL column keys from all rows to preserve full fidelity
                const colSet = new Set<string>();
                jsonData.forEach(row => {
                    Object.keys(row).forEach(k => {
                        if (k && !k.startsWith("__EMPTY")) {
                            colSet.add(k);
                        }
                    });
                });

                const cols = Array.from(colSet);
                if (cols.length === 0) {
                    throw new Error("No valid column headers found in sheet.");
                }

                setParsedData({
                    fileName: file.name,
                    columns: cols,
                    rows: jsonData
                });

                // Auto-populate Title from filename
                const baseTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                setImportTitle(baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1));
            } catch (err: any) {
                console.error("Excel parse error:", err);
                setImportError(err.message || "Failed to parse the selected Excel file.");
                setParsedData(null);
            }
        };

        reader.onerror = () => {
            setImportError("Error reading the Excel file from disk.");
            setParsedData(null);
        };

        reader.readAsBinaryString(file);
    };

    // Submit Imported Sheet
    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parsedData || !importTitle.trim()) {
            setImportError("Please provide a sheet title and select an Excel file.");
            return;
        }

        setIsSubmittingImport(true);
        setImportError(null);

        try {
            const payload = {
                title: importTitle.trim(),
                fileName: parsedData.fileName,
                academicYearId: selectedYearId || filterOptions.activeAcademicYear?.id,
                schoolGradeId: importGradeId || undefined,
                sectionId: importSectionId || undefined,
                subjectId: importSubjectId || undefined,
                columns: parsedData.columns,
                rows: parsedData.rows
            };

            const res = await fetchApi("/assessment/import-sheet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to import result sheet");
            }

            setImportSuccessMsg(`Result sheet "${importTitle}" imported successfully (${parsedData.rows.length} student rows).`);
            setIsImportModalOpen(false);
            setParsedData(null);
            setImportTitle("");
            setImportGradeId("");
            setImportSectionId("");
            setImportSubjectId("");
            loadSheets();

            setTimeout(() => setImportSuccessMsg(null), 6000);
        } catch (err: any) {
            setImportError(err.message || "Failed to import sheet.");
        } finally {
            setIsSubmittingImport(false);
        }
    };

    // Copy Drawer Table Data as Tab-separated values
    const handleCopyTableData = () => {
        if (!sheetDetail || !sheetDetail.rows.length) return;
        try {
            const headerLine = sheetDetail.columns.join("\t");
            const dataLines = sheetDetail.rows.map(row => 
                sheetDetail.columns.map(col => String(row[col] ?? "")).join("\t")
            );
            const textToCopy = [headerLine, ...dataLines].join("\n");
            navigator.clipboard.writeText(textToCopy);
            setCopiedSuccess(true);
            setTimeout(() => setCopiedSuccess(false), 2500);
        } catch (err) {
            console.error("Clipboard copy error:", err);
        }
    };

    // Filtered sheets
    const filteredSheets = useMemo(() => {
        if (!searchQuery.trim()) return sheets;
        const q = searchQuery.toLowerCase();
        return sheets.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.fileName.toLowerCase().includes(q) ||
            s.gradeName.toLowerCase().includes(q) ||
            s.sectionName.toLowerCase().includes(q) ||
            s.subjectName.toLowerCase().includes(q) ||
            s.teacherName.toLowerCase().includes(q)
        );
    }, [sheets, searchQuery]);

    // Available sections for chosen grade in filters
    const availableSections = useMemo(() => {
        if (!selectedGradeId) return [];
        const found = filterOptions.grades.find(g => g.id === selectedGradeId);
        return found ? found.sections : [];
    }, [selectedGradeId, filterOptions.grades]);

    // Available sections for chosen grade in import modal
    const importAvailableSections = useMemo(() => {
        if (!importGradeId) return [];
        const found = filterOptions.grades.find(g => g.id === importGradeId);
        return found ? found.sections : [];
    }, [importGradeId, filterOptions.grades]);

    // Summary KPIs
    const kpiSummary = useMemo(() => {
        const totalSheets = sheets.length;
        const totalStudents = sheets.reduce((acc, s) => acc + s.totalStudents, 0);
        const avgScore = sheets.length > 0
            ? Math.round((sheets.reduce((acc, s) => acc + s.averageScore, 0) / sheets.length) * 10) / 10
            : 0;
        const passRate = sheets.length > 0
            ? Math.round((sheets.reduce((acc, s) => acc + s.passRate, 0) / sheets.length) * 10) / 10
            : 0;

        return { totalSheets, totalStudents, avgScore, passRate };
    }, [sheets]);

    // Drawer Rows Filtered by Search
    const drawerFilteredRows = useMemo(() => {
        if (!sheetDetail) return [];
        if (!drawerSearch.trim()) return sheetDetail.rows;
        const q = drawerSearch.toLowerCase();
        return sheetDetail.rows.filter(row =>
            Object.values(row).some(val => String(val).toLowerCase().includes(q))
        );
    }, [sheetDetail, drawerSearch]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#4085b3] uppercase tracking-wider mb-1">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Academic Records Oversight</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Student Results
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Import, monitor, and inspect student marksheets across grades and sections with external Excel access.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        onClick={() => {
                            setImportError(null);
                            setParsedData(null);
                            setImportTitle("");
                            setIsImportModalOpen(true);
                        }}
                        className="bg-[#4085b3] hover:bg-[#35729c] text-white shadow-xs font-semibold px-4 py-2 text-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Import Results (Excel)</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={loadSheets}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 p-2 cursor-pointer transition-colors"
                        title="Refresh marksheets"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Success Notification */}
            {importSuccessMsg && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-[#4085b3] flex items-center justify-between text-sm shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="font-semibold">{importSuccessMsg}</span>
                    </div>
                    <button
                        onClick={() => setImportSuccessMsg(null)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Executive KPI Overview Strip (Zero green, brand blue & slates) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Result Marksheets
                            </span>
                            <div className="p-2 rounded-lg bg-blue-50 text-[#4085b3]">
                                <FileSpreadsheet className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{kpiSummary.totalSheets}</span>
                            <span className="text-xs text-slate-500">submitted</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Students Graded
                            </span>
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{kpiSummary.totalStudents}</span>
                            <span className="text-xs text-slate-500">records</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Average Score
                            </span>
                            <div className="p-2 rounded-lg bg-blue-50 text-[#4085b3]">
                                <Award className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{kpiSummary.avgScore}%</span>
                            <span className="text-xs text-slate-500">school-wide</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Passing Rate
                            </span>
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{kpiSummary.passRate}%</span>
                            <span className="text-xs text-slate-500">at or above pass mark</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                placeholder="Search sheets, subjects, teachers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 placeholder-slate-400 transition"
                            />
                        </div>

                        {/* Academic Year */}
                        <div>
                            <select
                                value={selectedYearId}
                                onChange={(e) => setSelectedYearId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition"
                            >
                                <option value="">All Academic Years</option>
                                {filterOptions.academicYears.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} {y.status === "ACTIVE" ? "(Current)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Grade Level */}
                        <div>
                            <select
                                value={selectedGradeId}
                                onChange={(e) => {
                                    setSelectedGradeId(e.target.value);
                                    setSelectedSectionId("");
                                }}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition"
                            >
                                <option value="">All Grade Levels</option>
                                {filterOptions.grades.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Section */}
                        <div>
                            <select
                                value={selectedSectionId}
                                onChange={(e) => setSelectedSectionId(e.target.value)}
                                disabled={!selectedGradeId || availableSections.length === 0}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">All Sections</option>
                                {availableSections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject */}
                        <div>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition"
                            >
                                <option value="">All Subjects</option>
                                {filterOptions.subjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.name} {sub.code ? `(${sub.code})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table Card */}
            <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-200 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900">
                            Submitted Result Marksheets
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Showing {filteredSheets.length} marksheets. Click &apos;View Data&apos; for complete multi-column tables or &apos;Open in Excel&apos; for external launch.
                        </p>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#4085b3] border border-blue-200">
                        {filteredSheets.length} {filteredSheets.length === 1 ? "sheet" : "sheets"}
                    </span>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-16">
                            <LoadingState message="Loading student result sheets..." />
                        </div>
                    ) : error ? (
                        <div className="p-6">
                            <ErrorState message={error} onRetry={loadSheets} />
                        </div>
                    ) : filteredSheets.length === 0 ? (
                        <div className="py-16 px-4">
                            <EmptyState
                                icon={<FileSpreadsheet className="h-10 w-10 text-[#4085b3] mb-3" />}
                                title="No Result Marksheets Found"
                                message="No student result sheets have been imported yet. Teachers or administrators can import any Excel marksheet file to get started."
                            />
                            <div className="flex justify-center mt-4">
                                <Button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="bg-[#4085b3] hover:bg-[#35729c] text-white shadow-xs font-semibold text-sm cursor-pointer"
                                >
                                    <Upload className="w-4 h-4 mr-1.5" />
                                    Import First Result Sheet
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-700 divide-y divide-slate-200">
                                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th scope="col" className="py-3.5 px-4 font-semibold">Result Sheet & File</th>
                                        <th scope="col" className="py-3.5 px-4 font-semibold">Grade & Section</th>
                                        <th scope="col" className="py-3.5 px-4 font-semibold">Subject</th>
                                        <th scope="col" className="py-3.5 px-4 font-semibold">Teacher / Submitter</th>
                                        <th scope="col" className="py-3.5 px-4 font-semibold text-center">Students</th>
                                        <th scope="col" className="py-3.5 px-4 font-semibold">Avg Score & Pass Rate</th>
                                        <th scope="col" className="py-3.5 px-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-normal">
                                    {filteredSheets.map((sheet) => (
                                        <tr
                                            key={sheet.id}
                                            className="hover:bg-slate-50/80 transition-colors group"
                                        >
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-slate-900 group-hover:text-[#4085b3] transition-colors">
                                                    {sheet.title}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]" title={sheet.fileName}>
                                                        {sheet.fileName}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                                                        {sheet.columnsCount} cols
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-slate-800">{sheet.gradeName}</div>
                                                <div className="text-xs text-slate-500">{sheet.sectionName}</div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-slate-800">{sheet.subjectName}</div>
                                                {sheet.subjectCode && (
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {sheet.subjectCode}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="text-slate-800 font-medium">{sheet.teacherName}</div>
                                                <div className="text-[11px] text-slate-400">
                                                    {new Date(sheet.submittedAt).toLocaleDateString()}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                                                    {sheet.totalStudents}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bold text-slate-900">{sheet.averageScore}%</span>
                                                    <span className="text-xs text-slate-500">avg</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    Pass Rate: <span className="font-semibold text-slate-800">{sheet.passRate}%</span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* View Table Action */}
                                                    <button
                                                        onClick={() => openSheetDetail(sheet.id)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#4085b3] hover:bg-blue-100 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-100"
                                                        title="View full imported data table with all columns"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View Data</span>
                                                    </button>

                                                    {/* External Excel Action */}
                                                    <button
                                                        onClick={() => handleDirectExcelOpen(sheet)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                                                        title="Open directly in Microsoft Excel"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 text-[#4085b3]" />
                                                        <span>Open in Excel</span>
                                                    </button>

                                                    {/* Delete Action */}
                                                    <button
                                                        onClick={() => handleDeleteSheet(sheet.id, sheet.title)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Delete result marksheet"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Slide-Over Drawer: Full Column Clean Data View */}
            {selectedSheetId && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setSelectedSheetId(null)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-5xl bg-white shadow-2xl flex flex-col h-full z-10 border-l border-slate-200 animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-200 bg-slate-50/70 shrink-0 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#4085b3]">
                                        Imported Excel Marksheet
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-mono text-slate-500">
                                        {sheetDetail?.fileName || "Spreadsheet"}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {sheetDetail?.title || "Loading Result Sheet..."}
                                </h2>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span>{sheetDetail?.gradeName} - {sheetDetail?.sectionName}</span>
                                    <span>•</span>
                                    <span>Subject: <strong className="text-slate-700">{sheetDetail?.subjectName}</strong></span>
                                    <span>•</span>
                                    <span>Teacher: <strong className="text-slate-700">{sheetDetail?.teacherName}</strong></span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {sheetDetail && (
                                    <>
                                        <Button
                                            onClick={() => openSheetInExcelExternally(sheetDetail, sheetDetail.rows)}
                                            className="bg-[#4085b3] hover:bg-[#35729c] text-white shadow-xs font-semibold px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Open in Excel</span>
                                        </Button>

                                        <button
                                            onClick={handleCopyTableData}
                                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                            title="Copy table contents to clipboard"
                                        >
                                            {copiedSuccess ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 text-[#4085b3]" />
                                                    <span className="text-[#4085b3]">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>Copy TSV</span>
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setSelectedSheetId(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                                    title="Close viewer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search & Stats Strip inside Drawer */}
                        {sheetDetail && (
                            <div className="px-6 py-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-4">
                                <div className="relative max-w-sm w-full">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="Filter student name, ID, marks..."
                                        value={drawerSearch}
                                        onChange={(e) => setDrawerSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 placeholder-slate-400 transition"
                                    />
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                    <span className="text-slate-500">
                                        Columns: <strong className="text-slate-800">{sheetDetail.columns.length}</strong>
                                    </span>
                                    <span className="text-slate-500">
                                        Students: <strong className="text-slate-800">{sheetDetail.rows.length}</strong>
                                    </span>
                                    <span className="text-slate-500">
                                        Average: <strong className="text-slate-900">{sheetDetail.averageScore}%</strong>
                                    </span>
                                    <span className="text-slate-500">
                                        Pass Rate: <strong className="text-slate-900">{sheetDetail.passRate}%</strong>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Full-width clean tabular viewer */}
                        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                            {loadingDetail ? (
                                <div className="py-24">
                                    <LoadingState message="Rendering full spreadsheet data..." />
                                </div>
                            ) : !sheetDetail ? (
                                <div className="py-24 text-center text-slate-400 text-sm">
                                    No sheet data available.
                                </div>
                            ) : drawerFilteredRows.length === 0 ? (
                                <div className="py-24 text-center text-slate-400 text-sm">
                                    No rows match the search query &quot;{drawerSearch}&quot;.
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                    <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
                                        <table className="w-full text-left text-xs border-collapse divide-y divide-slate-200">
                                            <thead className="bg-slate-100/90 sticky top-0 z-20 shadow-2xs">
                                                <tr>
                                                    <th className="py-3 px-3.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] w-12 text-center border-r border-slate-200">
                                                        #
                                                    </th>
                                                    {sheetDetail.columns.map((col, idx) => (
                                                        <th
                                                            key={idx}
                                                            className={`py-3 px-4 font-bold text-slate-700 tracking-wider text-[11px] whitespace-nowrap border-r border-slate-200 last:border-r-0 ${
                                                                idx < 2 ? "bg-slate-100" : ""
                                                            }`}
                                                        >
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {drawerFilteredRows.map((row, rIdx) => (
                                                    <tr
                                                        key={rIdx}
                                                        className="hover:bg-blue-50/40 transition-colors"
                                                    >
                                                        <td className="py-2.5 px-3.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100 bg-slate-50/50">
                                                            {rIdx + 1}
                                                        </td>
                                                        {sheetDetail.columns.map((col, cIdx) => {
                                                            const val = row[col];
                                                            const isNum = typeof val === "number" || (!isNaN(parseFloat(val)) && isFinite(val));
                                                            return (
                                                                <td
                                                                    key={cIdx}
                                                                    className={`py-2.5 px-4 whitespace-nowrap border-r border-slate-100 last:border-r-0 ${
                                                                        cIdx < 2 ? "font-semibold text-slate-900" : "text-slate-700"
                                                                    } ${isNum && cIdx > 1 ? "text-right font-mono" : ""}`}
                                                                >
                                                                    {val !== undefined && val !== null ? String(val) : "—"}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between text-xs text-slate-500">
                            <span>
                                Showing {drawerFilteredRows.length} of {sheetDetail?.rows.length || 0} student records with {sheetDetail?.columns.length || 0} columns.
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedSheetId(null)}
                                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs px-4 py-1.5 cursor-pointer"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Import Results (Accepts ANY Excel file) */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                        onClick={() => !isSubmittingImport && setIsImportModalOpen(false)}
                    />

                    {/* Dialog Container */}
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-xl bg-blue-50 text-[#4085b3]">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Import Student Result Sheet
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Upload any Excel workbook (.xlsx, .xls, .csv). All columns and rows will be preserved.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => !isSubmittingImport && setIsImportModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleImportSubmit} className="p-6 space-y-5">
                            {importError && (
                                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{importError}</span>
                                </div>
                            )}

                            {/* Excel File Dropzone / Picker */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                    Select Excel Spreadsheet File (.xlsx, .xls, .csv)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                        parsedData
                                            ? "border-[#4085b3] bg-blue-50/30"
                                            : "border-slate-300 hover:border-[#4085b3] hover:bg-slate-50/50"
                                    }`}
                                >
                                    <Upload className="w-8 h-8 text-[#4085b3] mx-auto mb-2" />
                                    {parsedData ? (
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{parsedData.fileName}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Detected {parsedData.columns.length} columns and {parsedData.rows.length} student rows.
                                            </p>
                                            <span className="inline-block mt-2 text-[11px] font-semibold text-[#4085b3] hover:underline">
                                                Click to choose a different file
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">
                                                Click to browse or drop an Excel spreadsheet here
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Accepts any custom marksheet without rigid template requirements
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detected Columns Preview */}
                            {parsedData && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700">
                                            Detected Column Headers ({parsedData.columns.length})
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            {parsedData.rows.length} rows parsed
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                        {parsedData.columns.map((c, i) => (
                                            <span
                                                key={i}
                                                className="text-[11px] font-medium px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200"
                                            >
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata Association */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Result Sheet Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Grade 10 Mathematics Final Marks"
                                        value={importTitle}
                                        onChange={(e) => setImportTitle(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Target Grade Level
                                    </label>
                                    <select
                                        value={importGradeId}
                                        onChange={(e) => {
                                            setImportGradeId(e.target.value);
                                            setImportSectionId("");
                                        }}
                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition"
                                    >
                                        <option value="">Select Grade (Optional)</option>
                                        {filterOptions.grades.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Target Section
                                    </label>
                                    <select
                                        value={importSectionId}
                                        onChange={(e) => setImportSectionId(e.target.value)}
                                        disabled={!importGradeId || importAvailableSections.length === 0}
                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition disabled:opacity-50"
                                    >
                                        <option value="">Select Section (Optional)</option>
                                        {importAvailableSections.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Subject
                                    </label>
                                    <select
                                        value={importSubjectId}
                                        onChange={(e) => setImportSubjectId(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800 transition"
                                    >
                                        <option value="">Select Subject (Optional)</option>
                                        {filterOptions.subjects.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.code ? `(${s.code})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dialog Actions */}
                            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsImportModalOpen(false)}
                                    disabled={isSubmittingImport}
                                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-sm px-4 py-2 cursor-pointer"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!parsedData || !importTitle.trim() || isSubmittingImport}
                                    className="bg-[#4085b3] hover:bg-[#35729c] text-white shadow-xs font-semibold text-sm px-5 py-2 cursor-pointer transition disabled:opacity-50"
                                >
                                    {isSubmittingImport ? "Importing Sheet..." : "Import & Save Result Sheet"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
