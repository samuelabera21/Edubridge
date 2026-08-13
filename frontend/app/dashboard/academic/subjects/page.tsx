"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { BookOpenText } from "lucide-react";

interface Subject {
    id: string;
    name: string;
    code: string | null;
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadSubjects = async () => {
            try {
                const res = await fetchApi("/academic/subjects");
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || "Failed to load subjects");
                }
                
                setSubjects(data);
            } catch (err: any) {
                setError(err.message || "Failed to load subjects");
            } finally {
                setLoading(false);
            }
        };

        loadSubjects();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center space-x-2 text-gray-800">
                        <BookOpenText className="h-6 w-6 text-blue-600" />
                        <span>Subjects</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Manage the subjects offered in the curriculum.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium shadow transition-colors">
                    + Add Subject
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading subjects...</div>
                ) : subjects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <BookOpenText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No Subjects Found</p>
                        <p className="text-sm">Add subjects to build the school's curriculum.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {subjects.map((subject) => (
                                <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                                        {subject.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {subject.code ? (
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-xs">{subject.code}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mx-2">Edit</button>
                                        <button className="text-gray-500 hover:text-gray-700">Delete</button>
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
