import React from "react";

export function Card({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`px-6 py-5 border-b border-gray-100/50 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={`text-base font-semibold text-gray-800 ${className}`} {...props}>{children}</h3>;
}

export function CardContent({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`p-6 ${className}`} {...props}>{children}</div>;
}
