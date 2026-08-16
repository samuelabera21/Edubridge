"use client";

import { useState } from "react";
import { FileDown, FileText, CheckCircle } from "lucide-react";

export default function AcademicReportsPage() {
    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownload = (reportName: string) => {
        setDownloading(reportName);
        
        // Mock a download delay
        setTimeout(() => {
            setDownloading(null);
            // In a real app, this would trigger a file download via API
            alert(`Downloaded ${reportName} report successfully!`);
        }, 1500);
    };

    const reports = [
        { id: "attendance", name: "School Attendance Report", description: "Consolidated attendance trends and metrics for all grades.", icon: FileText },
        { id: "assessment", name: "Assessment Performance", description: "Pass rates and average scores across all subjects.", icon: FileText },
        { id: "curriculum", name: "Curriculum Progress", description: "Progress of completed lessons vs planned curriculum.", icon: FileText },
        { id: "workload", name: "Teacher Workload", description: "Breakdown of assigned classes and active teaching hours.", icon: FileText },
        { id: "intervention", name: "Student Interventions", description: "Log of all flagged students and active remedial activities.", icon: FileText },
    ];

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Academic Reports</h1>
                <p className="text-gray-500">Generate and download consolidated academic reports for school oversight.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <report.icon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h2 className="font-bold text-gray-900">{report.name}</h2>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-6 flex-grow">
                            {report.description}
                        </p>
                        
                        <button 
                            onClick={() => handleDownload(report.name)}
                            disabled={downloading === report.name}
                            className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
                                downloading === report.name 
                                    ? "bg-gray-100 text-gray-500 cursor-wait" 
                                    : "bg-[#006b3f] hover:bg-[#005a34] text-white"
                            }`}
                        >
                            {downloading === report.name ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <FileDown className="w-4 h-4" />
                                    <span>Download Report</span>
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
