import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
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
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-[#4085b3] text-white hover:bg-[#32698e] focus:ring-[#4085b3]",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
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
