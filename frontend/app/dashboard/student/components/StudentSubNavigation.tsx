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
};

type StudentSubNavigationProps = {
    group: StudentNavGroup;
    isOpen: boolean;
    pathname: string;
    collapsed: boolean;
    onToggle: (key: string) => void;
};

export default function StudentSubNavigation({ group, isOpen, pathname, collapsed, onToggle }: StudentSubNavigationProps) {
    const Icon = group.icon;
    const isActive = (href: string) => pathname === href;

    return (
        <div className="pt-2">
            <button
                type="button"
                onClick={() => onToggle(group.key)}
                title={group.label}
                className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-3"} py-2 rounded-lg text-xs font-medium text-blue-50/90 hover:bg-[#225785] hover:text-white transition-colors ${collapsed ? "text-center" : ""}`}
            >
                <span className={`flex items-center ${collapsed ? "" : "space-x-2.5"}`}>
                    <Icon className="w-4 h-4 shrink-0 text-amber-300/90" />
                    {!collapsed && <span>{group.label}</span>}
                </span>
                {!collapsed && (isOpen ? <ChevronDown className="w-3.5 h-3.5 text-blue-200" /> : <ChevronRight className="w-3.5 h-3.5 text-blue-300" />)}
            </button>
            {isOpen && !collapsed && (
                <div className="pl-6 pt-1 space-y-1">
                    {group.links.map((link) => (
                        <Link
                            href={link.href}
                            key={`${group.key}-${link.label}`}
                            className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                                isActive(link.href)
                                    ? "bg-[#0f2f4c] text-amber-300 font-semibold shadow-xs"
                                    : "text-blue-200/90 hover:bg-[#225785]/60 hover:text-amber-200"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
