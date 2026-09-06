"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    MessageSquare, 
    Send, 
    Sparkles, 
    Brain, 
    Bot, 
    User,
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AINaturalLanguageAnalyticsPage() {
    const { authData } = useAuth();
    const [query, setQuery] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        {
            sender: "ai",
            text: "Hello Principal! I am your AI School Leadership Assistant. Ask me anything in natural language about student attendance, exam pass rates, faculty workloads, or SIP progress.",
            confidence: 0.98,
            followups: [
                "What is our current attendance rate for Grade 10?",
                "Which subject has the highest pass rate this term?",
                "List all active School Improvement Plan targets"
            ]
        }
    ]);

    const handleSendQuery = async (queryText?: string) => {
        const textToSubmit = queryText || query;
        if (!textToSubmit.trim()) return;

        const userMsg = { sender: "user", text: textToSubmit };
        setMessages((prev) => [...prev, userMsg]);
        if (!queryText) setQuery("");

        try {
            setSubmitting(true);
            const res = await fetchApi("/ai-leadership/natural-language", {
                method: "POST",
                body: JSON.stringify({ query: textToSubmit })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "ai",
                        text: data.aiAnswer,
                        confidence: data.confidenceScore,
                        followups: data.suggestedFollowups
                    }
                ]);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 14.7: Conversational Natural-Language School Analytics
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal & Executive Administrators.
                        <br />
                        <strong>Data Source:</strong> Natural language query AI model queried via REST API (`/api/ai-leadership/natural-language`).
                        <br />
                        <strong>SRS Purpose:</strong> Allows principals to ask questions in plain natural language and receive real-time database intelligence.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <MessageSquare className="w-7 h-7 text-purple-600" />
                        <span>7. Natural-Language School Analytics</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Conversational AI query interface for instant institutional data lookup.</p>
                </div>
            </div>

            {/* Chat Container */}
            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="py-3 border-b border-gray-100 bg-gray-50/50">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center">
                        <Bot className="w-4 h-4 mr-2 text-purple-600" />
                        AI School Leadership Assistant
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-3 max-h-[450px] overflow-y-auto p-2">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-3.5 rounded-xl max-w-xl text-sm ${
                                    m.sender === 'user' ? 'bg-[#006b3f] text-white font-medium' : 'bg-gray-100 text-gray-900 border border-gray-200'
                                }`}>
                                    <div className="flex items-center space-x-2 mb-1">
                                        {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-purple-600" />}
                                        <span className="text-xs font-bold">{m.sender === 'user' ? 'You' : 'AI Leadership Assistant'}</span>
                                    </div>
                                    <p className="whitespace-pre-line">{m.text}</p>
                                </div>

                                {m.followups && (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Suggested Queries:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.followups.map((f: string, fIdx: number) => (
                                                <button
                                                    key={fIdx}
                                                    onClick={() => handleSendQuery(f)}
                                                    className="text-xs bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors"
                                                >
                                                    "{f}"
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }} className="flex space-x-2 border-t pt-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask AI anything about your school..."
                            className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-600"
                        />
                        <Button type="submit" isLoading={submitting} leftIcon={<Send className="w-4 h-4" />} className="bg-purple-700 hover:bg-purple-800 text-white">
                            Ask AI
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
