"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    LayoutDashboard,
    Landmark,
    Layers,
    School,
    FileText,
    Building2,
    MapPin,
    Network,
    Shield,
    Compass
} from "lucide-react";

export type AdminTier = "FEDERAL" | "REGION" | "ZONE" | "WOREDA";

interface NavItem {
    label: string;
    href: string;
    icon: any;
    tab?: string;
}

export default function AdministrativeNavigation({
    sidebarCollapsed = false,
    onToggleCollapse,
}: {
    sidebarCollapsed?: boolean;
    onToggleCollapse?: () => void;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "";

    // Determine active tier from route
    let currentTier: AdminTier = "FEDERAL";
    let tierTitle = "Federal Ministry of Education";
    let tierSubtitle = "National Governance";
    let basePath = "/dashboard/federal";
    let childUnitName = "Regions";
    let childUnitIcon = Layers;

    if (pathname.startsWith("/dashboard/region")) {
        currentTier = "REGION";
        tierTitle = "Regional Education Bureau";
        tierSubtitle = "Regional Administration";
        basePath = "/dashboard/region";
        childUnitName = "Zones";
        childUnitIcon = Building2;
    } else if (pathname.startsWith("/dashboard/zone")) {
        currentTier = "ZONE";
        tierTitle = "Zonal Education Department";
        tierSubtitle = "Zonal Administration";
        basePath = "/dashboard/zone";
        childUnitName = "Woredas";
        childUnitIcon = MapPin;
    } else if (pathname.startsWith("/dashboard/woreda")) {
        currentTier = "WOREDA";
        tierTitle = "Woreda Education Office";
        tierSubtitle = "District Administration";
        basePath = "/dashboard/woreda";
        childUnitName = "Schools";
        childUnitIcon = School;
    }

    let navItems: NavItem[] = [];

    if (currentTier === "FEDERAL") {
        navItems = [
            {
                label: "Dashboard Overview",
                href: basePath,
                icon: LayoutDashboard,
            },
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
            {
                label: "Policies & Directives",
                href: `${basePath}?tab=directives`,
                icon: FileText,
                tab: "directives",
            },
            {
                label: "Programs & Initiatives",
                href: `${basePath}?tab=programs`,
                icon: Compass,
                tab: "programs",
            },
        ];
    } else if (currentTier === "REGION") {
        navItems = [
            {
                label: "Dashboard Overview",
                href: basePath,
                icon: LayoutDashboard,
            },
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
            {
                label: "Policies & Directives",
                href: `${basePath}?tab=directives`,
                icon: FileText,
                tab: "directives",
            },
            {
                label: "Programs & Initiatives",
                href: `${basePath}?tab=programs`,
                icon: Compass,
                tab: "programs",
            },
        ];
    } else if (currentTier === "ZONE") {
        navItems = [
            {
                label: "Dashboard Overview",
                href: basePath,
                icon: LayoutDashboard,
            },
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
            {
                label: "Policies & Directives",
                href: `${basePath}?tab=directives`,
                icon: FileText,
                tab: "directives",
            },
            {
                label: "Programs & Initiatives",
                href: `${basePath}?tab=programs`,
                icon: Compass,
                tab: "programs",
            },
        ];
    } else {
        navItems = [
            {
                label: "Dashboard Overview",
                href: basePath,
                icon: LayoutDashboard,
            },
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
            {
                label: "Policies & Directives",
                href: `${basePath}?tab=directives`,
                icon: FileText,
                tab: "directives",
            },
            {
                label: "Programs & Initiatives",
                href: `${basePath}?tab=programs`,
                icon: Compass,
                tab: "programs",
            },
        ];
    }

    return (
        <aside
            className={`bg-[#0d233a] border-r border-[#1e3e5e] flex flex-col hidden md:flex overflow-y-auto scrollbar-hide text-blue-100 font-sans shadow-xl shrink-0 transition-all duration-300 ease-in-out ${
                sidebarCollapsed ? "w-16" : "w-64"
            }`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-3.5 pt-4 pb-3 border-b border-[#1e3e5e]">
                {!sidebarCollapsed && (
                    <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5 text-amber-400">
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{currentTier} DESK</span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{tierTitle}</p>
                    </div>
                )}
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className={`flex items-center justify-center w-7 h-7 rounded-lg bg-[#193a5e] hover:bg-[#254f7d] text-blue-200 hover:text-amber-300 transition-all cursor-pointer shadow-xs ${
                            sidebarCollapsed ? "mx-auto" : "ml-auto"
                        }`}
                    >
                        <Network className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Navigation items */}
            <div className="p-3 pt-4 flex-1">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isSelected = item.tab
                            ? currentTab === item.tab && pathname.startsWith(basePath)
                            : !currentTab && pathname === basePath;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                title={item.label}
                                className={`flex items-center ${
                                    sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"
                                } py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                                    isSelected
                                        ? "bg-[#184973] text-amber-300 font-bold border-l-2 border-amber-400 shadow-sm"
                                        : "text-blue-100/90 hover:bg-[#15385b] hover:text-white hover:translate-x-0.5"
                                }`}
                            >
                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                    <Icon
                                        className={`w-4 h-4 shrink-0 transition-transform ${
                                            isSelected ? "text-amber-300" : "text-blue-300 group-hover:text-amber-300"
                                        }`}
                                    />
                                    {!sidebarCollapsed && <span>{item.label}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Tier Status Footer */}
            {!sidebarCollapsed && (
                <div className="p-3.5 m-3 rounded-xl bg-[#112d4a] border border-[#1e3e5e] text-center">
                    <p className="text-[10px] text-blue-300/80 uppercase font-semibold">Hierarchy Scope</p>
                    <p className="text-xs font-bold text-amber-300 mt-0.5">{tierSubtitle}</p>
                </div>
            )}
        </aside>
    );
}
