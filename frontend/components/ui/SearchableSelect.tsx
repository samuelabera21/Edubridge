"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
    value: string;
    label: string;
    subtitle?: string;
    badge?: string;
}

interface SearchableSelectProps {
    options: SearchableOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
    required?: boolean;
    id?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "-- Choose item --",
    searchPlaceholder = "Type to search...",
    disabled = false,
    className = "",
    required = false,
    id
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Selected option object
    const selectedOption = useMemo(() => {
        return options.find(opt => opt.value === value) || null;
    }, [options, value]);

    // Filtered options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter(
            opt =>
                opt.label.toLowerCase().includes(q) ||
                (opt.subtitle && opt.subtitle.toLowerCase().includes(q)) ||
                (opt.badge && opt.badge.toLowerCase().includes(q))
        );
    }, [options, searchQuery]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery("");
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Display Button */}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(prev => !prev)}
                className={`w-full flex items-center justify-between border rounded-lg p-2 text-xs text-left transition-all ${
                    disabled
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : isOpen
                        ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                        : "border-slate-300 bg-white hover:border-slate-400 text-slate-800"
                }`}
            >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-1">
                    {selectedOption ? (
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-slate-900 truncate">
                                {selectedOption.label}
                            </span>
                            {selectedOption.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium shrink-0">
                                    {selectedOption.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 truncate">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {selectedOption && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    onChange("");
                                }
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                            title="Clear selection"
                        >
                            <X className="w-3 h-3" />
                        </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
                </div>
            </button>

            {/* Hidden native input for required form validation */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    value={value}
                    required={required}
                    onChange={() => {}}
                    className="absolute inset-0 opacity-0 pointer-events-none -z-10"
                />
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-64">
                    {/* Search Input Bar */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="p-0.5 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto py-1 flex-1 max-h-48 divide-y divide-slate-50">
                        {filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No matching results found.
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                                            isSelected
                                                ? "bg-blue-50/80 text-blue-900 font-bold"
                                                : "hover:bg-slate-50 text-slate-700"
                                        }`}
                                    >
                                        <div className="flex flex-col truncate mr-2">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="truncate">{opt.label}</span>
                                                {opt.badge && (
                                                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium shrink-0">
                                                        {opt.badge}
                                                    </span>
                                                )}
                                            </div>
                                            {opt.subtitle && (
                                                <span className="text-[10px] text-slate-400 truncate">
                                                    {opt.subtitle}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer count indicator */}
                    {options.length > 5 && (
                        <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
                            <span>Showing {filteredOptions.length} of {options.length}</span>
                            {searchQuery && <span>Filter active</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
