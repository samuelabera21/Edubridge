import { prisma } from "../../infrastructure/prisma/client.js";

function parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(":");
    const h = Number(parts[0] || 0);
    const m = Number(parts[1] || 0);
    return h * 60 + m;
}

function formatMinutesToTime(totalMins: number): string {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export class TimetableConfigService {
    static async getTimetableConfig(organizationId: string, academicYearId: string) {
        return prisma.timetableConfig.findUnique({
            where: {
                organizationId_academicYearId: {
                    organizationId,
                    academicYearId
                }
            }
        });
    }

    static async saveTimetableConfig(organizationId: string, data: {
        academicYearId: string;
        operatingDays: number[];
        startTime: string;
        periodDuration: number;
        periodsPerDay: number;
        breakDuration?: number;
        breakAfter?: number;
        lunchDuration?: number;
        lunchAfter?: number;
        shift: string;
    }) {
        // 1. Save or update TimetableConfig
        const config = await prisma.timetableConfig.upsert({
            where: {
                organizationId_academicYearId: {
                    organizationId,
                    academicYearId: data.academicYearId
                }
            },
            update: {
                operatingDays: data.operatingDays,
                startTime: data.startTime,
                periodDuration: Number(data.periodDuration),
                periodsPerDay: Number(data.periodsPerDay),
                breakDuration: data.breakDuration ? Number(data.breakDuration) : null,
                breakAfter: data.breakAfter ? Number(data.breakAfter) : null,
                lunchDuration: data.lunchDuration ? Number(data.lunchDuration) : null,
                lunchAfter: data.lunchAfter ? Number(data.lunchAfter) : null,
                shift: data.shift
            },
            create: {
                organizationId,
                academicYearId: data.academicYearId,
                operatingDays: data.operatingDays,
                startTime: data.startTime,
                periodDuration: Number(data.periodDuration),
                periodsPerDay: Number(data.periodsPerDay),
                breakDuration: data.breakDuration ? Number(data.breakDuration) : null,
                breakAfter: data.breakAfter ? Number(data.breakAfter) : null,
                lunchDuration: data.lunchDuration ? Number(data.lunchDuration) : null,
                lunchAfter: data.lunchAfter ? Number(data.lunchAfter) : null,
                shift: data.shift
            }
        });

        // 2. Generate Class Periods
        // Check if active timetable entries exist
        const activeEntriesCount = await prisma.timetable.count({
            where: {
                organizationId,
                academicYearId: data.academicYearId
            }
        });

        if (activeEntriesCount > 0) {
            throw new Error("Cannot regenerate periods: Lessons are already scheduled in the timetable. Please clear the schedule first.");
        }

        // Delete existing class periods for this organization
        await prisma.classPeriod.deleteMany({
            where: { organizationId }
        });

        // Compute and create new class periods
        let currentMinutes = parseTimeToMinutes(data.startTime);
        const periodsToCreate: any[] = [];
        let instructionalCount = 0;

        while (instructionalCount < data.periodsPerDay) {
            // Check for break recess insertion
            if (data.breakAfter && instructionalCount === data.breakAfter && !periodsToCreate.some(p => p.name.toLowerCase() === "break")) {
                const breakStart = formatMinutesToTime(currentMinutes);
                currentMinutes += data.breakDuration || 20;
                const breakEnd = formatMinutesToTime(currentMinutes);
                periodsToCreate.push({
                    organizationId,
                    name: `Break`,
                    startTime: breakStart,
                    endTime: breakEnd,
                    isBreak: true
                });
                continue;
            }

            // Check for lunch recess insertion
            if (data.lunchAfter && instructionalCount === data.lunchAfter && !periodsToCreate.some(p => p.name.toLowerCase() === "lunch")) {
                const lunchStart = formatMinutesToTime(currentMinutes);
                currentMinutes += data.lunchDuration || 50;
                const lunchEnd = formatMinutesToTime(currentMinutes);
                periodsToCreate.push({
                    organizationId,
                    name: `Lunch`,
                    startTime: lunchStart,
                    endTime: lunchEnd,
                    isBreak: true
                });
                continue;
            }

            // Normal period
            instructionalCount++;
            const periodStart = formatMinutesToTime(currentMinutes);
            currentMinutes += data.periodDuration;
            const periodEnd = formatMinutesToTime(currentMinutes);
            periodsToCreate.push({
                organizationId,
                name: `Period ${instructionalCount}`,
                startTime: periodStart,
                endTime: periodEnd,
                isBreak: false
            });
        }

        // Save class periods
        for (const period of periodsToCreate) {
            await prisma.classPeriod.create({
                data: period
            });
        }

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TIMETABLE_CONFIG_SAVED",
                resource: "TimetableConfig",
                resourceId: config.id,
                newValue: JSON.parse(JSON.stringify(config))
            }
        });

        return config;
    }

    static async updateRoomAvailability(organizationId: string, roomId: string, availability: any) {
        const room = await prisma.schoolResource.findFirst({
            where: { id: roomId, organizationId }
        });
        if (!room) throw new Error("Room not found");

        const updated = await prisma.schoolResource.update({
            where: { id: roomId },
            data: { availability }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "ROOM_AVAILABILITY_UPDATED",
                resource: "SchoolResource",
                resourceId: roomId,
                newValue: JSON.parse(JSON.stringify(availability))
            }
        });

        return updated;
    }
}
