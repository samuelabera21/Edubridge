"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BookOpen, Users, Calendar, ArrowLeft, Inbox, Layers, Clock, Bookmark, Building } from "lucide-react";

export default function MyClassesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = searchParams.get("tab") || "classes";

    const [activeTab, setActiveTab] = useState(initialTab);
    const [classes, setClasses] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        async function loadMyClasses() {
            try {
                const [classRes, ttRes] = await Promise.all([
                    fetchApi("/teacher/my-classes"),
                    fetchApi("/teacher/dashboard-summary")
                ]);

                if (classRes.ok) {
                    const data = await classRes.json();
                    setClasses(Array.isArray(data) ? data : []);
                }
                if (ttRes.ok) {
                    const data = await ttRes.json();
                    setTimetable(Array.isArray(data.todayClasses) ? data.todayClasses : []);
                }
            } catch (err) {
                console.error("Failed to load assigned classes:", err);
            } finally {
                setLoading(false);
            }
        }
        loadMyClasses();
    }, []);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.push(`/dashboard/teacher/my-classes?tab=${tab}`);
    };

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading your teaching assignments...</p>
            </div>
        );
    }

    // Extract unique subjects
    const subjectsMap = new Map();
    classes.forEach((c) => {
        const sub = c.assignment?.subject || c.subject;
        if (sub && sub.id) {
            if (!subjectsMap.has(sub.id)) {
                subjectsMap.set(sub.id, {
                    ...sub,
                    assignedClassesCount: 1
                });
            } else {
                const existing = subjectsMap.get(sub.id);
                existing.assignedClassesCount += 1;
            }
        }
    });
    const uniqueSubjects = Array.from(subjectsMap.values());

    // Extract unique grades
    const gradesMap = new Map();
    classes.forEach((c) => {
        const grade = c.assignment?.schoolGrade?.grade || c.schoolGrade?.grade;
        if (grade && grade.id) {
            if (!gradesMap.has(grade.id)) {
                gradesMap.set(grade.id, {
                    ...grade,
                    sectionsCount: 1
                });
            } else {
                const existing = gradesMap.get(grade.id);
                existing.sectionsCount += 1;
            }
        }
    });
    const uniqueGrades = Array.from(gradesMap.values());

    // Extract unique sections
    const sectionsMap = new Map();
    classes.forEach((c) => {
        const sec = c.assignment?.section || c.section;
        const gradeLevel = c.assignment?.schoolGrade?.grade?.level || c.schoolGrade?.grade?.level;
        if (sec && sec.id) {
            sectionsMap.set(sec.id, {
                ...sec,
                gradeLevel,
                studentCount: (c.students || sec.studentEnrollments || []).length
            });
        }
    });
    const uniqueSections = Array.from(sectionsMap.values());

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">My Teaching Assignments</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        Assigned subjects, grade levels, sections, classes, and weekly timetable schedule.
                    </p>
                </div>
            </div>

            {/* Navigation Sub-Tabs */}
            <div className="flex border-b border-gray-200 space-x-2 overflow-x-auto text-xs font-bold">
                <button
                    onClick={() => handleTabChange("classes")}
                    className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "classes" 
                            ? "border-blue-600 text-blue-600" 
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Classes ({classes.length})</span>
                </button>

                <button
                    onClick={() => handleTabChange("subjects")}
                    className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "subjects" 
                            ? "border-blue-600 text-blue-600" 
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Bookmark className="w-4 h-4" />
                    <span>Subjects ({uniqueSubjects.length})</span>
                </button>

                <button
                    onClick={() => handleTabChange("grades")}
                    className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "grades" 
                            ? "border-blue-600 text-blue-600" 
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Grades ({uniqueGrades.length})</span>
                </button>

                <button
                    onClick={() => handleTabChange("sections")}
                    className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "sections" 
                            ? "border-blue-600 text-blue-600" 
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Building className="w-4 h-4" />
                    <span>Sections ({uniqueSections.length})</span>
                </button>

                <button
                    onClick={() => handleTabChange("schedule")}
                    className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "schedule" 
                            ? "border-blue-600 text-blue-600" 
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Teaching Schedule</span>
                </button>
            </div>

            {/* TAB 1: CLASSES */}
            {activeTab === "classes" && (
                classes.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center text-gray-400 space-y-3">
                            <Inbox className="w-12 h-12 mx-auto text-gray-300" />
                            <h3 className="text-base font-bold text-gray-800">No Class Assignments Found</h3>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                                Class assignments created by school administrators will appear here automatically.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.map((item: any, idx: number) => {
                            const assignment = item.assignment || item;
                            const students = item.students || assignment.section?.studentEnrollments || [];
                            const gradeLevel = assignment.schoolGrade?.grade?.level;
                            const sectionName = assignment.section?.name || '';
                            const subjectName = assignment.subject?.name || 'Subject';

                            return (
                                <Card key={assignment.id || idx} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold text-gray-900">{subjectName}</CardTitle>
                                                <p className="text-[11px] text-gray-500 font-semibold">
                                                    Grade {gradeLevel}{sectionName}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] uppercase border border-blue-100">
                                            Active
                                        </span>
                                    </CardHeader>

                                    <CardContent className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Enrolled Students</p>
                                                <p className="text-base font-extrabold text-gray-900 mt-0.5">{students.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Weekly Periods</p>
                                                <p className="text-base font-extrabold text-gray-900 mt-0.5">{assignment.periodsPerWeek || 4}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-gray-800 mb-2 flex items-center space-x-1.5">
                                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                                <span>Roster Preview ({students.length})</span>
                                            </p>
                                            {students.length === 0 ? (
                                                <p className="text-[11px] text-gray-400 italic">No enrolled students in this section yet.</p>
                                            ) : (
                                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                    {students.slice(0, 5).map((st: any) => {
                                                        const s = st.student || st;
                                                        return (
                                                            <div key={st.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                                <span className="font-semibold text-gray-800">{s.firstName} {s.lastName}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">{s.studentId || st.id.slice(0, 6)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {students.length > 5 && (
                                                        <p className="text-[10px] text-blue-600 font-bold text-center pt-1">
                                                            +{students.length - 5} more students
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )
            )}

            {/* TAB 2: SUBJECTS */}
            {activeTab === "subjects" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Bookmark className="w-5 h-5 text-blue-600" />
                            <span>Assigned Subject Courses</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {uniqueSubjects.length === 0 ? (
                            <p className="text-xs text-gray-400 p-4 italic">No assigned subjects found.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {uniqueSubjects.map((sub: any) => (
                                    <div key={sub.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px] uppercase">
                                                {sub.code || "SUB"}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-bold">
                                                {sub.assignedClassesCount} Section(s)
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm">{sub.name}</h4>
                                        <p className="text-[11px] text-gray-500">{sub.description || "Core subject curriculum module."}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 3: GRADES */}
            {activeTab === "grades" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Layers className="w-5 h-5 text-blue-600" />
                            <span>Assigned Grade Levels</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {uniqueGrades.length === 0 ? (
                            <p className="text-xs text-gray-400 p-4 italic">No assigned grade levels found.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {uniqueGrades.map((g: any) => (
                                    <div key={g.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                                        <h4 className="font-extrabold text-gray-900 text-base">Grade {g.level}</h4>
                                        <p className="text-gray-500 font-medium">{g.name || `Grade Level ${g.level}`}</p>
                                        <span className="inline-block px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full font-bold text-[10px] border border-purple-100 mt-2">
                                            {g.sectionsCount} Section(s)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 4: SECTIONS */}
            {activeTab === "sections" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Building className="w-5 h-5 text-blue-600" />
                            <span>Assigned Sections & Classrooms</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {uniqueSections.length === 0 ? (
                            <p className="text-xs text-gray-400 p-4 italic">No assigned sections found.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {uniqueSections.map((sec: any) => (
                                    <div key={sec.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">
                                            Grade {sec.gradeLevel}{sec.name}
                                        </span>
                                        <h4 className="font-bold text-gray-900 text-sm mt-1">Section {sec.name}</h4>
                                        <p className="text-[11px] text-gray-500">Enrolled Students: <span className="font-bold text-gray-800">{sec.studentCount}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 5: TEACHING SCHEDULE */}
            {activeTab === "schedule" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span>Weekly Teaching Schedule</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {timetable.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No scheduled period slots recorded for this week.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-3">Period</th>
                                            <th className="py-3 px-3">Time Slot</th>
                                            <th className="py-3 px-3">Grade & Section</th>
                                            <th className="py-3 px-3">Subject</th>
                                            <th className="py-3 px-3">Assigned Room</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {timetable.map((item: any, idx: number) => (
                                            <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3.5 px-3 font-bold text-gray-700">{item.period || idx + 1}</td>
                                                <td className="py-3.5 px-3 font-medium text-gray-600">{item.time}</td>
                                                <td className="py-3.5 px-3 font-bold text-gray-900">{item.section || item.class}</td>
                                                <td className="py-3.5 px-3 font-semibold text-gray-700">{item.subject}</td>
                                                <td className="py-3.5 px-3 text-gray-500">{item.room || "Room 101"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
