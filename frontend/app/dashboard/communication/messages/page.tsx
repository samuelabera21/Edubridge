"use client";

import { useState } from "react";
import { MessageSquare, Plus, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MessagesPage() {
    const [messages] = useState<any[]>([]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <MessageSquare className="w-6 h-6 mr-2 text-blue-500" />
                        Direct Messages
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Communicate directly with staff, parents, and students.</p>
                </div>
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                    New Message
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border-r h-[600px] flex flex-col">
                    <CardHeader className="bg-gray-50/50 py-4">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Search conversations..." 
                                className="bg-white border text-sm rounded-md pl-4 pr-10 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                            />
                            <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-y-auto">
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No active conversations found.
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 h-[600px] flex flex-col justify-center items-center">
                    {messages.length === 0 ? (
                        <EmptyState 
                            title="No Message Selected" 
                            message="Select a conversation from the sidebar or start a new message." 
                        />
                    ) : (
                        <div>Content area</div>
                    )}
                </Card>
            </div>
        </div>
    );
}
