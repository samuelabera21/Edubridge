"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    BookOpen, Users, Calendar, ArrowLeft, Inbox, Layers, 
    Bookmark, Building, Search, Clock, UserCheck, Filter, 
    SlidersHorizontal, ChevronDown, ChevronUp, Eye, FileSpreadsheet,
    GraduationCap, RefreshCw, MoreVertical, BarChart3, PlusCircle, BookOpenCheck
} from "lucide-react";

export default function MyClassesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = searchParams.get("tab") || "classes";

    const [activeTab, setActiveTab] = useState(initialTab);
    const [classes, setClasses] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters and Expanded State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("ALL");
    const [expandedRosters, setExpandedRosters] = useState<Record<string, boolean>>({});
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

    const toggleRoster = (key: string) => {
        setExpandedRosters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Filter Options
    const availableGrades = useMemo(() => {
        const set = new Set<string>();
        classes.forEach((c) => {
            const level = String(c.assignment?.schoolGrade?.grade?.level || c.schoolGrade?.grade?.level || '');
            if (level) set.add(level);
        });
        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [classes]);

    const availableSubjects = useMemo(() => {
        const set = new Set<string>();
        classes.forEach((c) => {
            const name = c.assignment?.subject?.name || c.subject?.name;
            if (name) set.add(name);
        });
        return Array.from(set).sort();
    }, [classes]);

    // Filtered Classes Data
    const filteredClasses = useMemo(() => {
        return classes.filter((item: any) => {
            const assignment = item.assignment || item;
            const gradeLevel = String(assignment.schoolGrade?.grade?.level || '');
            const sectionName = String(assignment.section?.name || '');
            const subjectName = String(assignment.subject?.name || '');
            const query = searchQuery.toLowerCase().trim();

            const matchesSearch = !query || (
                gradeLevel.toLowerCase().includes(query) ||
                sectionName.toLowerCase().includes(query) ||
                subjectName.toLowerCase().includes(query)
            );

            const matchesGrade = selectedGradeFilter === "ALL" || gradeLevel === selectedGradeFilter;
            const matchesSubject = selectedSubjectFilter === "ALL" || subjectName === selectedSubjectFilter;

            return matchesSearch && matchesGrade && matchesSubject;
        });
    }, [classes, searchQuery, selectedGradeFilter, selectedSubjectFilter]);

    // Unique Subjects summary
    const subjectsMap = useMemo(() => {
        const map = new Map();
        classes.forEach((c) => {
            const sub = c.assignment?.subject || c.subject;
            if (sub && sub.id) {
                if (!map.has(sub.id)) {
                    map.set(sub.id, { ...sub, assignedClasses: [c] });
                } else {
                    map.get(sub.id).assignedClasses.push(c);
                }
            }
        });
        return map;
    }, [classes]);

    const filteredSubjectsList = useMemo(() => {
        return Array.from(subjectsMap.values()).filter((s) => {
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || s.name?.toLowerCase().includes(query) || s.code?.toLowerCase().includes(query);
            const matchesSubject = selectedSubjectFilter === "ALL" || s.name === selectedSubjectFilter;
            return matchesSearch && matchesSubject;
        });
    }, [subjectsMap, searchQuery, selectedSubjectFilter]);

    // Unique Grades summary
    const gradesMap = useMemo(() => {
        const map = new Map();
        classes.forEach((c) => {
            const grade = c.assignment?.schoolGrade?.grade || c.schoolGrade?.grade;
            if (grade && grade.id) {
                if (!map.has(grade.id)) {
                    map.set(grade.id, { ...grade, assignedClasses: [c] });
                } else {
                    map.get(grade.id).assignedClasses.push(c);
                }
            }
        });
        return map;
    }, [classes]);

    const filteredGradesList = useMemo(() => {
        return Array.from(gradesMap.values()).filter((g) => {
            const query = searchQuery.toLowerCase().trim();
            const levelStr = String(g.level);
            const matchesSearch = !query || levelStr.includes(query) || g.name?.toLowerCase().includes(query);
            const matchesGrade = selectedGradeFilter === "ALL" || levelStr === selectedGradeFilter;
            return matchesSearch && matchesGrade;
        });
    }, [gradesMap, searchQuery, selectedGradeFilter]);

    // Unique Sections summary
    const sectionsMap = useMemo(() => {
        const map = new Map();
        classes.forEach((c) => {
            const sec = c.assignment?.section || c.section;
            const gradeLevel = c.assignment?.schoolGrade?.grade?.level || c.schoolGrade?.grade?.level;
            if (sec && sec.id) {
                if (!map.has(sec.id)) {
                    map.set(sec.id, { ...sec, gradeLevel, assignedClasses: [c] });
                } else {
                    map.get(sec.id).assignedClasses.push(c);
                }
            }
        });
        return map;
    }, [classes]);

    const filteredSectionsList = useMemo(() => {
        return Array.from(sectionsMap.values()).filter((sec) => {
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || String(sec.gradeLevel).includes(query) || sec.name?.toLowerCase().includes(query);
            const matchesGrade = selectedGradeFilter === "ALL" || String(sec.gradeLevel) === selectedGradeFilter;
            return matchesSearch && matchesGrade;
        });
    }, [sectionsMap, searchQuery, selectedGradeFilter]);

    // Metrics
    const totalEnrolledStudents = useMemo(() => {
        return classes.reduce((sum, item) => {
            const students = item.students || item.assignment?.section?.studentEnrollments || [];
            return sum + students.length;
        }, 0);
    }, [classes]);

    const totalWeeklyPeriods = useMemo(() => {
        return classes.reduce((sum, item) => {
            const p = item.assignment?.periodsPerWeek || item.periodsPerWeek || 4;
            return sum + p;
        }, 0);
    }, [classes]);

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading your teaching assignments...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">My Teaching Assignments</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Data Table View — structured tabular overview of your classes, subjects, grades, and sections.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center space-x-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assigned Classes</p>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{classes.length}</p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center space-x-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Students</p>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{totalEnrolledStudents}</p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center space-x-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Weekly Periods</p>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{totalWeeklyPeriods}</p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center space-x-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Bookmark className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Unique Subjects</p>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{subjectsMap.size}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Controls Bar */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by grade, section, or subject name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                            <Filter className="w-3.5 h-3.5 text-gray-500" />
                            <span className="font-semibold text-gray-600">Grade:</span>
                            <select
                                value={selectedGradeFilter}
                                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                                className="bg-transparent font-bold text-gray-900 focus:outline-hidden cursor-pointer"
                            >
                                <option value="ALL">All Grades</option>
                                {availableGrades.map((g) => (
                                    <option key={g} value={g}>Grade {g}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                            <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                            <span className="font-semibold text-gray-600">Subject:</span>
                            <select
                                value={selectedSubjectFilter}
                                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                                className="bg-transparent font-bold text-gray-900 focus:outline-hidden cursor-pointer max-w-[140px] truncate"
                            >
                                <option value="ALL">All Subjects</option>
                                {availableSubjects.map((sub) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>

                        {(selectedGradeFilter !== "ALL" || selectedSubjectFilter !== "ALL" || searchQuery) && (
                            <button
                                onClick={() => {
                                    setSelectedGradeFilter("ALL");
                                    setSelectedSubjectFilter("ALL");
                                    setSearchQuery("");
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors flex items-center space-x-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset Filters</span>
                            </button>
                        )}
                    </div>
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
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Classes Table ({filteredClasses.length})</span>
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
                    <span>Subjects Table ({filteredSubjectsList.length})</span>
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
                    <span>Grades Table ({filteredGradesList.length})</span>
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
                    <span>Sections Table ({filteredSectionsList.length})</span>
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

            {/* TAB 1: CLASSES DATA TABLE */}
            {activeTab === "classes" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span>Assigned Classes Master Table ({filteredClasses.length})</span>
                        </CardTitle>
                        <span className="text-xs font-semibold text-gray-500">
                            Sorted by Grade & Section
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredClasses.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 space-y-2">
                                <Inbox className="w-12 h-12 mx-auto text-gray-300" />
                                <p className="text-sm font-bold text-gray-700">No classes match your current search/filter</p>
                                <p className="text-xs text-gray-400">Try resetting your grade or subject filters above.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                            <th className="py-3.5 px-4">#</th>
                                            <th className="py-3.5 px-4">Grade & Section</th>
                                            <th className="py-3.5 px-4">Subject Name</th>
                                            <th className="py-3.5 px-4 text-center">Enrolled Students</th>
                                            <th className="py-3.5 px-4 text-center">Weekly Periods</th>
                                            <th className="py-3.5 px-4 text-center">Status</th>
                                            <th className="py-3.5 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredClasses.map((item: any, idx: number) => {
                                            const assignment = item.assignment || item;
                                            const students = item.students || assignment.section?.studentEnrollments || [];
                                            const gradeLevel = assignment.schoolGrade?.grade?.level || '';
                                            const sectionName = assignment.section?.name || '';
                                            const subjectName = assignment.subject?.name || 'Subject';
                                            const subjectCode = assignment.subject?.code || 'SUB';
                                            const itemKey = `item-${assignment.id || idx}`;
                                            const isRosterOpen = expandedRosters[itemKey] || false;

                                            return (
                                                <Fragment key={itemKey}>
                                                    <tr className="hover:bg-gray-50/80 transition-colors group">
                                                        <td className="py-3.5 px-4 font-bold text-gray-400">{idx + 1}</td>
                                                        <td className="py-3.5 px-4 font-extrabold text-gray-900">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-extrabold text-xs border border-blue-100">
                                                                    Grade {gradeLevel}-{sectionName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono text-[10px] font-bold rounded">
                                                                    {subjectCode}
                                                                </span>
                                                                <span className="font-bold text-gray-800">{subjectName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full font-bold text-xs border border-purple-100">
                                                                <Users className="w-3.5 h-3.5" />
                                                                <span>{students.length} Students</span>
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                                                            <span className="inline-flex items-center space-x-1">
                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{assignment.periodsPerWeek || 4} pds/wk</span>
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px] uppercase border border-emerald-100">
                                                                Active
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right relative">
                                                            <div className="inline-block text-left">
                                                                <button
                                                                    onClick={() => setOpenMenuId(openMenuId === itemKey ? null : itemKey)}
                                                                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 border border-transparent hover:border-gray-200"
                                                                    title="Class Actions Menu"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>

                                                                {/* Floating 5-Action Dropdown Menu */}
                                                                {openMenuId === itemKey && (
                                                                    <>
                                                                        {/* Click Outside Overlay */}
                                                                        <div 
                                                                            className="fixed inset-0 z-20 cursor-default" 
                                                                            onClick={() => setOpenMenuId(null)} 
                                                                        />

                                                                        <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 text-left">
                                                                            {/* Action 1: Take Attendance */}
                                                                            <Link
                                                                                href={`/dashboard/attendance/teacher?grade=${gradeLevel}&section=${sectionName}`}
                                                                                onClick={() => setOpenMenuId(null)}
                                                                                className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                            >
                                                                                <UserCheck className="w-4 h-4 text-blue-600" />
                                                                                <span>Take Attendance</span>
                                                                            </Link>

                                                                            {/* Action 2: View Class Roster */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    toggleRoster(itemKey);
                                                                                    setOpenMenuId(null);
                                                                                }}
                                                                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                            >
                                                                                <Eye className="w-4 h-4 text-purple-600" />
                                                                                <span>{isRosterOpen ? "Hide Class Roster" : "View Class Roster"}</span>
                                                                            </button>

                                                                            {/* Action 3: Record / Enter Marks */}
                                                                            <Link
                                                                                href={`/dashboard/teacher/assessment?grade=${gradeLevel}&section=${sectionName}`}
                                                                                onClick={() => setOpenMenuId(null)}
                                                                                className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                            >
                                                                                <BarChart3 className="w-4 h-4 text-emerald-600" />
                                                                                <span>Record / Enter Marks</span>
                                                                            </Link>

                                                                            {/* Action 4: Create Assessment / Assignment */}
                                                                            <Link
                                                                                href={`/dashboard/teacher/activities?grade=${gradeLevel}&section=${sectionName}`}
                                                                                onClick={() => setOpenMenuId(null)}
                                                                                className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                            >
                                                                                <PlusCircle className="w-4 h-4 text-amber-600" />
                                                                                <span>Create Assessment</span>
                                                                            </Link>

                                                                            {/* Action 5: Record Lesson Progress */}
                                                                            <Link
                                                                                href={`/dashboard/teacher/curriculum?grade=${gradeLevel}&section=${sectionName}`}
                                                                                onClick={() => setOpenMenuId(null)}
                                                                                className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-gray-100 mt-1 pt-2"
                                                                            >
                                                                                <BookOpenCheck className="w-4 h-4 text-indigo-600" />
                                                                                <span>Record Lesson Progress</span>
                                                                            </Link>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expandable Roster Sub-Row */}
                                                    {isRosterOpen && (
                                                        <tr className="bg-blue-50/30">
                                                            <td colSpan={7} className="py-3 px-6 border-b border-blue-100">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                                                                        <span>Enrolled Roster — Grade {gradeLevel} Section {sectionName} ({students.length} Students)</span>
                                                                        <span className="text-[10px] text-gray-500 font-normal">Subject: {subjectName}</span>
                                                                    </div>
                                                                    {students.length === 0 ? (
                                                                        <p className="text-xs text-gray-400 italic">No enrolled students in this section.</p>
                                                                    ) : (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                                                                            {students.map((st: any) => {
                                                                                const s = st.student || st;
                                                                                return (
                                                                                    <div key={st.id} className="p-2 bg-white rounded-lg border border-gray-200/70 flex items-center justify-between text-xs shadow-2xs">
                                                                                        <span className="font-semibold text-gray-800">{s.firstName} {s.lastName}</span>
                                                                                        <span className="text-[10px] text-gray-400 font-mono">{s.studentId || 'STU'}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 2: SUBJECTS DATA TABLE */}
            {activeTab === "subjects" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <Bookmark className="w-4 h-4 text-blue-600" />
                            <span>Assigned Subjects Master Table ({filteredSubjectsList.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredSubjectsList.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No assigned subjects match your query.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                            <th className="py-3.5 px-4">Subject Code</th>
                                            <th className="py-3.5 px-4">Subject Name</th>
                                            <th className="py-3.5 px-4">Assigned Grade Sections</th>
                                            <th className="py-3.5 px-4 text-center">Total Sections</th>
                                            <th className="py-3.5 px-4 text-center">Total Students</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSubjectsList.map((sub: any) => {
                                            const totalStudents = sub.assignedClasses.reduce((sum: number, c: any) => {
                                                const st = c.students || c.assignment?.section?.studentEnrollments || [];
                                                return sum + st.length;
                                            }, 0);

                                            return (
                                                <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                                                        <span className="px-2 py-0.5 bg-blue-50 rounded border border-blue-100">
                                                            {sub.code || "SUB"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-extrabold text-gray-900">{sub.name}</td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {sub.assignedClasses.map((item: any, i: number) => {
                                                                const assignment = item.assignment || item;
                                                                const gradeLevel = assignment.schoolGrade?.grade?.level;
                                                                const sectionName = assignment.section?.name || '';
                                                                return (
                                                                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-bold text-[10px]">
                                                                        Grade {gradeLevel}-{sectionName}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                                                        {sub.assignedClasses.length} Section(s)
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-bold text-purple-700">
                                                        {totalStudents} Students
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 3: GRADES DATA TABLE */}
            {activeTab === "grades" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-purple-600" />
                            <span>Assigned Grades Master Table ({filteredGradesList.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredGradesList.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No assigned grade levels match your query.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                            <th className="py-3.5 px-4">Grade Level</th>
                                            <th className="py-3.5 px-4">Grade Title</th>
                                            <th className="py-3.5 px-4">Assigned Sections</th>
                                            <th className="py-3.5 px-4 text-center">Taught Classes Count</th>
                                            <th className="py-3.5 px-4 text-center">Total Enrolled</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredGradesList.map((g: any) => {
                                            const totalStudents = g.assignedClasses.reduce((sum: number, c: any) => {
                                                const st = c.students || c.assignment?.section?.studentEnrollments || [];
                                                return sum + st.length;
                                            }, 0);

                                            return (
                                                <tr key={g.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-3.5 px-4 font-extrabold text-gray-900">
                                                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg font-extrabold border border-purple-100">
                                                            Grade {g.level}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-gray-800">{g.name || `Grade Level ${g.level}`}</td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {g.assignedClasses.map((item: any, i: number) => {
                                                                const assignment = item.assignment || item;
                                                                const sectionName = assignment.section?.name || '';
                                                                return (
                                                                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-bold text-[10px]">
                                                                        Section {sectionName}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                                                        {g.assignedClasses.length} Class Module(s)
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-bold text-purple-700">
                                                        {totalStudents} Students
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 4: SECTIONS DATA TABLE */}
            {activeTab === "sections" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            <span>Assigned Sections Master Table ({filteredSectionsList.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredSectionsList.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No assigned sections match your query.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                            <th className="py-3.5 px-4">Section Identifier</th>
                                            <th className="py-3.5 px-4">Grade Level</th>
                                            <th className="py-3.5 px-4">Taught Subjects</th>
                                            <th className="py-3.5 px-4 text-center">Enrolled Students</th>
                                            <th className="py-3.5 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSectionsList.map((sec: any) => {
                                            const firstItem = sec.assignedClasses[0];
                                            const students = firstItem?.students || firstItem?.assignment?.section?.studentEnrollments || [];

                                            return (
                                                <tr key={sec.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-3.5 px-4 font-extrabold text-gray-900">
                                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-extrabold border border-blue-100">
                                                            Grade {sec.gradeLevel}-{sec.name}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-gray-800">Grade {sec.gradeLevel}</td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {sec.assignedClasses.map((item: any, i: number) => {
                                                                const assignment = item.assignment || item;
                                                                const subjectName = assignment.subject?.name || 'Subject';
                                                                return (
                                                                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-bold text-[10px]">
                                                                        {subjectName}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-bold text-purple-700">
                                                        {students.length} Students
                                                    </td>
                                                        <td className="py-3.5 px-4 text-right relative">
                                                            {(() => {
                                                                const secKey = `sec-${sec.id}`;
                                                                return (
                                                                    <div className="inline-block text-left">
                                                                        <button
                                                                            onClick={() => setOpenMenuId(openMenuId === secKey ? null : secKey)}
                                                                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 border border-transparent hover:border-gray-200"
                                                                            title="Section Actions Menu"
                                                                        >
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </button>

                                                                        {/* Floating 5-Action Dropdown Menu for Section */}
                                                                        {openMenuId === secKey && (
                                                                            <>
                                                                                {/* Click Outside Overlay */}
                                                                                <div 
                                                                                    className="fixed inset-0 z-20 cursor-default" 
                                                                                    onClick={() => setOpenMenuId(null)} 
                                                                                />

                                                                                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 text-left">
                                                                                    {/* Action 1: Take Attendance */}
                                                                                    <Link
                                                                                        href={`/dashboard/attendance/teacher?grade=${sec.gradeLevel}&section=${sec.name}`}
                                                                                        onClick={() => setOpenMenuId(null)}
                                                                                        className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                    >
                                                                                        <UserCheck className="w-4 h-4 text-blue-600" />
                                                                                        <span>Take Attendance</span>
                                                                                    </Link>

                                                                                    {/* Action 2: View Section Roster */}
                                                                                    <Link
                                                                                        href={`/dashboard/teacher/students?grade=${sec.gradeLevel}&section=${sec.name}`}
                                                                                        onClick={() => setOpenMenuId(null)}
                                                                                        className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                    >
                                                                                        <Eye className="w-4 h-4 text-purple-600" />
                                                                                        <span>View Section Roster</span>
                                                                                    </Link>

                                                                                    {/* Action 3: Record / Enter Marks */}
                                                                                    <Link
                                                                                        href={`/dashboard/teacher/assessment?grade=${sec.gradeLevel}&section=${sec.name}`}
                                                                                        onClick={() => setOpenMenuId(null)}
                                                                                        className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                    >
                                                                                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                                                                                        <span>Record / Enter Marks</span>
                                                                                    </Link>

                                                                                    {/* Action 4: Create Assessment */}
                                                                                    <Link
                                                                                        href={`/dashboard/teacher/activities?grade=${sec.gradeLevel}&section=${sec.name}`}
                                                                                        onClick={() => setOpenMenuId(null)}
                                                                                        className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                    >
                                                                                        <PlusCircle className="w-4 h-4 text-amber-600" />
                                                                                        <span>Create Assessment</span>
                                                                                    </Link>

                                                                                    {/* Action 5: Record Lesson Progress */}
                                                                                    <Link
                                                                                        href={`/dashboard/teacher/curriculum?grade=${sec.gradeLevel}&section=${sec.name}`}
                                                                                        onClick={() => setOpenMenuId(null)}
                                                                                        className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-gray-100 mt-1 pt-2"
                                                                                    >
                                                                                        <BookOpenCheck className="w-4 h-4 text-indigo-600" />
                                                                                        <span>Record Lesson Progress</span>
                                                                                    </Link>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
