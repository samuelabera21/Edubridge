"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import EmisAiChatDrawer from "./EmisAiChatDrawer";

const OPEN_AI_EVENT = "open-emis-ai-drawer";

/**
 * Programmatic helper to trigger the EMIS AI Assistant from anywhere in the app
 */
export const openEmisAiAssistant = (initialQuestion?: string) => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(OPEN_AI_EVENT, { detail: { initialQuestion } }));
    }
};

interface EmisAiAssistantProps {
    variant?: "floating" | "button" | "header-pill";
    buttonLabel?: string;
    initialQuestion?: string;
    className?: string;
}

export default function EmisAiAssistant({
    variant = "floating",
    buttonLabel = "Ask EMIS AI",
    initialQuestion,
    className = ""
}: EmisAiAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState<string | undefined>(initialQuestion);

    // Global keyboard shortcut (Ctrl+K or Cmd+K) and custom event listener
    useEffect(() => {
        // Only the floating or main mounting instance manages the global listener to avoid duplicate toggles
        if (variant !== "floating") return;

        const handleCustomOpen = (e: Event) => {
            const detail = (e as CustomEvent<{ initialQuestion?: string }>).detail;
            if (detail?.initialQuestion) {
                setActiveQuestion(detail.initialQuestion);
            }
            setIsOpen(true);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input/textarea/select
            const target = e.target as HTMLElement | null;
            const isEditing = target && (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            );

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                if (isEditing) return;
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };

        window.addEventListener(OPEN_AI_EVENT, handleCustomOpen);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener(OPEN_AI_EVENT, handleCustomOpen);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [variant]);

    const handleTriggerClick = () => {
        if (variant === "floating") {
            setIsOpen(true);
        } else {
            // Trigger through global coordinator
            openEmisAiAssistant(initialQuestion);
        }
    };

    return (
        <>
            {/* 1. FLOATING ULTRA-MODERN BLUE BUTTON (Bottom-Right) */}
            {variant === "floating" && (
                <div className="fixed bottom-6 right-6 z-40 group select-none">
                    {/* Ambient Glowing Outer Halo Ring (Idle Pulse) */}
                    <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-xl animate-ai-pulse-ring -z-10 pointer-events-none" />

                    <button
                        type="button"
                        onClick={handleTriggerClick}
                        className={`relative overflow-hidden flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#4085b3] text-white font-medium shadow-[0_12px_28px_rgba(37,99,235,0.45)] hover:shadow-[0_18px_36px_rgba(37,99,235,0.65)] border border-blue-200/50 hover:border-white/80 hover:scale-105 active:scale-95 transition-all duration-300 animate-ai-float cursor-pointer ${className}`}
                        title="Open EMIS Executive AI Assistant (Ctrl+K)"
                        aria-label="Open EMIS Executive AI Assistant (Ctrl+K)"
                    >
                        {/* Continuous Ambient Light Shimmer Reflection */}
                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none animate-ai-shimmer" />

                        {/* Animated Icon with Glowing Ping */}
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md shadow-inner shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                            <Sparkles className="w-4 h-4 text-cyan-200" />
                            {/* Live Active Beacon (Idle behavior) */}
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-80" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 border border-white" />
                            </span>
                        </div>

                        {/* Label & Subtitle Badge */}
                        <div className="flex flex-col text-left leading-none">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold tracking-tight text-white drop-shadow-xs">
                                    {buttonLabel}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/20 text-cyan-100 border border-white/30">
                                    Flash
                                </span>
                            </div>
                            <span className="text-[10px] text-blue-100/90 font-medium mt-0.5 flex items-center gap-1">
                                <span>National Intelligence</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </span>
                        </div>
                    </button>
                </div>
            )}

            {/* 2. TOP MASTHEAD HEADER PILL (Nav Bar) */}
            {variant === "header-pill" && (
                <button
                    type="button"
                    onClick={handleTriggerClick}
                    className={`relative overflow-hidden px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#4085b3] hover:from-[#1e40af] hover:to-[#1d4ed8] text-white text-xs font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)] border border-blue-200/40 hover:border-white/70 hover:scale-[1.02] active:scale-95 transition-all duration-200 inline-flex items-center gap-2 cursor-pointer group select-none ${className}`}
                    title="Ask EMIS Natural Language AI (Press Ctrl+K)"
                    aria-label="Ask EMIS Natural Language AI (Press Ctrl+K)"
                >
                    {/* Shimmer sweep */}
                    <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-ai-shimmer" />

                    <div className="relative flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-200 group-hover:rotate-12 transition-transform duration-200" />
                        <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
                        </span>
                    </div>

                    <span className="text-white font-bold tracking-tight text-xs drop-shadow-xs">
                        {buttonLabel}
                    </span>

                    {/* Modern keyboard badge matching Linear / GitHub */}
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/20 text-cyan-100 border border-white/20">
                        Ctrl K
                    </span>
                </button>
            )}

            {/* 3. STANDARD IN-PAGE ACTION BUTTON */}
            {variant === "button" && (
                <button
                    type="button"
                    onClick={handleTriggerClick}
                    className={`px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#4085b3] hover:from-[#1d4ed8] hover:to-[#2563eb] text-white text-sm font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-98 transition-all duration-200 inline-flex items-center gap-2 border border-blue-200/40 cursor-pointer ${className}`}
                >
                    <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                    <span>{buttonLabel}</span>
                </button>
            )}

            {/* Host the Slide-over Chat Drawer on the floating variant */}
            {variant === "floating" && (
                <EmisAiChatDrawer
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    initialQuestion={activeQuestion}
                />
            )}
        </>
    );
}
