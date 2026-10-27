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
            setIsOpen((prev) => !prev);
        } else {
            // Trigger through global coordinator
            openEmisAiAssistant(initialQuestion);
        }
    };

    return (
        <>
            {/* 1. CANVA-STYLE CIRCULAR BLUE "?" BUTTON (Bottom-Right) */}
            {variant === "floating" && (
                <div className="fixed bottom-6 right-6 z-40 select-none">
                    <button
                        type="button"
                        onClick={handleTriggerClick}
                        className={`flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
                        title="Ask EMIS AI (Ctrl+K)"
                        aria-label="Ask EMIS AI (Ctrl+K)"
                    >
                        <span className="text-xl sm:text-2xl font-bold leading-none select-none font-sans">
                            ?
                        </span>
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
