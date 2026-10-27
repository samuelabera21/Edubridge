"use client";

import React, { useState } from "react";
import { Sparkles, Bot, MessageSquare } from "lucide-react";
import EmisAiChatDrawer from "./EmisAiChatDrawer";

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

    return (
        <>
            {variant === "floating" && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-slate-900 via-[#1e3a5f] to-[#4085b3] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group cursor-pointer ${className}`}
                    title="Open EMIS Executive AI Assistant"
                >
                    <div className="relative">
                        <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse group-hover:rotate-12 transition-transform" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                    </div>
                    <span className="text-xs font-bold tracking-wide">{buttonLabel}</span>
                </button>
            )}

            {variant === "header-pill" && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={`px-3 py-1.5 bg-gradient-to-r from-slate-900 via-[#1e3a5f] to-[#4085b3] hover:from-slate-800 hover:to-[#32698e] text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer group ${className}`}
                    title="Ask EMIS Natural Language AI"
                >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse group-hover:rotate-12 transition-transform" />
                    <span>{buttonLabel}</span>
                    <span className="text-[10px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.2 rounded font-mono">
                        AI
                    </span>
                </button>
            )}

            {variant === "button" && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={`px-3.5 py-1.5 border border-slate-300 hover:border-[#4085b3] bg-white hover:bg-blue-50/60 text-slate-700 hover:text-[#4085b3] text-sm font-medium rounded transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs ${className}`}
                >
                    <Bot className="w-4 h-4 text-[#4085b3]" />
                    <span>{buttonLabel}</span>
                </button>
            )}

            <EmisAiChatDrawer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialQuestion={initialQuestion}
            />
        </>
    );
}
