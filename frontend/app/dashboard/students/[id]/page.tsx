"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { User, Phone, MapPin, School, FileText, ArrowLeft, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function StudentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const studentId = params.id as string;

    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, title: string, isImage: boolean } | null>(null);

    useEffect(() => {
        const loadStudent = async () => {
            try {
                setLoading(true);
                const res = await fetchApi(`/student/${studentId}`);
                if (!res.ok) throw new Error("Failed to load student profile");
                setStudent(await res.json());
                setError(null);
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            loadStudent();
        }
    }, [studentId]);

    if (loading) return <LoadingState message="Loading student profile..." />;
    if (error || !student) return <ErrorState message={error || "Student not found"} onRetry={() => router.back()} />;

    const docs = student.documents || {};
    const hasDocs = Object.values(docs).some(Boolean);

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

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Enrollments
                </Button>
            </div>

            {/* HEADER */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="w-32 h-32 shrink-0 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                    {student.photoUrl ? (
                        <img src={student.photoUrl} alt="Student Photo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-12 h-12" />
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center"><GraduationCap className="w-4 h-4 mr-2" /> ID: {student.studentId}</div>
                        <div className="flex items-center"><User className="w-4 h-4 mr-2" /> {student.gender}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COL */}
                <div className="space-y-6 lg:col-span-2">
                    {/* ENROLLMENTS */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-3">
                            <School className="w-5 h-5 mr-2 text-[#006b3f]" /> Enrollment History
                        </h2>
                        {student.enrollments && student.enrollments.length > 0 ? (
                            <div className="space-y-4">
                                {student.enrollments.map((enr: any) => (
                                    <div key={enr.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-900">{enr.academicYear?.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {enr.schoolGrade?.grade?.name} {enr.section ? ` - Section ${enr.section.name}` : ""}
                                            </p>
                                        </div>
                                        <div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${enr.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {enr.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No enrollments found.</p>
                        )}
                    </div>

                    {/* PERSONAL INFO */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-3">Personal Details</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                            <div><p className="text-gray-500">Father's Name</p><p className="font-medium text-gray-900">{student.fatherName}</p></div>
                            <div><p className="text-gray-500">Grandfather's Name</p><p className="font-medium text-gray-900">{student.grandfatherName}</p></div>
                            <div><p className="text-gray-500">Date of Birth</p><p className="font-medium text-gray-900">{new Date(student.dateOfBirth).toLocaleDateString()}</p></div>
                            <div><p className="text-gray-500">Nationality</p><p className="font-medium text-gray-900">{student.nationality}</p></div>
                            <div><p className="text-gray-500">Place of Birth</p><p className="font-medium text-gray-900">{student.placeOfBirth}</p></div>
                            <div><p className="text-gray-500">Previous School</p><p className="font-medium text-gray-900">{student.previousSchool || "N/A"}</p></div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL */}
                <div className="space-y-6 lg:col-span-1">
                    {/* ADDRESS & EMERGENCY */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-3">
                            <MapPin className="w-5 h-5 mr-2 text-[#006b3f]" /> Contact & Address
                        </h2>
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="text-gray-500 font-semibold mb-1">Emergency Contact</p>
                                <p className="font-medium text-gray-900">{student.emergencyContactName} ({student.emergencyContactRelation})</p>
                                <p className="text-gray-600 flex items-center mt-1"><Phone className="w-3 h-3 mr-1" /> {student.emergencyContactPhone}</p>
                            </div>
                            <div className="pt-3 border-t">
                                <p className="text-gray-500 font-semibold mb-1">Address</p>
                                <p className="text-gray-900">{student.region}, {student.city}</p>
                                <p className="text-gray-600">Sub-city/Zone: {student.zone}</p>
                                <p className="text-gray-600">Woreda: {student.woreda}</p>
                                <p className="text-gray-600">House No: {student.houseNumber}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DOCUMENTS PREVIEW */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-3">
                    <FileText className="w-5 h-5 mr-2 text-[#006b3f]" /> Registration Documents
                </h2>
                
                {hasDocs ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {renderDocument("Birth Certificate", docs.birthCertificate)}
                        {renderDocument("Previous Transcript", docs.transcript)}
                        {renderDocument("Parent/Guardian ID", docs.parentID)}
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
