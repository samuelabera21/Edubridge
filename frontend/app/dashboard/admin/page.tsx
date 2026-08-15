import { fetchServerApi } from "../../../lib/server-api";
import { Building2, Calendar, Users, GraduationCap, AlertCircle } from "lucide-react";

async function getDashboardData() {
    try {
        const [profileRes, yearsRes, studentsRes, teachersRes] = await Promise.all([
            fetchServerApi("/school/profile"),
            fetchServerApi("/academic/years"),
            fetchServerApi("/student/enrollments"),
            fetchServerApi("/teacher")
        ]);

        return {
            profile: profileRes.ok ? await profileRes.json() : null,
            years: yearsRes.ok ? await yearsRes.json() : [],
            students: studentsRes.ok ? await studentsRes.json() : [],
            teachers: teachersRes.ok ? await teachersRes.json() : []
        };
    } catch (e) {
        console.error("Failed to fetch admin dashboard data", e);
        return { error: "Failed to load dashboard data" };
    }
}

export default async function AdminDashboard() {
    const data = await getDashboardData();

    if ('error' in data) {
        return (
            <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <div>
                    <h2 className="text-lg font-bold">Error Loading Dashboard</h2>
                    <p>{data.error}</p>
                </div>
            </div>
        );
    }

    const { profile, years, students, teachers } = data;
    const activeYear = years.find((y: any) => y.status === "ACTIVE") || years[0];

    return (
        <div className="space-y-6 text-slate-800">
            <h1 className="text-2xl font-bold text-slate-900">School Administration</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* School Profile Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">School Profile</h2>
                    </div>
                    {profile ? (
                        <div className="space-y-2 text-sm text-slate-600">
                            <p><span className="font-semibold text-slate-700">Name:</span> {profile.name}</p>
                            <p><span className="font-semibold text-slate-700">Status:</span> 
                                <span className="ml-1 inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold uppercase">{profile.status}</span>
                            </p>
                            <p><span className="font-semibold text-slate-700">Email:</span> {profile.contactEmail || "N/A"}</p>
                            <p><span className="font-semibold text-slate-700">Phone:</span> {profile.contactPhone || "N/A"}</p>
                            <p><span className="font-semibold text-slate-700">Address:</span> {profile.address || "N/A"}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">School profile not found.</p>
                    )}
                </div>

                {/* Academic Year Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Academic Year</h2>
                    </div>
                    {activeYear ? (
                        <div className="space-y-2 text-sm text-slate-600">
                            <p><span className="font-semibold text-slate-700">Current Year:</span> {activeYear.name}</p>
                            <p><span className="font-semibold text-slate-700">Start Date:</span> {new Date(activeYear.startDate).toLocaleDateString()}</p>
                            <p><span className="font-semibold text-slate-700">End Date:</span> {new Date(activeYear.endDate).toLocaleDateString()}</p>
                            <p><span className="font-semibold text-slate-700">Status:</span> 
                                <span className="ml-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold uppercase">{activeYear.status}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">No active academic year configured.</p>
                    )}
                </div>

                {/* Students Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                            <Users className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Students</h2>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-slate-500 font-medium">Total Enrollments</p>
                        <p className="text-3xl font-bold text-slate-900">{students.length}</p>
                    </div>
                </div>

                {/* Teachers Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-violet-100 p-2 rounded-lg text-violet-700">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Teachers</h2>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-slate-500 font-medium">Active Faculty</p>
                        <p className="text-3xl font-bold text-slate-900">{teachers.length}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
