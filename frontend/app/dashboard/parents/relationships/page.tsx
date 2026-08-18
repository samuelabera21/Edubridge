"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    HeartHandshake, 
    Plus, 
    Users, 
    UserCheck, 
    Phone, 
    Mail, 
    GraduationCap, 
    Trash2, 
    Link as LinkIcon,
    Search,
    Filter,
    X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

export default function StudentRelationshipsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState("");

    // Link Modal Filter States
    const [filterGradeId, setFilterGradeId] = useState<string>("");
    const [filterSectionId, setFilterSectionId] = useState<string>("");

    // Modal States
    const [isRegisterParentModalOpen, setIsRegisterParentModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // Form States
    const [parentForm, setParentForm] = useState({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: ""
    });

    const [linkForm, setLinkForm] = useState({
        parentId: "",
        studentId: "",
        relationship: "Mother",
        isPrimary: true,
        canPickup: true
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Load
    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Academic Years
            const yearsRes = await fetchApi("/academic/years");
            if (yearsRes.ok) {
                const yearsData: AcademicYear[] = await yearsRes.json();
                setYears(yearsData);
                const active = yearsData.find(y => y.status === "ACTIVE");
                setActiveYear(active || null);

                if (active) {
                    // Fetch SchoolGrades
                    const sgRes = await fetchApi(`/academic/years/${active.id}/grades`);
                    if (sgRes.ok) {
                        const sgData = await sgRes.json();
                        setSchoolGrades(sgData);
                        if (sgData.length > 0) {
                            setFilterGradeId(sgData[0].id);
                        }
                    }
                }
            }

            // 2. Fetch Parents Directory
            const parentsRes = await fetchApi("/parent");
            if (parentsRes.ok) {
                const parentsData = await parentsRes.json();
                setParents(parentsData);
            }

            // 3. Fetch Enrolled Students
            const enrollRes = await fetchApi("/student/enrollments");
            if (enrollRes.ok) {
                const enrollData = await enrollRes.json();
                setEnrollments(enrollData);
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Active sections for selected filterGradeId in modal
    const availableSections = useMemo(() => {
        if (!filterGradeId) return [];
        const sg = schoolGrades.find(g => g.id === filterGradeId);
        return sg?.sections || [];
    }, [filterGradeId, schoolGrades]);

    // Update default section filter when grade changes
    useEffect(() => {
        if (availableSections.length > 0) {
            setFilterSectionId(availableSections[0].id);
        } else {
            setFilterSectionId("");
        }
    }, [availableSections]);

    // Filtered Students Roster for Link Modal
    const filteredEnrollmentsForLinkModal = useMemo(() => {
        if (!filterSectionId) return enrollments;
        return enrollments.filter(e => e.sectionId === filterSectionId);
    }, [enrollments, filterSectionId]);

    // Filtered Parents Directory
    const filteredParents = useMemo(() => {
        if (!searchTerm) return parents;
        const term = searchTerm.toLowerCase();
        return parents.filter(p => 
            p.firstName.toLowerCase().includes(term) ||
            p.lastName.toLowerCase().includes(term) ||
            (p.phoneNumber && p.phoneNumber.toLowerCase().includes(term)) ||
            (p.email && p.email.toLowerCase().includes(term))
        );
    }, [parents, searchTerm]);

    // Handle Register Parent
    const handleRegisterParent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentForm.firstName || !parentForm.lastName) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parentForm)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || "Failed to register parent");
            }

            setIsRegisterParentModalOpen(false);
            setParentForm({ firstName: "", lastName: "", phoneNumber: "", email: "" });
            loadData();
        } catch (err: any) {
            alert(err.message || "Failed to register parent");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Link Guardian to Student
    const handleLinkGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkForm.parentId || !linkForm.studentId || !linkForm.relationship) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(linkForm)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || "Failed to link guardian to student");
            }

            setIsLinkModalOpen(false);
            setLinkForm({ parentId: "", studentId: "", relationship: "Mother", isPrimary: true, canPickup: true });
            loadData();
        } catch (err: any) {
            alert(err.message || "Failed to link guardian");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Unlink
    const handleUnlink = async (parentId: string, studentId: string) => {
        if (!confirm("Are you sure you want to remove this parent-student link?")) return;

        try {
            const res = await fetchApi(`/parent/${parentId}/link-student/${studentId}`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Failed to unlink");

            loadData();
        } catch (err: any) {
            alert(err.message || "Failed to unlink");
        }
    };

    const openLinkModalForParent = (parentId: string) => {
        setLinkForm(prev => ({ ...prev, parentId }));
        setIsLinkModalOpen(true);
    };

    if (loading) return <LoadingState message="Loading parent directory & relationships..." />;
    if (error) return <ErrorState message={error} onRetry={loadData} />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <HeartHandshake className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Parent & Guardian Relationships
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Register parent profiles and link them with enrolled students for school monitoring
                    </p>
                </div>

                <div className="flex space-x-3">
                    <Button 
                        variant="outline"
                        onClick={() => setIsRegisterParentModalOpen(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Register Parent
                    </Button>
                    <Button 
                        onClick={() => setIsLinkModalOpen(true)}
                        leftIcon={<LinkIcon className="w-4 h-4" />}
                        className="bg-[#006b3f] hover:bg-[#005432]"
                    >
                        Link Guardian to Student
                    </Button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Registered Parents</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{parents.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#006b3f]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-700 font-semibold uppercase">Enrolled Roster</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{enrollments.length} Students</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-emerald-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-700 font-semibold uppercase">Active Links</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">
                                {parents.reduce((sum, p) => sum + (p.children ? p.children.length : 0), 0)}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-blue-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search parent by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f]"
                />
            </div>

            {/* Parents Directory Table */}
            {filteredParents.length === 0 ? (
                <EmptyState 
                    title="No Parents Found" 
                    message="There are no parents registered matching your search criteria. Click 'Register Parent' to add one!" 
                />
            ) : (
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/70 border-b border-gray-200 py-4">
                        <CardTitle className="text-base font-semibold text-gray-900">
                            Parent Profiles & Linked Children Roster
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Parent Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Contact Details</th>
                                        <th className="px-6 py-3.5 font-semibold">Linked Children (Students)</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredParents.map((parent) => (
                                        <tr key={parent.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {parent.firstName} {parent.lastName}
                                            </td>
                                            <td className="px-6 py-4 space-y-1">
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                                    {parent.phoneNumber || "No phone"}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                                    {parent.email || "No email"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {parent.children && parent.children.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {parent.children.map((link: any) => {
                                                            const student = link.student;
                                                            const enrollment = student?.enrollments?.[0];
                                                            return (
                                                                <div key={link.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-200/60 text-xs">
                                                                    <div>
                                                                        <span className="font-bold text-gray-900">
                                                                            {student?.firstName} {student?.lastName}
                                                                        </span>
                                                                        <span className="ml-2 font-mono text-gray-500 font-normal">
                                                                            ({enrollment?.schoolGrade?.grade?.name || "Grade"} - Sec {enrollment?.section?.name || "A"})
                                                                        </span>
                                                                        <span className="ml-2 text-emerald-700 font-semibold bg-emerald-100/60 px-1.5 py-0.5 rounded text-[10px]">
                                                                            {link.relationship}
                                                                        </span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleUnlink(parent.id, student.id)}
                                                                        className="text-rose-500 hover:text-rose-700 ml-2"
                                                                        title="Unlink child"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No linked children</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => openLinkModalForParent(parent.id)}
                                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                >
                                                    Link Child
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Register Parent Modal */}
            {isRegisterParentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={handleRegisterParent} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                Register New Parent Profile
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setIsRegisterParentModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                    First Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Abaye1"
                                    value={parentForm.firstName}
                                    onChange={(e) => setParentForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                    Last Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Abera"
                                    value={parentForm.lastName}
                                    onChange={(e) => setParentForm(prev => ({ ...prev, lastName: e.target.value }))}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                placeholder="+251 911 223 344"
                                value={parentForm.phoneNumber}
                                onChange={(e) => setParentForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="sami21.good.bad@gmail.com"
                                value={parentForm.email}
                                onChange={(e) => setParentForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterParentModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                Save Parent
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Link Guardian to Student Modal with Grade & Section Filters */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={handleLinkGuardian} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                Link Parent / Guardian to Student
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setIsLinkModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Select Parent */}
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Select Parent Profile
                            </label>
                            <select
                                required
                                value={linkForm.parentId}
                                onChange={(e) => setLinkForm(prev => ({ ...prev, parentId: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                            >
                                <option value="">-- Select Parent Profile --</option>
                                {parents.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.firstName} {p.lastName} ({p.phoneNumber || p.email || "No contact"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Grade & Section Filter for Student Dropdown */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                            <p className="text-xs font-bold text-gray-700 flex items-center uppercase tracking-wider">
                                <Filter className="w-3.5 h-3.5 mr-1 text-[#006b3f]" /> Filter Students by Class
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                        Grade
                                    </label>
                                    <select
                                        value={filterGradeId}
                                        onChange={(e) => setFilterGradeId(e.target.value)}
                                        className="w-full h-9 px-2.5 border border-gray-300 rounded-md text-xs bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                                    >
                                        {schoolGrades.map((sg) => (
                                            <option key={sg.id} value={sg.id}>
                                                {sg.grade?.name || "Grade"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                        Section
                                    </label>
                                    <select
                                        value={filterSectionId}
                                        onChange={(e) => setFilterSectionId(e.target.value)}
                                        className="w-full h-9 px-2.5 border border-gray-300 rounded-md text-xs bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                                    >
                                        {availableSections.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                Section {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Select Student */}
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Select Enrolled Student ({filteredEnrollmentsForLinkModal.length} available)
                            </label>
                            <select
                                required
                                value={linkForm.studentId}
                                onChange={(e) => setLinkForm(prev => ({ ...prev, studentId: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                            >
                                <option value="">-- Select Student --</option>
                                {filteredEnrollmentsForLinkModal.map((e) => (
                                    <option key={e.studentId} value={e.studentId}>
                                        {e.student?.firstName} {e.student?.lastName} ({e.studentIdCode || "ID N/A"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Relationship Type */}
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Relationship Type
                            </label>
                            <select
                                value={linkForm.relationship}
                                onChange={(e) => setLinkForm(prev => ({ ...prev, relationship: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                            >
                                <option value="Mother">Mother</option>
                                <option value="Father">Father</option>
                                <option value="Guardian">Guardian</option>
                                <option value="Relative">Relative</option>
                            </select>
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsLinkModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                Establish Link
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
