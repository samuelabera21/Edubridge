"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { BookOpen, Calendar, Clock, CheckCircle } from "lucide-react";

interface AcademicYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
}

export default function AcademicYearsPage() {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadYears = async () => {
            try {
                const res = await fetchApi("/academic/years");
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || "Failed to load academic years");
                }
                
                setYears(data);
            } catch (err: any) {
                setError(err.message || "Failed to load academic years");
            } finally {
                setLoading(false);
            }
        };

        loadYears();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "ACTIVE": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "PLANNED": return <Clock className="h-4 w-4 text-amber-500" />;
            default: return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center space-x-2 text-gray-800">
                        <Calendar className="h-6 w-6 text-blue-600" />
                        <span>Academic Years</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Manage the school's academic periods and operational timeline.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium shadow transition-colors">
                    + New Academic Year
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading academic years...</div>
                ) : years.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No Academic Years Found</p>
                        <p className="text-sm">Create an academic year to begin organizing the school structure.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {years.map((year) => (
                                <tr key={year.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-semibold text-gray-900">{year.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(year.startDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(year.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            year.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            year.status === 'PLANNED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}>
                                            {getStatusIcon(year.status)}
                                            <span className="ml-1.5">{year.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mx-2">Edit</button>
                                        <button className="text-gray-500 hover:text-gray-700">Configure</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
