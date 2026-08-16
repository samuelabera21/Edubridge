"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { Layers, GraduationCap, Users, AlertCircle, RefreshCw } from "lucide-react";

export default function AcademicOrganizationPage() {
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [activeYear, setActiveYear] = useState<any>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [selectedGrade, setSelectedGrade] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    
    const [loadingYears, setLoadingYears] = useState(true);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [loadingSections, setLoadingSections] = useState(false);
    
    const [error, setError] = useState<string | null>(null);

    const loadAcademicYears = async () => {
        setLoadingYears(true);
        setError(null);
        try {
            const res = await fetchApi("/vice-principal/academic/years");
            if (res.ok) {
                const data = await res.json();
                setAcademicYears(data || []);
                const current = data.find((y: any) => y.status === "ACTIVE") || (data.length > 0 ? data[0] : null);
                setActiveYear(current);
            } else {
                setError("Unable to load academic organization. Please try again.");
            }
        } catch (err) {
            console.error("Failed to load academic years:", err);
            setError("Unable to load academic organization. Please try again.");
        } finally {
            setLoadingYears(false);
        }
    };

    useEffect(() => {
        loadAcademicYears();
    }, []);

    useEffect(() => {
        const loadGrades = async () => {
            if (!activeYear) {
                setGrades([]);
                return;
            }
            
            setLoadingGrades(true);
            setError(null);
            try {
                const res = await fetchApi(`/vice-principal/academic/years/${activeYear.id}/grades`);
                if (res.ok) {
                    const data = await res.json();
                    setGrades(data || []);
                    setSelectedGrade(null);
                    setSections([]);
                } else {
                    setError("Failed to load grades for the selected academic year.");
                }
            } catch (err) {
                console.error("Failed to load grades:", err);
                setError("Unable to load grades. Please try again.");
            } finally {
                setLoadingGrades(false);
            }
        };

        if (!loadingYears) {
            loadGrades();
        }
    }, [activeYear, loadingYears]);

    useEffect(() => {
        const loadSections = async () => {
            if (!selectedGrade) {
                setSections([]);
                return;
            }

            setLoadingSections(true);
            try {
                const res = await fetchApi(`/vice-principal/academic/grades/${selectedGrade.id}/sections`);
                if (res.ok) {
                    const data = await res.json();
                    setSections(data || []);
                } else {
                    setError("Failed to load sections.");
                }
            } catch (err) {
                console.error("Failed to load sections:", err);
                setError("Unable to load sections. Please try again.");
            } finally {
                setLoadingSections(false);
            }
        };

        loadSections();
    }, [selectedGrade]);

    if (loadingYears) {
        return (
            <div className="w-full max-w-6xl mx-auto space-y-6">
                <div className="animate-pulse bg-gray-200 h-32 rounded-xl w-full"></div>
                <div className="animate-pulse bg-gray-200 h-64 rounded-xl w-full"></div>
            </div>
        );
    }

    if (error && !activeYear) {
        return (
            <div className="w-full max-w-6xl mx-auto mt-10">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex flex-col items-center justify-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                    <p className="font-medium text-lg">{error}</p>
                    <button 
                        onClick={loadAcademicYears} 
                        className="flex items-center px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 pb-10">
            {/* Header / Context */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Academic Organization</h1>
                    <p className="text-gray-500">View grades and sections structure.</p>
                </div>
                
                {activeYear && (
                    <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg flex items-center space-x-3">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Academic Year</p>
                            <p className="font-bold text-blue-900">{activeYear.name}</p>
                        </div>
                    </div>
                )}
            </div>

            {error && activeYear && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Academic Structure Indicators */}
            {activeYear && !loadingGrades && !error && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex space-x-12">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Total Grades</p>
                        <p className="text-2xl font-bold text-gray-900">{grades.length}</p>
                    </div>
                    {/* Note: Sections aggregate count could be queried, but skipping to avoid N+1 requests if not explicitly provided by backend yet */}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Grades Column */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center space-x-3">
                            <Layers className="w-5 h-5 text-[#006b3f]" />
                            <h2 className="font-semibold text-gray-900">Grades</h2>
                        </div>
                    </div>
                    <div className="p-0">
                        {loadingGrades ? (
                            <div className="p-10 flex justify-center"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>
                        ) : grades.length === 0 ? (
                            <div className="p-8 text-center">
                                <h3 className="font-semibold text-gray-900 mb-1">No grades configured</h3>
                                <p className="text-sm text-gray-500">There are currently no grades configured for this academic year.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {grades.map((schoolGrade) => (
                                    <li key={schoolGrade.id}>
                                        <button 
                                            onClick={() => setSelectedGrade(schoolGrade)}
                                            className={`w-full text-left p-5 flex justify-between items-center transition-colors ${selectedGrade?.id === schoolGrade.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                                        >
                                            <div>
                                                <h3 className={`font-bold ${selectedGrade?.id === schoolGrade.id ? 'text-blue-900' : 'text-gray-900'}`}>{schoolGrade.grade.name}</h3>
                                                <div className="flex items-center space-x-3 mt-1">
                                                    {schoolGrade.grade.code && <span className="text-xs text-gray-500">Code: {schoolGrade.grade.code}</span>}
                                                    <span className="text-xs text-gray-500 font-medium">Sections: {schoolGrade._count?.sections || 0}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                Active
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Sections Column */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center space-x-3">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-semibold text-gray-900">
                                {selectedGrade ? `Sections: ${selectedGrade.grade.name}` : 'Sections'}
                            </h2>
                        </div>
                    </div>
                    <div className="p-0">
                        {!selectedGrade ? (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-500">Select a grade to view its sections.</p>
                            </div>
                        ) : loadingSections ? (
                            <div className="p-10 flex justify-center"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>
                        ) : sections.length === 0 ? (
                            <div className="p-8 text-center">
                                <h3 className="font-semibold text-gray-900 mb-1">No sections configured</h3>
                                <p className="text-sm text-gray-500">This grade does not currently have any sections.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {sections.map((section) => (
                                    <li key={section.id} className="p-5 hover:bg-gray-50 transition-colors flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{section.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Students: {section._count?.studentEnrollments || 0}</p>
                                        </div>
                                        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                            Active
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
