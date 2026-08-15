import React from "react";
import { AlertCircle } from "lucide-react";

export function ErrorState({ 
    title = "An error occurred", 
    message = "We couldn't load this information. Please try again later.",
    onRetry
}: { 
    title?: string;
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 flex flex-col items-start space-y-3">
            <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <h3 className="text-lg font-bold">{title}</h3>
            </div>
            <p className="text-sm text-red-600">{message}</p>
            
            {onRetry && (
                <button 
                    onClick={onRetry}
                    className="mt-2 text-sm font-medium bg-red-100 hover:bg-red-200 px-4 py-2 rounded text-red-800 transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}
