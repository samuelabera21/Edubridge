"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FileText, Compass } from "lucide-react";

interface GovernanceSubnavProps {
    activeTab: "directives" | "programs";
    directivesCount?: number;
    programsCount?: number;
}

export default function GovernanceSubnav({
    activeTab,
    directivesCount,
    programsCount,
}: GovernanceSubnavProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const switchTab = (tab: "directives" | "programs") => {
        if (tab === activeTab) return;

        // If on standalone routes (/dashboard/directives or /dashboard/programs), switch path
        if (pathname === "/dashboard/directives" || pathname === "/dashboard/programs") {
            const targetPath = tab === "directives" ? "/dashboard/directives" : "/dashboard/programs";
            router.push(targetPath);
            return;
        }

        // For hierarchical desks (/dashboard/federal, /dashboard/region, /dashboard/zone, /dashboard/woreda)
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("tab", tab);
        // Clear item-specific deep links when switching subtab
        params.delete("directiveId");
        params.delete("programId");
        params.delete("programTitle");
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            {/* Subtab Segmented Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80">
                <button
                    type="button"
                    onClick={() => switchTab("directives")}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === "directives"
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                >
                    <FileText className={`w-3.5 h-3.5 ${activeTab === "directives" ? "text-[#4085b3]" : "text-slate-400"}`} />
                    <span>Policies & Directives</span>
                    {typeof directivesCount === "number" && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                            activeTab === "directives" ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600"
                        }`}>
                            {directivesCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => switchTab("programs")}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === "programs"
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                >
                    <Compass className={`w-3.5 h-3.5 ${activeTab === "programs" ? "text-[#4085b3]" : "text-slate-400"}`} />
                    <span>Programs & Initiatives</span>
                    {typeof programsCount === "number" && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                            activeTab === "programs" ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600"
                        }`}>
                            {programsCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Context Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Governance Hub</span>
            </div>
        </div>
    );
}
