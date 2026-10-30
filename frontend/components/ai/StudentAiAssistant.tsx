"use client";

import React, { useState, useEffect } from "react";
import StudentAiChatDrawer from "./StudentAiChatDrawer";

const OPEN_STUDENT_AI_EVENT = "open-student-ai-drawer";

/**
 * Programmatic helper to trigger the Student AI Assistant from anywhere in the app
 */
export const openStudentAiAssistant = (initialQuestion?: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OPEN_STUDENT_AI_EVENT, { detail: { initialQuestion } })
    );
  }
};

interface StudentAiAssistantProps {
  className?: string;
  initialQuestion?: string;
}

export default function StudentAiAssistant({
  className = "",
  initialQuestion,
}: StudentAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | undefined>(initialQuestion);

  // Global keyboard shortcut (Ctrl+K or Cmd+K) and custom event listener
  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ initialQuestion?: string }>).detail;
      if (detail?.initialQuestion) {
        setActiveQuestion(detail.initialQuestion);
      }
      setIsOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (isEditing) return;
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener(OPEN_STUDENT_AI_EVENT, handleCustomOpen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(OPEN_STUDENT_AI_EVENT, handleCustomOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* CANVA-STYLE CIRCULAR BLUE "?" BUTTON (Bottom-Right, matching School Admin UI) */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
          title="Ask EduBridge AI Tutor (Ctrl+K)"
          aria-label="Ask EduBridge AI Tutor (Ctrl+K)"
        >
          <span className="text-xl sm:text-2xl font-bold leading-none select-none font-sans">
            ?
          </span>
        </button>
      </div>

      {/* Slide-over Popover Chat Drawer */}
      <StudentAiChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialQuestion={activeQuestion}
      />
    </>
  );
}
