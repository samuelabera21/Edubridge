"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

type StudentNavLink = {
    label: string;
    href: string;
};

export type StudentNavGroup = {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    links: StudentNavLink[];
    isSoon?: boolean;
};

type StudentSubNavigationProps = {
    group: StudentNavGroup;
    isOpen: boolean;
    pathname: string;
    collapsed: boolean;
    onToggle: (key: string) => void;
    onNavigate?: () => void;
};

export default function StudentSubNavigation({ group, isOpen, pathname, collapsed, onToggle, onNavigate }: StudentSubNavigationProps) {
    const Icon = group.icon;
    const isGroupActive =
        (group.key === "profile" && pathname.startsWith("/dashboard/student/profile")) ||
        group.links.some((l) => pathname === l.href.split("?")[0] || pathname.startsWith(`${l.href.split("?")[0]}/`));

    if (group.isSoon) {
        return (
            <div
                title="Feature under development"
                className={`flex items-center ${
                    collapsed ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                } text-xs text-slate-400 cursor-not-allowed select-none rounded-md`}
            >
                <div className={`flex items-center ${collapsed ? "" : "space-x-2.5 min-w-0"}`}>
                    <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                    {!collapsed && <span className="truncate">{group.label}</span>}
                </div>
                {!collapsed && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">
                        Soon
                    </span>
                )}
            </div>
        );
    }

    if (collapsed) {
        return (
            <Link
                href={group.links[0]?.href || "#"}
                onClick={onNavigate}
                title={group.label}
                className={`group flex items-center justify-center px-2 py-2 text-xs transition-all duration-150 cursor-pointer rounded-md ${
                    isGroupActive
                        ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                }`}
            >
                <Icon
                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                        isGroupActive ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}
                />
            </Link>
        );
    }

    return (
        <div className="space-y-0.5">
            <button
                type="button"
                onClick={() => onToggle(group.key)}
                title={group.label}
                className={`group w-full flex items-center justify-between px-2.5 py-2 text-xs transition-all duration-150 cursor-pointer rounded-md ${
                    isGroupActive && !isOpen
                        ? "bg-[#4085b3]/10 text-[#245f8b] font-semibold"
                        : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                }`}
            >
                <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                        className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                            isGroupActive && !isOpen
                                ? "text-[#4085b3]"
                                : "text-slate-400 group-hover:text-white"
                        }`}
                    />
                    <span className="truncate">{group.label}</span>
                </div>
                <div className="shrink-0 ml-1">
                    {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-3.5 my-0.5">
                    {group.links.map((link) => {
                        const active =
                            pathname === link.href ||
                            (link.href === "/dashboard/student/profile/information" && pathname === "/dashboard/student/profile");
                        return (
                            <Link
                                key={`${group.key}-${link.label}`}
                                href={link.href}
                                onClick={onNavigate}
                                title={link.label}
                                className={`block px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 truncate cursor-pointer ${
                                    active
                                        ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                        : "text-slate-600 hover:bg-[#4085b3] hover:text-white"
                                }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
