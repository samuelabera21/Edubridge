"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { User, Phone, MapPin, School, BookOpen, ArrowLeft, GraduationCap, FileText, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function TeacherProfilePage() {
    const params = useParams();
    const router = useRouter();
    const teacherId = params.id as string;

    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, title: string, isImage: boolean } | null>(null);

    const renderDocument = (title: string, base64Url: string | null) => {
        if (!base64Url) return null;
        
        const isImage = base64Url.startsWith('data:image');
        
        return (
            <div className="flex flex-col items-center bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
                <div 
                    className="relative w-full aspect-square overflow-hidden rounded-lg bg-white border border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#006b3f] group"
                    onClick={() => setPreviewDoc({ url: base64Url, title, isImage })}
                >
                    {isImage ? (
                        <img src={base64Url} alt={title} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-[#006b3f] group-hover:text-green-800">
                            <FileText className="w-12 h-12 mb-2" />
                            <span className="text-sm font-medium">Click to View</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    useEffect(() => {
        const loadTeacher = async () => {
            try {
                setLoading(true);
                const res = await fetchApi(`/teacher/${teacherId}`);
                if (!res.ok) throw new Error("Failed to load teacher profile");
                setTeacher(await res.json());
                setError(null);
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        if (teacherId) {
            loadTeacher();
        }
    }, [teacherId]);

    if (loading) return <LoadingState message="Loading teacher profile..." />;
    if (error || !teacher) return <ErrorState message={error || "Teacher not found"} onRetry={() => router.back()} />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Directory
                </Button>
            </div>

            {/* HEADER */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="w-32 h-32 shrink-0 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                    {teacher.photoUrl ? (
                        <img src={teacher.photoUrl} alt="Teacher Photo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-12 h-12" />
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</h1>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center"><User className="w-4 h-4 mr-2" /> {teacher.employeeId || "No Employee ID"}</div>
                        <div className="flex items-center"><GraduationCap className="w-4 h-4 mr-2" /> {teacher.qualification || "Unspecified Qualification"}</div>
                        <div className="flex items-center">
                            {teacher.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active Faculty
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {teacher.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Personal Info
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Full Name</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.firstName} {teacher.lastName} {teacher.grandfatherName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Gender</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.gender || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date of Birth</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Years of Experience</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.yearsOfExperience || 0} years</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Phone className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Contact
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phone</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.email || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Address
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Region & Zone</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.region || "N/A"}, {teacher.zone || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Woreda, Kebele & House</p>
                                <p className="text-sm font-medium text-gray-900">{teacher.woreda || "N/A"}, {teacher.kebele || "N/A"}, House: {teacher.houseNumber || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Teaching Assignments
                            </h3>
                        </div>
                        <div className="p-0">
                            {teacher.assignments?.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <School className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p>No active teaching assignments found.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3">Academic Year</th>
                                                <th className="px-6 py-3">Subject</th>
                                                <th className="px-6 py-3">Grade</th>
                                                <th className="px-6 py-3">Section</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {teacher.assignments?.map((assignment: any) => (
                                                <tr key={assignment.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-medium">{assignment.academicYear?.name || "Unknown"}</td>
                                                    <td className="px-6 py-4 text-gray-600">{assignment.subject?.name || "Unknown"}</td>
                                                    <td className="px-6 py-4 text-gray-600">{assignment.schoolGrade?.grade?.name || "Unknown"}</td>
                                                    <td className="px-6 py-4 text-gray-600">{assignment.section?.name || "All Sections"}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {assignment.sectionId && assignment.schoolGradeId ? (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm"
                                                                onClick={() => router.push(`/dashboard/academics/grades/${assignment.schoolGradeId}/sections/${assignment.sectionId}`)}
                                                            >
                                                                View Students
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">N/A</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* DOCUMENTS PREVIEW */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-3">
                    <FileText className="w-5 h-5 mr-2 text-[#006b3f]" /> Registration Documents
                </h2>
                
                {teacher.documents ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {renderDocument("Supporting Document", teacher.documents)}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No documents uploaded during registration.</p>
                )}
            </div>

            {/* DOCUMENT MODAL */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-bold text-gray-900">{previewDoc.title}</h3>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={previewDoc.url} 
                                    download={previewDoc.title.replace(/\s+/g, '_')}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Download
                                </a>
                                <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
                            {previewDoc.isImage ? (
                                <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full max-h-[70vh] object-contain rounded shadow-sm" />
                            ) : (
                                <iframe src={previewDoc.url} className="w-full h-[70vh] bg-white rounded shadow-sm" title={previewDoc.title} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
