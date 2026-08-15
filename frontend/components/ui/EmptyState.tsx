import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ 
    title = "No data found", 
    message = "There is currently no data to display here.",
    icon = <Inbox className="h-10 w-10 text-gray-400 mb-3" />
}: { 
    title?: string;
    message?: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            {icon}
            <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">{message}</p>
        </div>
    );
}
