import { prisma } from "../../infrastructure/prisma/client.js";

export class TimetableAutoSchedulerService {
    /**
     * Automatically generates a timetable for the entire school.
     * Wipes existing entries to ensure a conflict-free generation.
     */
    static async generateTimetable(organizationId: string, academicYearId: string) {
        // 1. Fetch Configuration to get operating days
        const config = await prisma.timetableConfig.findUnique({
            where: { organizationId_academicYearId: { organizationId, academicYearId } }
        });
        
        if (!config || !config.operatingDays || (config.operatingDays as number[]).length === 0) {
            throw new Error("Timetable configuration is missing or operating days are not set.");
        }
        const operatingDays = config.operatingDays as number[]; // [1, 2, 3, 4, 5] = Mon-Fri

        // 2. Fetch all Class Periods (excluding breaks)
        const periods = await prisma.classPeriod.findMany({
            where: { organizationId, isBreak: false },
            orderBy: { startTime: 'asc' }
        });

        if (periods.length === 0) {
            throw new Error("No class periods defined. Please configure schedule first.");
        }

        // 3. Auto-Configuration Step: Ensure all active sections and subjects have teaching assignments
        const activeTeachers = await prisma.teacher.findMany({
            where: { organizationId, status: "ACTIVE" }
        });

        if (activeTeachers.length > 0) {
            const schoolGrades = await prisma.schoolGrade.findMany({
                where: { academicYearId },
                include: { sections: true }
            });
            const schoolSubjects = await prisma.schoolSubject.findMany({
                where: { academicYearId }
            });

            const existingAssignments = await prisma.teachingAssignment.findMany({
                where: { academicYearId }
            });

            const existingMap = new Set(
                existingAssignments
                    .filter(a => a.sectionId)
                    .map(a => `${a.sectionId}-${a.subjectId}`)
            );

            // Track teacher workload for balanced distribution when auto-assigning
            const teacherWorkload: { [teacherId: string]: number } = {};
            activeTeachers.forEach(t => { teacherWorkload[t.id] = 0; });
            existingAssignments.forEach(a => {
                if (teacherWorkload[a.teacherId] !== undefined) {
                    teacherWorkload[a.teacherId] = (teacherWorkload[a.teacherId] || 0) + 1;
                }
            });

            const newAssignmentsToCreate: any[] = [];

            for (const sg of schoolGrades) {
                for (const section of sg.sections) {
                    for (const ss of schoolSubjects) {
                        const key = `${section.id}-${ss.subjectId}`;
                        if (!existingMap.has(key)) {
                            let bestTeacher = activeTeachers[0]!;
                            let minWorkload = teacherWorkload[bestTeacher.id] ?? 0;
                            for (const t of activeTeachers) {
                                const load = teacherWorkload[t.id] ?? 0;
                                if (load < minWorkload) {
                                    minWorkload = load;
                                    bestTeacher = t;
                                }
                            }

                            newAssignmentsToCreate.push({
                                academicYearId,
                                teacherId: bestTeacher.id,
                                subjectId: ss.subjectId,
                                schoolGradeId: sg.id,
                                sectionId: section.id,
                                periodsPerWeek: 4
                            });

                            teacherWorkload[bestTeacher.id] = (teacherWorkload[bestTeacher.id] ?? 0) + 1;
                            existingMap.add(key);
                        }
                    }
                }
            }

            if (newAssignmentsToCreate.length > 0) {
                await prisma.teachingAssignment.createMany({
                    data: newAssignmentsToCreate,
                    skipDuplicates: true
                });
            }
        }

        // 4. Fetch all Teaching Assignments for this academic year (including auto-configured ones)
        const assignments = await prisma.teachingAssignment.findMany({
            where: { academicYearId },
            include: { teacher: true }
        });

        // Calculate total weekly capacity per section (e.g., 5 days * 6 periods = 30 slots)
        const totalWeeklyCapacity = operatingDays.length * periods.length;

        // Group assignments by sectionId
        const assignmentsBySection: { [sectionId: string]: typeof assignments } = {};
        for (const a of assignments) {
            if (!a.sectionId) continue;
            if (!assignmentsBySection[a.sectionId]) assignmentsBySection[a.sectionId] = [];
            assignmentsBySection[a.sectionId]!.push(a);
        }

        // Determine target periodsNeeded for each assignment to fill 100% grid capacity if not custom configured
        const assignmentPeriodsNeeded: { [assignmentId: string]: number } = {};

        for (const [secId, secAssignments] of Object.entries(assignmentsBySection)) {
            const count = secAssignments.length;
            if (count === 0) continue;

            // Check if user explicitly set custom periodsPerWeek (not 0 and not default 4)
            const hasCustomConfig = secAssignments.some(a => a.periodsPerWeek > 0 && a.periodsPerWeek !== 4);

            if (hasCustomConfig) {
                secAssignments.forEach(a => {
                    assignmentPeriodsNeeded[a.id] = a.periodsPerWeek > 0 ? a.periodsPerWeek : 4;
                });
            } else {
                // Auto-fill to 100% section capacity
                const basePeriods = Math.floor(totalWeeklyCapacity / count);
                let remainder = totalWeeklyCapacity % count;

                secAssignments.forEach(a => {
                    const extra = remainder > 0 ? 1 : 0;
                    if (remainder > 0) remainder--;
                    assignmentPeriodsNeeded[a.id] = basePeriods + extra;
                });
            }
        }

        // 5. Fetch all Rooms
        const rooms = await prisma.schoolResource.findMany({
            where: { organizationId, status: "AVAILABLE" }
        });

        // 6. Delete existing timetable entries
        await prisma.timetable.deleteMany({
            where: { organizationId, academicYearId }
        });

        // State trackers for conflicts
        // Key format: `${dayOfWeek}-${classPeriodId}`
        const sectionSchedule: { [sectionId: string]: Set<string> } = {};
        const teacherSchedule: { [teacherId: string]: Set<string> } = {};
        const roomSchedule: { [roomId: string]: Set<string> } = {};

        // Helper to check Teacher Availability
        const isTeacherAvailable = (teacher: any, dayOfWeek: number, periodId: string) => {
            if (!teacher.availability || !(teacher.availability as any).blockedSlots) return true;
            const blocked = (teacher.availability as any).blockedSlots;
            return !blocked.some((b: any) => b.dayOfWeek === dayOfWeek && b.classPeriodId === periodId);
        };

        const timetableEntriesToCreate: any[] = [];

        // Shuffle helper to introduce randomness in placement (better distribution)
        const shuffleArray = (array: any[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Algorithm: For each assignment, try to place it `periodsNeeded` times.
        // Try to place max 1 period per day per assignment to spread out subjects.
        
        for (const assignment of assignments) {
            let periodsNeeded = assignmentPeriodsNeeded[assignment.id] ?? (assignment.periodsPerWeek || 4);
            if (periodsNeeded <= 0) continue;

            if (!assignment.sectionId) continue; // Can only schedule sections
            
            const sectionId = assignment.sectionId;
            const teacherId = assignment.teacherId;
            
            if (!sectionSchedule[sectionId]) sectionSchedule[sectionId] = new Set();
            if (!teacherSchedule[teacherId]) teacherSchedule[teacherId] = new Set();

            // Shuffle days to distribute subjects nicely across the week
            let availableDays = shuffleArray([...operatingDays]);

            // Track days we've already scheduled this subject on, to encourage spreading out
            const scheduledDays = new Set<number>();

            for (let pass = 0; pass < 2 && periodsNeeded > 0; pass++) {
                // Pass 0: Try strictly 1 per day. Pass 1: Allow multiple per day if needed
                
                for (const day of availableDays) {
                    if (periodsNeeded === 0) break;
                    if (pass === 0 && scheduledDays.has(day)) continue; // Spread constraint

                    // Shuffle periods
                    const shuffledPeriods = shuffleArray([...periods]);
                    
                    for (const period of shuffledPeriods) {
                        const slotKey = `${day}-${period.id}`;
                        
                        // Check Hard Constraints
                        if (sectionSchedule[sectionId].has(slotKey)) continue; // Section busy
                        if (teacherSchedule[teacherId].has(slotKey)) continue; // Teacher busy
                        if (assignment.teacher && !isTeacherAvailable(assignment.teacher, day, period.id)) continue; // Teacher blocked

                        // Try to find a room
                        let assignedRoomId = null;
                        const shuffledRooms = shuffleArray([...rooms]);
                        for (const room of shuffledRooms) {
                            if (!roomSchedule[room.id]) roomSchedule[room.id] = new Set();
                            if (!roomSchedule[room.id]!.has(slotKey)) {
                                assignedRoomId = room.id;
                                break;
                            }
                        }

                        // We can schedule it here!
                        timetableEntriesToCreate.push({
                            organizationId,
                            academicYearId,
                            teachingAssignmentId: assignment.id,
                            classPeriodId: period.id,
                            dayOfWeek: day,
                            roomId: assignedRoomId
                        });

                        // Mark as busy
                        sectionSchedule[sectionId]!.add(slotKey);
                        teacherSchedule[teacherId!]!.add(slotKey);
                        if (assignedRoomId) {
                            if (!roomSchedule[assignedRoomId]) roomSchedule[assignedRoomId] = new Set();
                            roomSchedule[assignedRoomId]!.add(slotKey);
                        }
                        
                        scheduledDays.add(day);
                        periodsNeeded--;
                        break; // Move to next day or assignment
                    }
                }
            }

            if (periodsNeeded > 0) {
                console.warn(`Could not schedule ${periodsNeeded} periods for assignment ${assignment.id}`);
            }
        }

        // 6. Bulk Insert the generated timetable
        if (timetableEntriesToCreate.length > 0) {
            await prisma.timetable.createMany({
                data: timetableEntriesToCreate
            });
            
            // Audit Log
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    action: "TIMETABLE_AUTO_GENERATED",
                    resource: "Timetable",
                    resourceId: "BULK",
                    newValue: { count: timetableEntriesToCreate.length }
                }
            });
        }

        return {
            success: true,
            totalGenerated: timetableEntriesToCreate.length
        };
    }
}
