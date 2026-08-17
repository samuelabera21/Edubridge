"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { ArrowLeft, User, GraduationCap, MapPin, BookOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function TeacherRegistrationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Assignment Data
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        // Personal
        firstName: "",
        lastName: "",
        fatherName: "",
        grandfatherName: "",
        gender: "",
        dateOfBirth: "",
        employeeId: "",
        // Contact
        phoneNumber: "",
        email: "",
        // Professional
        qualification: "",
        fieldOfStudy: "",
        yearsOfExperience: "",
        // Address
        region: "",
        zone: "",
        woreda: "",
        city: "",
        kebele: "",
        houseNumber: "",
        // Initial Assignment
        academicYearId: "",
        schoolGradeId: "",
        sectionId: "",
        subjectId: ""
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [yearsRes, subjectsRes] = await Promise.all([
                    fetchApi("/academic/years"),
                    fetchApi("/academic/subjects")
                ]);
                
                if (yearsRes.ok) setAcademicYears(await yearsRes.json());
                if (subjectsRes.ok) setSubjects(await subjectsRes.json());
            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (formData.academicYearId) {
            fetchApi(`/academic/years/${formData.academicYearId}/grades`)
                .then(res => res.json())
                .then(data => setGrades(data || []))
                .catch(console.error);
        } else {
            setGrades([]);
            setFormData(prev => ({ ...prev, schoolGradeId: "", sectionId: "" }));
        }
    }, [formData.academicYearId]);

    useEffect(() => {
        if (formData.schoolGradeId) {
            const selectedGrade = grades.find(g => g.id === formData.schoolGradeId);
            setSections(selectedGrade?.sections || []);
        } else {
            setSections([]);
            setFormData(prev => ({ ...prev, sectionId: "" }));
        }
    }, [formData.schoolGradeId, grades]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [previews, setPreviews] = useState<{ [key: string]: { url: string, type: string, name: string, base64?: string } }>({});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPreviews(prev => ({ ...prev, [fieldName]: { url, type: file.type, name: file.name, base64 } }));
            };
            reader.readAsDataURL(file);
        }
    };

    const renderPreview = (fieldName: string) => {
        const preview = previews[fieldName];
        if (!preview) return null;

        const isImage = preview.type.startsWith('image/');

        return (
            <a href={preview.url} target="_blank" rel="noopener noreferrer" className="block shrink-0 overflow-hidden rounded-md border border-gray-200 hover:ring-2 hover:ring-[#006b3f] transition-all" title="Click to view">
                {isImage ? (
                    <img src={preview.url} alt="Preview" className="w-12 h-12 object-cover" />
                ) : (
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center flex-col">
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                )}
            </a>
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload: any = { 
                ...formData,
                photoUrl: previews['photo']?.base64 || null,
                documents: previews['document']?.base64 || null // Keeping simple for now
            };
            
            // Format initial assignment if completely filled
            if (payload.academicYearId && payload.schoolGradeId && payload.subjectId) {
                payload.initialAssignment = {
                    academicYearId: payload.academicYearId,
                    schoolGradeId: payload.schoolGradeId,
                    subjectId: payload.subjectId,
                    sectionId: payload.sectionId || undefined
                };
            }

            const res = await fetchApi("/teacher", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to register teacher");
            }

            router.push("/dashboard/teachers");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/teachers">
                        <Button variant="ghost" size="sm" className="mb-2 -ml-4 text-gray-500" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                            Back to Directory
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Register New Teacher</h1>
                    <p className="text-sm text-gray-500 mt-1">Add a new faculty member to the school system.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Personal Information */}
                <Card>
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <CardTitle className="flex items-center text-lg">
                            <User className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                            <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="Enter first name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Father's Name <span className="text-red-500">*</span></label>
                            <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="Enter father's name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Grandfather's Name</label>
                            <input type="text" name="grandfatherName" value={formData.grandfatherName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="Enter grandfather's name" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]">
                                <option value="">Select Gender</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Staff / Employee ID</label>
                            <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="e.g. TR-2023-001" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Professional Details */}
                <Card>
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <CardTitle className="flex items-center text-lg">
                            <GraduationCap className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Professional Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Highest Qualification</label>
                            <select name="qualification" value={formData.qualification} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]">
                                <option value="">Select Qualification</option>
                                <option value="Certificate">Certificate</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Bachelors Degree">Bachelors Degree</option>
                                <option value="Masters Degree">Masters Degree</option>
                                <option value="PhD">PhD</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Field of Study</label>
                            <input type="text" name="fieldOfStudy" value={formData.fieldOfStudy} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="e.g. Applied Mathematics" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Years of Experience</label>
                            <input type="number" min="0" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="0" />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Contact & Address */}
                <Card>
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <CardTitle className="flex items-center text-lg">
                            <MapPin className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Contact & Address
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Phone Number</label>
                            <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="+251 9..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="teacher@school.edu.et" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Region</label>
                            <input type="text" name="region" value={formData.region} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="Addis Ababa" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Zone / Sub-city</label>
                            <input type="text" name="zone" value={formData.zone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="Bole" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Woreda</label>
                            <input type="text" name="woreda" value={formData.woreda} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" placeholder="03" />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Media & Documents */}
                <Card>
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <CardTitle className="flex items-center text-lg">
                            <User className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Photo & Documents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Profile Photo</label>
                            <div className="flex items-center gap-4">
                                {renderPreview('photo')}
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </div>
                            <p className="text-xs text-gray-500">Upload a professional headshot. (Optional)</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Supporting Documents</label>
                            <div className="flex items-center gap-4">
                                {renderPreview('document')}
                                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange(e, 'document')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </div>
                            <p className="text-xs text-gray-500">Upload degrees, CV, and ID copies.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Initial Assignment */}
                <Card>
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <CardTitle className="flex items-center text-lg">
                            <BookOpen className="w-5 h-5 mr-2 text-[#006b3f]" />
                            Initial Teaching Assignment (Optional)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <p className="text-sm text-gray-500 mb-6">You can immediately assign this teacher to a class. Leave blank if you prefer to assign them later.</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Academic Year</label>
                                <select name="academicYearId" value={formData.academicYearId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]">
                                    <option value="">Select Year</option>
                                    {academicYears.map(year => (
                                        <option key={year.id} value={year.id}>{year.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Subject</label>
                                <select name="subjectId" value={formData.subjectId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]">
                                    <option value="">Select Subject</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Grade</label>
                                <select name="schoolGradeId" value={formData.schoolGradeId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" disabled={!formData.academicYearId}>
                                    <option value="">Select Grade</option>
                                    {grades.map(grade => (
                                        <option key={grade.id} value={grade.id}>{grade.grade.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Section (Optional)</label>
                                <select name="sectionId" value={formData.sectionId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006b3f]/20 focus:border-[#006b3f]" disabled={!formData.schoolGradeId || sections.length === 0}>
                                    <option value="">All Sections / Not Specific</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>{section.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-6">
                    <Button type="submit" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                        Save Teacher Profile
                    </Button>
                </div>

            </form>
        </div>
    );
}
