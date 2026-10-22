"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { 
    Plus, 
    Search, 
    ArrowRight, 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown,
    X,
    RotateCcw,
    FileSpreadsheet,
    Printer,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

interface StudentRecord {
    id: string;
    studentId: string;
    firstName: string;
    fatherName?: string;
    grandfatherName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    city?: string;
    region?: string;
    nationalId?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    createdAt?: string;
    enrollments?: any[];
    guardians?: any[];
    parents?: any[];
}

export default function StudentsDirectoryPage() {
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Export State
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exportingType, setExportingType] = useState<"csv" | "pdf" | null>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [genderFilter, setGenderFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState<"createdAt" | "firstName" | "studentId">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Close export dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        }
        if (showExportMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showExportMenu]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                sortBy,
                sortOrder
            });

            if (searchQuery.trim()) params.append("search", searchQuery.trim());
            if (genderFilter !== "ALL") params.append("gender", genderFilter);
            if (statusFilter !== "ALL") params.append("status", statusFilter);

            const res = await fetchApi(`/student?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load student directory");
            
            const data = await res.json();
            
            if (data && data.meta) {
                setStudents(data.data || []);
                setTotalCount(data.meta.total || 0);
                setTotalPages(data.meta.totalPages || 1);
            } else if (Array.isArray(data)) {
                setStudents(data);
                setTotalCount(data.length);
                setTotalPages(Math.ceil(data.length / limit) || 1);
            } else {
                setStudents([]);
                setTotalCount(0);
                setTotalPages(1);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading students");
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchQuery, genderFilter, statusFilter, sortBy, sortOrder]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadData();
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [loadData]);

    const handleResetFilters = () => {
        setSearchQuery("");
        setGenderFilter("ALL");
        setStatusFilter("ALL");
        setSortBy("createdAt");
        setSortOrder("desc");
        setPage(1);
    };

    // Fetch all matching records according to active filters for export
    const fetchAllMatchingStudents = async (): Promise<StudentRecord[]> => {
        const params = new URLSearchParams({
            limit: "all",
            all: "true",
            sortBy,
            sortOrder
        });

        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (genderFilter !== "ALL") params.append("gender", genderFilter);
        if (statusFilter !== "ALL") params.append("status", statusFilter);

        const res = await fetchApi(`/student?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch students for export");
        const json = await res.json();
        return json.data || (Array.isArray(json) ? json : []);
    };

    // Export as CSV (Excel)
    const handleExportCSV = async () => {
        try {
            setExportingType("csv");
            setShowExportMenu(false);
            const data = await fetchAllMatchingStudents();

            if (!data || data.length === 0) {
                alert("No student records found to export.");
                return;
            }

            const headers = [
                "Student ID",
                "Full Name",
                "First Name",
                "Father Name",
                "Grandfather Name",
                "Gender",
                "Date of Birth",
                "Location",
                "Grade",
                "Section",
                "Enrollment Status",
                "Primary Guardian",
                "Guardian Relationship",
                "Guardian Phone",
                "Emergency Contact",
                "Emergency Phone"
            ];

            const escapeCSV = (val: any) => {
                if (val === null || val === undefined) return '""';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            };

            const rows = data.map((student) => {
                const primaryGuardian = student.guardians?.find((g: any) => g.isPrimary) || 
                    student.guardians?.[0] || 
                    student.parents?.find((p: any) => p.isPrimary) || 
                    student.parents?.[0];

                const fullName = `${student.firstName} ${student.fatherName || student.lastName || ""} ${student.grandfatherName || ""}`.trim();
                const latestEnrollment = student.enrollments?.[0];
                const gradeName = latestEnrollment?.schoolGrade?.grade?.name || latestEnrollment?.schoolGrade?.name || "—";
                const sectionName = latestEnrollment?.section?.name || "—";
                const status = latestEnrollment?.status || (student.enrollments && student.enrollments.length > 0 ? "ENROLLED" : "REGISTERED");

                const guardianName = primaryGuardian?.parent?.user?.name || 
                    `${primaryGuardian?.parent?.firstName || ""} ${primaryGuardian?.parent?.lastName || ""}`.trim() || 
                    primaryGuardian?.fullName || "";
                const guardianPhone = primaryGuardian?.parent?.phoneNumber || primaryGuardian?.phoneNumber || "";

                return [
                    escapeCSV(student.studentId || ""),
                    escapeCSV(fullName),
                    escapeCSV(student.firstName || ""),
                    escapeCSV(student.fatherName || ""),
                    escapeCSV(student.grandfatherName || ""),
                    escapeCSV(student.gender || ""),
                    escapeCSV(student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : ""),
                    escapeCSV(student.city || student.region || ""),
                    escapeCSV(gradeName),
                    escapeCSV(sectionName),
                    escapeCSV(status),
                    escapeCSV(guardianName),
                    escapeCSV(primaryGuardian?.relationship || ""),
                    escapeCSV(guardianPhone),
                    escapeCSV(student.emergencyContactName || ""),
                    escapeCSV(student.emergencyContactPhone || "")
                ].join(",");
            });

            const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute("href", url);
            link.setAttribute("download", `student_roster_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || "Failed to generate CSV export");
        } finally {
            setExportingType(null);
        }
    };

    // Export as PDF (Official Roster)
    const handleExportPDF = async () => {
        try {
            setExportingType("pdf");
            setShowExportMenu(false);
            const data = await fetchAllMatchingStudents();

            if (!data || data.length === 0) {
                alert("No student records found to export.");
                return;
            }

            const dateFormatted = new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            const filterSummary = [
                genderFilter !== "ALL" ? `Gender: ${genderFilter}` : null,
                statusFilter !== "ALL" ? `Status: ${statusFilter}` : null,
                searchQuery.trim() ? `Search: "${searchQuery.trim()}"` : null
            ].filter(Boolean).join(" • ") || "All Registered Students";

            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                alert("Popup was blocked. Please allow popups to view and print the official roster.");
                return;
            }

            const rowsHtml = data.map((student, idx) => {
                const primaryGuardian = student.guardians?.find((g: any) => g.isPrimary) || 
                    student.guardians?.[0] || 
                    student.parents?.find((p: any) => p.isPrimary) || 
                    student.parents?.[0];

                const fullName = `${student.firstName} ${student.fatherName || student.lastName || ""} ${student.grandfatherName || ""}`.trim();
                const latestEnrollment = student.enrollments?.[0];
                const gradeName = latestEnrollment?.schoolGrade?.grade?.name || latestEnrollment?.schoolGrade?.name || "—";
                const sectionName = latestEnrollment?.section?.name || "—";
                const status = latestEnrollment?.status || (student.enrollments && student.enrollments.length > 0 ? "ENROLLED" : "REGISTERED");

                const guardianName = primaryGuardian?.parent?.user?.name || 
                    `${primaryGuardian?.parent?.firstName || ""} ${primaryGuardian?.parent?.lastName || ""}`.trim() || 
                    primaryGuardian?.fullName || student.emergencyContactName || "—";
                const guardianPhone = primaryGuardian?.parent?.phoneNumber || primaryGuardian?.phoneNumber || student.emergencyContactPhone || "";

                return `
                    <tr>
                        <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
                        <td style="font-family: monospace; font-weight: 600;">${student.studentId || "—"}</td>
                        <td style="font-weight: 600; text-transform: capitalize;">${fullName}</td>
                        <td style="text-align: center; text-transform: capitalize;">${student.gender ? student.gender.toLowerCase() : "—"}</td>
                        <td style="text-align: center;">${gradeName} ${sectionName !== "—" ? `(${sectionName})` : ""}</td>
                        <td>${student.city || student.region || "—"}</td>
                        <td>${guardianName} ${guardianPhone ? `<span style="color:#64748b; font-size:10px;">(${guardianPhone})</span>` : ""}</td>
                        <td style="text-align: center;"><span class="badge">${status}</span></td>
                    </tr>
                `;
            }).join("");

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <title>Official Student Roster - ${dateFormatted}</title>
                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 12mm 10mm;
                        }
                        * {
                            box-sizing: border-box;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            color: #0f172a;
                            background: #fff;
                            margin: 0;
                            padding: 16px;
                            font-size: 11px;
                            line-height: 1.4;
                        }
                        .header {
                            border-bottom: 2px solid #0f172a;
                            padding-bottom: 12px;
                            margin-bottom: 14px;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                        }
                        .gov-title {
                            font-size: 10px;
                            font-weight: 700;
                            letter-spacing: 0.08em;
                            text-transform: uppercase;
                            color: #475569;
                        }
                        .emis-title {
                            font-size: 16px;
                            font-weight: 800;
                            color: #0f172a;
                            margin-top: 2px;
                        }
                        .roster-subtitle {
                            font-size: 11px;
                            color: #64748b;
                            margin-top: 3px;
                        }
                        .meta-box {
                            text-align: right;
                            font-size: 10px;
                            color: #475569;
                        }
                        .meta-box strong {
                            color: #0f172a;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 8px;
                        }
                        th {
                            background-color: #f1f5f9;
                            border: 1px solid #cbd5e1;
                            padding: 6px 8px;
                            text-align: left;
                            font-size: 10px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.04em;
                            color: #334155;
                        }
                        td {
                            border: 1px solid #e2e8f0;
                            padding: 5px 8px;
                            font-size: 10.5px;
                        }
                        tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        .badge {
                            display: inline-block;
                            padding: 1px 6px;
                            font-size: 9px;
                            font-weight: 600;
                            border-radius: 3px;
                            background: #f1f5f9;
                            color: #334155;
                            border: 1px solid #cbd5e1;
                        }
                        .footer-signatures {
                            margin-top: 28px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 11px;
                            page-break-inside: avoid;
                        }
                        .sign-col {
                            width: 30%;
                            border-top: 1px solid #94a3b8;
                            padding-top: 6px;
                            text-align: center;
                            color: #475569;
                        }
                        @media print {
                            body {
                                padding: 0;
                            }
                            .no-print {
                                display: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 8px;">
                        <button onclick="window.print()" style="padding: 6px 14px; background: #4085b3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            Print / Save as PDF
                        </button>
                        <button onclick="window.close()" style="padding: 6px 14px; background: #e2e8f0; color: #334155; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Close
                        </button>
                    </div>
                    <div class="header">
                        <div>
                            <div class="gov-title">Federal Democratic Republic of Ethiopia • Ministry of Education</div>
                            <div class="emis-title">General Education Management Information System (EMIS)</div>
                            <div class="roster-subtitle">Official Student Identity & Academic Enrollment Roster</div>
                        </div>
                        <div class="meta-box">
                            <div>Date: <strong>${dateFormatted}</strong></div>
                            <div>Total Records: <strong>${data.length}</strong></div>
                            <div>Criteria: <strong>${filterSummary}</strong></div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 32px; text-align: center;">#</th>
                                <th style="width: 110px;">Student ID</th>
                                <th>Full Name (3-Tier)</th>
                                <th style="width: 60px; text-align: center;">Gender</th>
                                <th style="width: 90px; text-align: center;">Grade & Sec</th>
                                <th style="width: 100px;">Location</th>
                                <th>Primary Guardian / Emergency Contact</th>
                                <th style="width: 80px; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="footer-signatures">
                        <div class="sign-col">
                            Registrar / Records Officer Signature
                        </div>
                        <div class="sign-col">
                            School Principal / Director Signature
                        </div>
                        <div class="sign-col">
                            Official School Stamp & Seal
                        </div>
                    </div>

                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 400);
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        } catch (err: any) {
            alert(err.message || "Failed to generate PDF roster");
        } finally {
            setExportingType(null);
        }
    };

    const hasActiveFilters = searchQuery !== "" || genderFilter !== "ALL" || statusFilter !== "ALL";

    const startRecord = totalCount === 0 ? 0 : (page - 1) * limit + 1;
    const endRecord = Math.min(page * limit, totalCount);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Clean Government Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900">Student Directory</h1>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {totalCount} Total Students
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Official student identity records, demographic profiles, and historical admissions.
                    </p>
                </div>

                {/* Header Action Bar */}
                <div className="flex items-center gap-2.5">
                    {/* Export Roster Dropdown Button */}
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowExportMenu(prev => !prev)}
                            disabled={exportingType !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-2xs hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
                        >
                            {exportingType ? (
                                <Loader2 className="w-3.5 h-3.5 text-[#4085b3] animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                            )}
                            <span>Export Roster</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-30 py-1 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    type="button"
                                    onClick={handleExportCSV}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-slate-700 hover:bg-[#4085b3]/5 hover:text-[#4085b3] transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div>
                                        <div className="font-medium text-slate-800">Export as CSV (Excel)</div>
                                        <div className="text-[10px] text-slate-400">Spreadsheet file (.csv)</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportPDF}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-slate-700 hover:bg-[#4085b3]/5 hover:text-[#4085b3] transition-colors"
                                >
                                    <Printer className="w-4 h-4 text-[#4085b3] shrink-0" />
                                    <div>
                                        <div className="font-medium text-slate-800">Export as PDF (Official Roster)</div>
                                        <div className="text-[10px] text-slate-400">Formal printable registry roster</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    <Link href="/dashboard/students/enrollments">
                        <Button variant="outline" size="sm" className="hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200">
                            Enrollment Ledger
                        </Button>
                    </Link>
                    <Link href="/dashboard/students/register">
                        <Button size="sm" className="bg-[#4085b3] hover:bg-[#32698e] text-white" leftIcon={<Plus className="w-4 h-4" />}>
                            Register Student
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Modern Search & Filtering Control Panel */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3.5">
                {/* Full Width Modern Search Input */}
                <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        placeholder="Search student directory by 3-tier name, Student ID (e.g. STU-2609-...), or location..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] text-slate-900 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => {
                                setSearchQuery("");
                                setPage(1);
                            }}
                            className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Gender Filter */}
                        <select
                            value={genderFilter}
                            onChange={(e) => {
                                setGenderFilter(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Genders</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="ENROLLED">Enrolled</option>
                            <option value="TRANSFERRED">Transferred</option>
                            <option value="WITHDRAWN">Withdrawn</option>
                            <option value="GRADUATED">Graduated</option>
                            <option value="DROPPED_OUT">Dropped Out</option>
                        </select>

                        {/* Sort Order */}
                        <select
                            value={`${sortBy}:${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split(":");
                                setSortBy(field as any);
                                setSortOrder(order as any);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="createdAt:desc">Newest First</option>
                            <option value="createdAt:asc">Oldest First</option>
                            <option value="firstName:asc">Name (A-Z)</option>
                            <option value="firstName:desc">Name (Z-A)</option>
                            <option value="studentId:asc">Student ID (Asc)</option>
                        </select>

                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-2.5 py-1.5 transition-colors"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Rows Per Page */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Rows:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && <ErrorState message={error} onRetry={loadData} />}

            {/* Table or Empty State */}
            {loading ? (
                <LoadingState message="Loading directory records..." />
            ) : students.length === 0 ? (
                <EmptyState 
                    title="No Students Found" 
                    message={hasActiveFilters ? "No students matched your search and filter criteria." : "There are no student identities registered in the platform yet."} 
                />
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="px-5 py-3">Student ID</th>
                                    <th className="px-5 py-3">Full Name (3-Tier)</th>
                                    <th className="px-5 py-3">Gender</th>
                                    <th className="px-5 py-3">Location</th>
                                    <th className="px-5 py-3">Primary Guardian</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {students.map((student) => {
                                    const primaryGuardian = student.guardians?.find((g: any) => g.isPrimary) || 
                                        student.guardians?.[0] || 
                                        student.parents?.find((p: any) => p.isPrimary) || 
                                        student.parents?.[0];

                                    const fullName = `${student.firstName} ${student.fatherName || student.lastName || ""} ${student.grandfatherName || ""}`.trim();

                                    const guardianDisplayName = primaryGuardian?.parent?.user?.name || 
                                        `${primaryGuardian?.parent?.firstName || ""} ${primaryGuardian?.parent?.lastName || ""}`.trim() || 
                                        primaryGuardian?.fullName;

                                    const guardianPhone = primaryGuardian?.parent?.phoneNumber || primaryGuardian?.phoneNumber;

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                                                {student.studentId || "—"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-slate-900 capitalize text-xs">
                                                    {fullName}
                                                </div>
                                                {student.dateOfBirth && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700 capitalize">
                                                {student.gender ? student.gender.toLowerCase() : "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                {student.city || student.region || "Addis Ababa"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                {guardianDisplayName ? (
                                                    <div>
                                                        <span className="font-medium text-slate-900">
                                                            {guardianDisplayName}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 block">
                                                            {primaryGuardian?.relationship || "Guardian"} {guardianPhone ? `• ${guardianPhone}` : ""}
                                                        </span>
                                                    </div>
                                                ) : student.emergencyContactName ? (
                                                    <div>
                                                        <span className="font-medium text-slate-900">
                                                            {student.emergencyContactName}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 block">
                                                            {student.emergencyContactRelation || "Emergency Contact"} {student.emergencyContactPhone ? `• ${student.emergencyContactPhone}` : ""}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <Link 
                                                    href={`/dashboard/students/${student.id}`}
                                                    className="inline-flex items-center text-xs font-semibold text-[#4085b3] hover:text-[#32698e] hover:underline"
                                                >
                                                    View Details
                                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Clean Pagination Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                        <div>
                            Showing <strong className="text-slate-900">{startRecord}</strong> to{" "}
                            <strong className="text-slate-900">{endRecord}</strong> of{" "}
                            <strong className="text-slate-900">{totalCount}</strong> students
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page <= 1}
                                className="px-2.5 py-1 text-xs border-slate-300 disabled:opacity-40"
                                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                            >
                                Prev
                            </Button>

                            <div className="px-2 font-medium text-slate-700">
                                Page {page} of {totalPages}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages}
                                className="px-2.5 py-1 text-xs border-slate-300 disabled:opacity-40"
                            >
                                <span className="mr-1">Next</span>
                                <ChevronRight className="w-3.5 h-3.5 inline" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
