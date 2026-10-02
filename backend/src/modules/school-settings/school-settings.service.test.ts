import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchoolSettingsService, DEFAULT_SCHOOL_SETTINGS } from "./school-settings.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        schoolProfile: {
            findUnique: vi.fn(),
            upsert: vi.fn()
        },
        auditLog: {
            findMany: vi.fn(),
            count: vi.fn(),
            create: vi.fn()
        }
    }
}));

describe("SchoolSettingsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. getSettings", () => {
        it("should return default settings if school profile has no custom configuration", async () => {
            (prisma.schoolProfile.findUnique as any).mockResolvedValue({
                id: "profile-1",
                organizationId: "org-1",
                configuration: null
            });

            const settings = await SchoolSettingsService.getSettings("org-1");

            expect(prisma.schoolProfile.findUnique).toHaveBeenCalledWith({
                where: { organizationId: "org-1" },
                select: { configuration: true }
            });
            expect(settings).toEqual(DEFAULT_SCHOOL_SETTINGS);
        });

        it("should merge stored configuration with defaults", async () => {
            (prisma.schoolProfile.findUnique as any).mockResolvedValue({
                id: "profile-1",
                organizationId: "org-1",
                configuration: {
                    general: {
                        primaryLanguage: "Amharic",
                        periodDurationMinutes: 50
                    },
                    attendance: {
                        consecutiveUnexcusedAbsenceThreshold: 5
                    }
                }
            });

            const settings = await SchoolSettingsService.getSettings("org-1");

            expect(settings.general.primaryLanguage).toBe("Amharic");
            expect(settings.general.periodDurationMinutes).toBe(50);
            expect(settings.general.schoolDayStartTime).toBe(DEFAULT_SCHOOL_SETTINGS.general.schoolDayStartTime);
            expect(settings.attendance.consecutiveUnexcusedAbsenceThreshold).toBe(5);
            expect(settings.attendance.absenceAlertEnabled).toBe(true);
            expect(settings.notifications.emergencyBroadcastEnabled).toBe(true);
        });
    });

    describe("2. updateSettings & Preservation of Unrelated JSON", () => {
        it("should update attendance settings and preserve existing general/notifications configuration", async () => {
            const existingConfig = {
                general: {
                    primaryLanguage: "Oromiffa",
                    schoolDayStartTime: "08:30",
                    schoolDayEndTime: "16:00",
                    periodDurationMinutes: 45,
                    instructionalDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
                },
                notifications: {
                    emergencyBroadcastEnabled: true,
                    dailySummaryEnabled: true
                },
                customOtherDomainKey: "preserved-data"
            };

            (prisma.schoolProfile.findUnique as any).mockResolvedValue({
                id: "profile-1",
                organizationId: "org-1",
                configuration: existingConfig
            });

            (prisma.schoolProfile.upsert as any).mockResolvedValue({
                id: "profile-1",
                organizationId: "org-1"
            });

            (prisma.auditLog.create as any).mockResolvedValue({ id: "log-1" });

            const updated = await SchoolSettingsService.updateSettings(
                "org-1",
                "attendance",
                {
                    consecutiveUnexcusedAbsenceThreshold: 4,
                    absenceAlertEnabled: false,
                    attendanceNotificationEnabled: true
                },
                "user-admin-1"
            );

            expect(prisma.schoolProfile.upsert).toHaveBeenCalledWith({
                where: { organizationId: "org-1" },
                update: {
                    configuration: expect.objectContaining({
                        general: existingConfig.general,
                        notifications: existingConfig.notifications,
                        attendance: {
                            consecutiveUnexcusedAbsenceThreshold: 4,
                            absenceAlertEnabled: false,
                            attendanceNotificationEnabled: true
                        },
                        customOtherDomainKey: "preserved-data"
                    })
                },
                create: expect.any(Object)
            });

            // Verify AuditLog creation
            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: {
                    organizationId: "org-1",
                    userId: "user-admin-1",
                    action: "UPDATE_SETTINGS",
                    resource: "SCHOOL_SETTINGS",
                    resourceId: "profile-1",
                    newValue: {
                        category: "attendance",
                        changes: {
                            consecutiveUnexcusedAbsenceThreshold: 4,
                            absenceAlertEnabled: false,
                            attendanceNotificationEnabled: true
                        }
                    }
                }
            });

            expect(updated.attendance.consecutiveUnexcusedAbsenceThreshold).toBe(4);
            expect(updated.attendance.absenceAlertEnabled).toBe(false);
            expect(updated.general.primaryLanguage).toBe("Oromiffa");
        });
    });

    describe("3. Validation Rules & Rejections", () => {
        it("should reject attendance threshold less than 1 or greater than 30", async () => {
            await expect(
                SchoolSettingsService.updateSettings("org-1", "attendance", {
                    consecutiveUnexcusedAbsenceThreshold: 0
                })
            ).rejects.toThrow("Consecutive unexcused absence threshold must be an integer between 1 and 30");

            await expect(
                SchoolSettingsService.updateSettings("org-1", "attendance", {
                    consecutiveUnexcusedAbsenceThreshold: 35
                })
            ).rejects.toThrow("Consecutive unexcused absence threshold must be an integer between 1 and 30");
        });

        it("should reject start time later than or equal to end time", async () => {
            (prisma.schoolProfile.findUnique as any).mockResolvedValue({
                id: "profile-1",
                organizationId: "org-1",
                configuration: {}
            });

            await expect(
                SchoolSettingsService.updateSettings("org-1", "general", {
                    schoolDayStartTime: "16:00",
                    schoolDayEndTime: "08:00"
                })
            ).rejects.toThrow("School day start time must be earlier than school day end time");

            await expect(
                SchoolSettingsService.updateSettings("org-1", "general", {
                    schoolDayStartTime: "09:00",
                    schoolDayEndTime: "09:00"
                })
            ).rejects.toThrow("School day start time must be earlier than school day end time");
        });

        it("should reject invalid period duration", async () => {
            await expect(
                SchoolSettingsService.updateSettings("org-1", "general", {
                    periodDurationMinutes: 10
                })
            ).rejects.toThrow("Period duration must be an integer between 15 and 180 minutes");

            await expect(
                SchoolSettingsService.updateSettings("org-1", "general", {
                    periodDurationMinutes: 200
                })
            ).rejects.toThrow("Period duration must be an integer between 15 and 180 minutes");
        });

        it("should reject empty instructional days list or invalid day names", async () => {
            await expect(
                SchoolSettingsService.updateSettings("org-1", "general", {
                    instructionalDays: []
                })
            ).rejects.toThrow("At least one instructional day must be selected");

            await expect(
                SchoolSettingsService.updateSettings("org-1", "general", {
                    instructionalDays: ["FUNDAY"]
                })
            ).rejects.toThrow("Invalid instructional day");
        });
    });

    describe("4. getAuditLogs strictly scoped to school", () => {
        it("should query audit logs filtering strictly by the organizationId", async () => {
            (prisma.auditLog.count as any).mockResolvedValue(1);
            (prisma.auditLog.findMany as any).mockResolvedValue([
                {
                    id: "log-1",
                    organizationId: "school-abc",
                    action: "UPDATE_SETTINGS",
                    resource: "SCHOOL_SETTINGS",
                    createdAt: new Date(),
                    user: { id: "u-1", name: "Principal", email: "p@school.edu" }
                }
            ]);

            const result = await SchoolSettingsService.getAuditLogs("school-abc", 1, 10);

            expect(prisma.auditLog.count).toHaveBeenCalledWith({
                where: { organizationId: "school-abc" }
            });
            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { organizationId: "school-abc" },
                orderBy: { createdAt: "desc" },
                skip: 0,
                take: 10,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            expect(result.logs.length).toBe(1);
            expect(result.total).toBe(1);
        });
    });
});
