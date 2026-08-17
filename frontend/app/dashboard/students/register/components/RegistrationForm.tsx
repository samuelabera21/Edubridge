"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AcademicYear } from "@/types/api";

export function RegistrationForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        // 1. Student Info
        firstName: "",
        fatherName: "",
        grandfatherName: "",
        dateOfBirth: "",
        gender: "MALE",
        nationality: "Ethiopian",
        placeOfBirth: "",
        
        // 2. Parent / Guardian (Currently not modeled perfectly, so we just map to what we have or ignore/store as metadata if needed later, but the UI is here)
        primaryGuardianName: "",
        guardianRelationship: "Mother",
        guardianPhone: "",
        altPhone: "",
        motherName: "",
        motherPhone: "",

        // 3. Address
        region: "Addis Ababa",
        zone: "",
        woreda: "",
        city: "Addis Ababa",
        kebele: "",
        houseNumber: "",

        // 4. Enrollment
        studentId: "",
        academicYearId: "",
        schoolGradeId: "",
        sectionId: "",
        enrollmentDate: new Date().toISOString().split('T')[0],
        enrollmentType: "New",

        // 5. Previous School
        previousSchool: "",
        previousStudentId: "",
        previousGrade: "",

        // 6. Documents (Dummy inputs)
        photoUrl: "", // Just string for now
        birthCertificate: "",
        transcript: "",

        // 7. Emergency Contact
        emergencyContactName: "",
        emergencyContactRelation: "",
        emergencyContactPhone: "",
    });

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

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            // Get Academic Years to find active
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            const active = yearsData.find(y => y.status === "ACTIVE");
            
            if (active) {
                setActiveYear(active);
                setFormData(prev => ({ ...prev, academicYearId: active.id }));
                
                // Fetch grades for the active year
                const gradesRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (gradesRes.ok) {
                    setGrades(await gradesRes.json());
                }
            }
        } catch (err) {
            console.error("Failed to load initial data", err);
        }
    };

    const loadSections = async (gradeId: string) => {
        if (!gradeId) return;
        try {
            const res = await fetchApi(`/academic/grades/${gradeId}/sections`);
            if (res.ok) setSections(await res.json());
        } catch (err) {
            console.error("Failed to load sections", err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === "schoolGradeId") {
            setFormData(prev => ({ ...prev, sectionId: "" }));
            loadSections(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create Student Profile (includes all the new DB fields we just migrated)
            const studentPayload = {
                firstName: formData.firstName,
                lastName: `${formData.fatherName} ${formData.grandfatherName}`.trim(),
                fatherName: formData.fatherName,
                grandfatherName: formData.grandfatherName,
                studentId: formData.studentId,
                dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
                gender: formData.gender,
                nationality: formData.nationality,
                placeOfBirth: formData.placeOfBirth,
                region: formData.region,
                zone: formData.zone,
                woreda: formData.woreda,
                city: formData.city,
                kebele: formData.kebele,
                houseNumber: formData.houseNumber,
                previousSchool: formData.previousSchool,
                previousStudentId: formData.previousStudentId,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactRelation: formData.emergencyContactRelation,
                emergencyContactPhone: formData.emergencyContactPhone,
                photoUrl: previews['photo']?.base64 || null,
                documents: {
                    birthCertificate: previews['birthCert']?.base64 || null,
                    transcript: previews['transcript']?.base64 || null,
                    parentID: previews['guardianId']?.base64 || null
                }
            };

            const studentRes = await fetchApi("/student", {
                method: "POST",
                body: JSON.stringify(studentPayload),
            });

            if (!studentRes.ok) {
                const data = await studentRes.json();
                throw new Error(data.error || "Failed to create student profile.");
            }

            const createdStudent = await studentRes.json();

            // 2. Enroll the Student
            const enrollRes = await fetchApi("/student/enrollments", {
                method: "POST",
                body: JSON.stringify({
                    studentId: createdStudent.id,
                    academicYearId: formData.academicYearId,
                    schoolGradeId: formData.schoolGradeId,
                    sectionId: formData.sectionId || undefined
                }),
            });

            if (!enrollRes.ok) {
                const data = await enrollRes.json();
                throw new Error(data.error || "Student created, but failed to enroll.");
            }

            // Success, navigate back to enrollments page
            router.push("/dashboard/students/enrollments");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}
            
            {/* 1. STUDENT INFORMATION */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">1. Student Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="First/Given Name *" name="firstName" value={formData.firstName} onChange={handleChange} required />
                    <Input label="Father's Name *" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                    <Input label="Grandfather's Name *" name="grandfatherName" value={formData.grandfatherName} onChange={handleChange} required />
                    <Input label="Date of Birth *" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
                    <Select label="Gender *" name="gender" value={formData.gender} onChange={handleChange} options={[{value: "MALE", label: "Male"}, {value: "FEMALE", label: "Female"}]} required />
                    <Input label="Nationality *" name="nationality" value={formData.nationality} onChange={handleChange} required />
                    <Input label="Place of Birth *" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} required />
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
                        <div className="flex items-center gap-4">
                            {renderPreview('photo')}
                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#006b3f]/10 file:text-[#006b3f] hover:file:bg-[#006b3f]/20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. PARENT / GUARDIAN */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">2. Parent / Guardian</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="Primary Guardian *" name="primaryGuardianName" value={formData.primaryGuardianName} onChange={handleChange} required />
                    <Select label="Relationship *" name="guardianRelationship" value={formData.guardianRelationship} onChange={handleChange} options={[
                        {value: "Mother", label: "Mother"}, {value: "Father", label: "Father"}, {value: "Guardian", label: "Guardian"}, {value: "Other", label: "Other"}
                    ]} required />
                    <Input label="Phone Number *" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} required />
                    <Input label="Alternative Phone" name="altPhone" value={formData.altPhone} onChange={handleChange} />
                    <Input label="Mother's Full Name" name="motherName" value={formData.motherName} onChange={handleChange} />
                    <Input label="Mother's Phone" name="motherPhone" value={formData.motherPhone} onChange={handleChange} />
                </div>
            </div>

            {/* 3. ADDRESS */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">3. Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="Region *" name="region" value={formData.region} onChange={handleChange} required />
                    <Input label="Zone" name="zone" value={formData.zone} onChange={handleChange} />
                    <Input label="Woreda *" name="woreda" value={formData.woreda} onChange={handleChange} required />
                    <Input label="City/Town" name="city" value={formData.city} onChange={handleChange} />
                    <Input label="Kebele" name="kebele" value={formData.kebele} onChange={handleChange} />
                    <Input label="House Number" name="houseNumber" value={formData.houseNumber} onChange={handleChange} />
                </div>
            </div>

            {/* 4. ENROLLMENT */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">4. Enrollment</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Student ID (System) *</label>
                        <input value="Auto-generated upon save" readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                    <Input label="Academic Year" value={activeYear?.name || "Loading..."} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Enrollment Date *</label>
                        <input value={new Date().toLocaleDateString()} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                    <Select label="Enrollment Type *" name="enrollmentType" value={formData.enrollmentType} onChange={handleChange} options={[
                        {value: "New", label: "New Student"}, {value: "Transfer", label: "Transfer-in"}
                    ]} required />
                    <Select label="Grade *" name="schoolGradeId" value={formData.schoolGradeId} onChange={handleChange} options={grades.map(g => ({value: g.id, label: g.grade?.name || "Unknown"}))} required />
                    <Select label="Section (Optional)" name="sectionId" value={formData.sectionId} onChange={handleChange} options={sections.map(s => ({value: s.id, label: s.name}))} />
                </div>
            </div>

            {/* 5. PREVIOUS SCHOOL */}
            {formData.enrollmentType === "Transfer" && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">5. Previous School</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="Previous School" name="previousSchool" value={formData.previousSchool} onChange={handleChange} />
                        <Input label="Previous Student ID" name="previousStudentId" value={formData.previousStudentId} onChange={handleChange} />
                        <Input label="Previous Grade" name="previousGrade" value={formData.previousGrade} onChange={handleChange} />
                    </div>
                </div>
            )}

            {/* 6. DOCUMENTS */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">6. Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Age / Birth Certificate</label>
                        <div className="flex items-center gap-4">
                            {renderPreview('birthCert')}
                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'birthCert')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian ID</label>
                        <div className="flex items-center gap-4">
                            {renderPreview('guardianId')}
                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'guardianId')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Records / Transcript</label>
                        <div className="flex items-center gap-4">
                            {renderPreview('transcript')}
                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'transcript')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 7. EMERGENCY CONTACT */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">7. Emergency Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} />
                    <Input label="Relationship" name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleChange} />
                    <Input label="Phone Number" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} />
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/students/enrollments")}>Cancel</Button>
                <Button type="submit" isLoading={loading} size="lg">Register & Enroll Student</Button>
            </div>
        </form>
    );
}
