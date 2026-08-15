"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { Layers, CheckCircle } from "lucide-react";

interface Grade {
    id: string;
    name: string;
    level: number;
}

export default function GradesPage() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadGrades = async () => {
            try {
                const res = await fetchApi("/academic/grades");
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || "Failed to load grades");
                }
                
                setGrades(data);
            } catch (err: any) {
                setError(err.message || "Failed to load grades");
            } finally {
                setLoading(false);
            }
        };

        loadGrades();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center space-x-2 text-gray-800">
                        <Layers className="h-6 w-6 text-blue-500" />
                        <span>Grades & Sections</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Manage the grades and classes offered by the school.</p>
                </div>
                <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium shadow transition-colors">
                    + Add Grade
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading grades...</div>
                ) : grades.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Layers className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No Grades Found</p>
                        <p className="text-sm">Add grades to establish the school's educational levels.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Level</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {grades.map((grade) => (
                                <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="inline-flex items-center justify-center bg-gray-100 rounded-full h-8 w-8 text-sm font-bold text-gray-700">
                                            {grade.level}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {grade.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-500 hover:text-blue-900 mx-2">Manage Sections</button>
                                        <button className="text-gray-500 hover:text-gray-700">Edit</button>
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
