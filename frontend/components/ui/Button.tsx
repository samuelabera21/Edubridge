import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
}

export function Button({ 
    children, 
    variant = "primary", 
    size = "md", 
    isLoading = false, 
    leftIcon,
    className = "",
    disabled,
    ...props 
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-[#4085b3] text-white hover:bg-[#32698e] focus:ring-[#4085b3]",
        secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 focus:ring-slate-400",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
        outline: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-xs",
        lg: "px-6 py-3 text-sm"
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
        </button>
    );
}
