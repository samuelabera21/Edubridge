"use client";

import { useAuth } from "../../hooks/useAuth";
import { Loader2, BookOpen, LogOut, LayoutDashboard, Building } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { authData, loading, error } = useAuth(true); // requireAuth = true
    const pathname = usePathname();
    const router = useRouter();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                <span className="text-lg font-medium">Verifying access...</span>
            </div>
        );
    }

    if (error || !authData) {
        return null; // The hook redirects to login if unauthenticated
    }

    // Determine highest role for display (Simplification for Sprint 1 demo)
    const primaryAccess = authData.access[0];
    const roleName = primaryAccess?.role?.name || "Unassigned";
    const scopeName = primaryAccess?.scope?.name || "No Organization";

    const handleLogout = async () => {
        try {
            await fetchApi("/auth/sign-out", { method: "POST" });
            router.push("/login");
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#2c3e50] text-white flex flex-col shadow-xl hidden md:flex animate-fade-in">
                <div className="p-6 flex items-center space-x-3 border-b border-white/10">
                    <div className="bg-[#4085b3] p-1.5 rounded-full shadow-sm">
                        <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">EduBridge</span>
                </div>
                
                <div className="p-5 border-b border-white/10 bg-white/5">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Role</p>
                    <p className="font-semibold text-sm text-sky-100 truncate">{roleName.replace("_", " ")}</p>
                    
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-4 mb-1">Scope</p>
                    <p className="font-semibold text-sm text-sky-100 truncate" title={scopeName}>{scopeName}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link 
                        href="/dashboard" 
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded transition-all duration-200 ${pathname === "/dashboard" ? "bg-[#4085b3] text-white shadow-sm" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="font-medium text-sm">Overview</span>
                    </Link>

                    {roleName === "SCHOOL_ADMIN" && (
                        <>
                            <Link 
                                href="/dashboard/profile" 
                                className={`flex items-center space-x-3 px-3 py-2.5 rounded transition-all duration-200 ${pathname === "/dashboard/profile" ? "bg-[#4085b3] text-white shadow-sm" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                            >
                                <Building className="h-5 w-5" />
                                <span className="font-medium text-sm">School Profile</span>
                            </Link>
                            
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">Academic Structure</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/academic/years" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname.includes("/dashboard/academic/years") ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname.includes("/dashboard/academic/years") ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Academic Years</span>
                            </Link>

                            <Link 
                                href="/dashboard/academic/grades" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname.includes("/dashboard/academic/grades") ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname.includes("/dashboard/academic/grades") ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Grades & Sections</span>
                            </Link>

                            <Link 
                                href="/dashboard/academic/subjects" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname.includes("/dashboard/academic/subjects") ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname.includes("/dashboard/academic/subjects") ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Subjects</span>
                            </Link>
                            
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">People & Identities</p>
                            </div>

                            <Link 
                                href="/dashboard/students" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname.includes("/dashboard/students") ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname.includes("/dashboard/students") ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Students (Foundation)</span>
                            </Link>

                            <Link 
                                href="/dashboard/teachers" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname.includes("/dashboard/teachers") ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname.includes("/dashboard/teachers") ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Teachers (Foundation)</span>
                            </Link>
                        </>
                    )}

                    {roleName === "STUDENT" && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">My Academics</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/student" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname === "/dashboard/student" ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname === "/dashboard/student" ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Dashboard</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">My Schedule</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">My Grades</span>
                            </Link>
                        </>
                    )}

                    {roleName === "TEACHER" && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">My Classroom</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/teacher" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname === "/dashboard/teacher" ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname === "/dashboard/teacher" ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Dashboard</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">My Classes</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">My Students</span>
                            </Link>
                            
                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Grading</span>
                            </Link>
                        </>
                    )}

                    {roleName === "PARENT" && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">Family Portal</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/parent" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname === "/dashboard/parent" ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname === "/dashboard/parent" ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Dashboard</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">My Children</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Attendance</span>
                            </Link>
                            
                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Messages</span>
                            </Link>
                        </>
                    )}

                    {roleName === "VICE_PRINCIPAL" && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">Academic Leadership</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/vice-principal" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname === "/dashboard/vice-principal" ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname === "/dashboard/vice-principal" ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Dashboard</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Teacher Roster</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Curriculum</span>
                            </Link>
                            
                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Discipline</span>
                            </Link>
                        </>
                    )}

                    {roleName === "SUPPORT_STAFF" && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">School Operations</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/support-staff" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname === "/dashboard/support-staff" ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname === "/dashboard/support-staff" ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Dashboard</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Service Desk</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Student Records</span>
                            </Link>
                            
                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Facilities</span>
                            </Link>
                        </>
                    )}

                    {roleName === "COMMITTEE" && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">Committee Portal</p>
                            </div>
                            
                            <Link 
                                href="/dashboard/committee" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 ${pathname === "/dashboard/committee" ? "text-white bg-white/5" : "text-gray-400 hover:text-gray-200"}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${pathname === "/dashboard/committee" ? "bg-[#4085b3]" : "bg-gray-600"}`}></div>
                                <span className="font-medium text-sm">Dashboard</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Board Meetings</span>
                            </Link>

                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Reports</span>
                            </Link>
                            
                            <Link 
                                href="#" 
                                className={`flex items-center space-x-3 px-3 py-2 rounded transition-all duration-200 text-gray-400 hover:text-gray-200`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                <span className="font-medium text-sm">Community Feedback</span>
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-white/10 bg-black/10">
                    <div className="flex items-center space-x-3 mb-4 px-2">
                        <div className="h-8 w-8 rounded-full bg-[#4085b3] flex items-center justify-center text-sm font-bold uppercase shadow-sm">
                            {authData.user.name?.[0] || authData.user.email[0]}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate text-white">{authData.user.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{authData.user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 bg-white/5 hover:bg-red-500/90 transition-all text-gray-300 hover:text-white py-2 rounded text-sm font-medium border border-white/10 hover:border-transparent"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden animate-slide-in-right">
                <header className="bg-white shadow-sm h-16 flex items-center px-6 md:hidden justify-between border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#4085b3] p-1 rounded-full">
                            <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-[#2c3e50]">EduBridge</span>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600">
                        <LogOut className="h-5 w-5" />
                    </button>
                </header>
                
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
