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
    onToggle: (key: string) => void;
};

export default function StudentSubNavigation({ group, isOpen, pathname, onToggle }: StudentSubNavigationProps) {
    const Icon = group.icon;
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <div className="pt-2">
            <button
                type="button"
                onClick={() => onToggle(group.key)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <span className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 text-[#006b3f]" />
                    <span>{group.label}</span>
                </span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {isOpen && (
                <div className="pl-6 pt-1 space-y-1">
                    {group.links.map((link) => (
                        <Link
                            href={link.href}
                            key={`${group.key}-${link.label}`}
                            className={`block px-3 py-1.5 rounded-lg text-xs font-medium ${
                                isActive(link.href)
                                    ? "bg-emerald-50 text-[#006b3f] font-bold"
                                    : "text-gray-600 hover:bg-gray-50"
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
