"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    LayoutDashboard,
    Layers,
    School,
    FileText,
    Building2,
    MapPin,
    Shield,
    BarChart3,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    type LucideIcon
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getPrimaryAccess } from "../../lib/auth-access";

export type AdminTier = "FEDERAL" | "REGION" | "ZONE" | "WOREDA";

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    tab?: string;
    activeTabs?: string[];
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

export default function AdministrativeNavigation({
    sidebarCollapsed = false,
    onToggleCollapse,
    className = "",
}: {
    sidebarCollapsed?: boolean;
    onToggleCollapse?: () => void;
    className?: string;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "";
    const { authData } = useAuth(false);
    const primaryAccess = getPrimaryAccess(authData?.access);
    const userScopeType = primaryAccess?.scope?.type;

    // Determine active tier from route with user scope fallback
    let currentTier: AdminTier = "FEDERAL";
    let tierTitle = "Federal Ministry of Education";
    let tierSubtitle = "Federal Jurisdiction";
    let basePath = "/dashboard/federal";

    if (
        pathname.startsWith("/dashboard/region") ||
        (!pathname.startsWith("/dashboard/federal") && !pathname.startsWith("/dashboard/zone") && !pathname.startsWith("/dashboard/woreda") && userScopeType === "REGION")
    ) {
        currentTier = "REGION";
        tierTitle = "Regional Education Bureau";
        tierSubtitle = "Regional Jurisdiction";
        basePath = "/dashboard/region";
    } else if (
        pathname.startsWith("/dashboard/zone") ||
        (!pathname.startsWith("/dashboard/federal") && !pathname.startsWith("/dashboard/region") && !pathname.startsWith("/dashboard/woreda") && userScopeType === "ZONE")
    ) {
        currentTier = "ZONE";
        tierTitle = "Zonal Education Department";
        tierSubtitle = "Zonal Jurisdiction";
        basePath = "/dashboard/zone";
    } else if (
        pathname.startsWith("/dashboard/woreda") ||
        (!pathname.startsWith("/dashboard/federal") && !pathname.startsWith("/dashboard/region") && !pathname.startsWith("/dashboard/zone") && userScopeType === "WOREDA")
    ) {
        currentTier = "WOREDA";
        tierTitle = "Woreda Education Office";
        tierSubtitle = "District Jurisdiction";
        basePath = "/dashboard/woreda";
    }

    let navGroups: NavGroup[] = [];

    if (currentTier === "FEDERAL") {
        navGroups = [
            {
                title: "Monitoring",
                items: [
                    {
                        label: "Dashboard Overview",
                        href: basePath,
                        icon: LayoutDashboard,
                    },
                ],
            },
            {
                title: "Territorial Governance",
                items: [
                    {
                        label: "Regions",
                        href: `${basePath}?tab=regions`,
                        icon: Layers,
                        tab: "regions",
                    },
                    {
                        label: "Regional Administrators",
                        href: `${basePath}?tab=administration`,
                        icon: Shield,
                        tab: "administration",
                    },
                ],
            },
            {
                title: "National Directives",
                items: [
                    {
                        label: "Policies & Programs",
                        href: `${basePath}?tab=directives`,
                        icon: FileText,
                        tab: "directives",
                        activeTabs: ["directives", "programs"],
                    },
                    {
                        label: "Data Requests",
                        href: `${basePath}?tab=data-requests`,
                        icon: FileSpreadsheet,
                        tab: "data-requests",
                    },
                ],
            },
            {
                title: "Intelligence & Audit",
                items: [
                    {
                        label: "Reports & Analytics",
                        href: `${basePath}?tab=reports`,
                        icon: BarChart3,
                        tab: "reports",
                    },
                ],
            },
        ];
    } else if (currentTier === "REGION") {
        navGroups = [
            {
                title: "Monitoring",
                items: [
                    {
                        label: "Dashboard Overview",
                        href: basePath,
                        icon: LayoutDashboard,
                    },
                ],
            },
            {
                title: "Zonal Governance",
                items: [
                    {
                        label: "Administrative Zones",
                        href: `${basePath}?tab=zones`,
                        icon: Building2,
                        tab: "zones",
                    },
                    {
                        label: "Zone Administrators",
                        href: `${basePath}?tab=administration`,
                        icon: Shield,
                        tab: "administration",
                    },
                ],
            },
            {
                title: "Regional Directives",
                items: [
                    {
                        label: "Policies & Programs",
                        href: `${basePath}?tab=directives`,
                        icon: FileText,
                        tab: "directives",
                        activeTabs: ["directives", "programs"],
                    },
                    {
                        label: "Data Requests",
                        href: `${basePath}?tab=data-requests`,
                        icon: FileSpreadsheet,
                        tab: "data-requests",
                    },
                ],
            },
            {
                title: "Intelligence & Audit",
                items: [
                    {
                        label: "Reports & Analytics",
                        href: `${basePath}?tab=reports`,
                        icon: BarChart3,
                        tab: "reports",
                    },
                ],
            },
        ];
    } else if (currentTier === "ZONE") {
        navGroups = [
            {
                title: "Monitoring",
                items: [
                    {
                        label: "Dashboard Overview",
                        href: basePath,
                        icon: LayoutDashboard,
                    },
                ],
            },
            {
                title: "District Governance",
                items: [
                    {
                        label: "Woredas",
                        href: `${basePath}?tab=woredas`,
                        icon: MapPin,
                        tab: "woredas",
                    },
                    {
                        label: "Woreda Administrators",
                        href: `${basePath}?tab=administration`,
                        icon: Shield,
                        tab: "administration",
                    },
                ],
            },
            {
                title: "Zonal Directives",
                items: [
                    {
                        label: "Policies & Programs",
                        href: `${basePath}?tab=directives`,
                        icon: FileText,
                        tab: "directives",
                        activeTabs: ["directives", "programs"],
                    },
                    {
                        label: "Data Requests",
                        href: `${basePath}?tab=data-requests`,
                        icon: FileSpreadsheet,
                        tab: "data-requests",
                    },
                ],
            },
            {
                title: "Intelligence & Audit",
                items: [
                    {
                        label: "Reports & Analytics",
                        href: `${basePath}?tab=reports`,
                        icon: BarChart3,
                        tab: "reports",
                    },
                ],
            },
        ];
    } else {
        navGroups = [
            {
                title: "Monitoring",
                items: [
                    {
                        label: "Dashboard Overview",
                        href: basePath,
                        icon: LayoutDashboard,
                    },
                ],
            },
            {
                title: "School Network",
                items: [
                    {
                        label: "Subordinate Schools",
                        href: `${basePath}?tab=schools`,
                        icon: School,
                        tab: "schools",
                    },
                    {
                        label: "School Principals",
                        href: `${basePath}?tab=administration`,
                        icon: Shield,
                        tab: "administration",
                    },
                ],
            },
            {
                title: "District Directives",
                items: [
                    {
                        label: "Policies & Programs",
                        href: `${basePath}?tab=directives`,
                        icon: FileText,
                        tab: "directives",
                        activeTabs: ["directives", "programs"],
                    },
                    {
                        label: "Data Requests",
                        href: `${basePath}?tab=data-requests`,
                        icon: FileSpreadsheet,
                        tab: "data-requests",
                    },
                ],
            },
            {
                title: "Intelligence & Audit",
                items: [
                    {
                        label: "Reports & Analytics",
                        href: `${basePath}?tab=reports`,
                        icon: BarChart3,
                        tab: "reports",
                    },
                ],
            },
        ];
    }

    return (
        <aside
            className={`h-full bg-[#f8fafc] border-r border-slate-200 flex flex-col ${className || "hidden md:flex"} overflow-y-auto scrollbar-hide text-slate-700 font-sans shrink-0 transition-all duration-200 ease-in-out ${
                sidebarCollapsed ? "w-16" : "w-64"
            }`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
            {/* Sidebar Department Masthead */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 bg-white">
                {!sidebarCollapsed ? (
                    <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                            {tierTitle}
                        </p>
                        <span className="text-[10px] font-medium text-slate-500 block truncate">
                            {tierSubtitle}
                        </span>
                    </div>
                ) : (
                    <div className="mx-auto" title={`${tierTitle} (${currentTier})`}>
                        <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[11px]">
                            {currentTier[0]}
                        </div>
                    </div>
                )}
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className={`flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ${
                            sidebarCollapsed ? "hidden" : "ml-auto"
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Sidebar Expand button for collapsed mode */}
            {sidebarCollapsed && onToggleCollapse && (
                <div className="p-2 border-b border-slate-200 bg-white flex justify-center">
                    <button
                        onClick={onToggleCollapse}
                        title="Expand sidebar"
                        className="flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Grouped Navigation Links */}
            <div className="p-2.5 flex-1 space-y-4">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-0.5">
                        {!sidebarCollapsed && (
                            <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                {group.title}
                            </div>
                        )}
                        <nav className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isSelected = item.activeTabs
                                    ? (item.activeTabs.includes(currentTab) && pathname.startsWith(basePath)) ||
                                      ((pathname === "/dashboard/directives" || pathname === "/dashboard/programs") && item.tab === "directives")
                                    : item.tab
                                    ? currentTab === item.tab && pathname.startsWith(basePath)
                                    : !currentTab && pathname === basePath;

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        title={item.label}
                                        className={`group flex items-center ${
                                            sidebarCollapsed ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                                        } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                            isSelected
                                                ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                                : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                                        }`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-2.5 min-w-0"}`}>
                                            <Icon
                                                className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                                    isSelected ? "text-white" : "text-slate-400 group-hover:text-white"
                                                }`}
                                            />
                                            {!sidebarCollapsed && (
                                                <span className="truncate">{item.label}</span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Sidebar Utility Footer - System Status */}
            {!sidebarCollapsed ? (
                <div className="p-3 border-t border-slate-200 bg-white text-[11px] shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">EMIS System</span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Operational
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">FDRE Ministry of Education</p>
                </div>
            ) : (
                <div className="p-2 border-t border-slate-200 bg-white flex justify-center shrink-0" title="EMIS System Operational">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
            )}
        </aside>
    );
}
