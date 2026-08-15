import { fetchServerApi } from "../../../lib/server-api";
import { Building2, Calendar, Users, GraduationCap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";

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
            <div className="p-6">
                <ErrorState 
                    title="Error Loading Dashboard" 
                    message={data.error as string} 
                />
            </div>
        );
    }

    const { profile, years, students, teachers } = data;
    const activeYear = years.find((y: any) => y.status === "ACTIVE") || years[0];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="text-center pb-0 border-none">
                    <CardTitle className="text-gray-600 font-medium">The Sector in Numbers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* School Profile Metric */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#f59e0b] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <Building2 className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">
                                    {profile ? profile.name : "Not Setup"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">School Profile</p>
                            </div>
                        </div>

                        {/* Academic Year Metric */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#10b981] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <Calendar className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">
                                    {activeYear ? activeYear.name : "None"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Active Academic Year</p>
                            </div>
                        </div>

                        {/* Students Metric */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#ef4444] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <Users className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">
                                    {students.length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Enrolled Students</p>
                            </div>
                        </div>

                        {/* Teachers Metric */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#8b5cf6] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <GraduationCap className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">
                                    {teachers.length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Active Teachers</p>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
