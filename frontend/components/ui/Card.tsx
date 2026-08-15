import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`px-6 py-5 border-b border-gray-100/50 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <h3 className={`text-base font-semibold text-gray-800 ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`p-6 ${className}`}>{children}</div>;
}
