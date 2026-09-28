import { prisma } from "../../infrastructure/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";

export const VALID_INSTRUCTIONAL_DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY"
] as const;

export type InstructionalDay = typeof VALID_INSTRUCTIONAL_DAYS[number];

export interface SchoolGeneralSettings {
    primaryLanguage: string;
    schoolDayStartTime: string;
    schoolDayEndTime: string;
    periodDurationMinutes: number;
    instructionalDays: InstructionalDay[];
}

export interface SchoolAttendanceSettings {
    consecutiveUnexcusedAbsenceThreshold: number;
    absenceAlertEnabled: boolean;
    attendanceNotificationEnabled: boolean;
}

export interface SchoolNotificationSettings {
    emergencyBroadcastEnabled: boolean;
    dailySummaryEnabled: boolean;
}

export interface SchoolOperationalSettings {
    general: SchoolGeneralSettings;
    attendance: SchoolAttendanceSettings;
    notifications: SchoolNotificationSettings;
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolOperationalSettings = {
    general: {
        primaryLanguage: "English",
        schoolDayStartTime: "08:00",
        schoolDayEndTime: "15:30",
        periodDurationMinutes: 45,
        instructionalDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    },
    attendance: {
        consecutiveUnexcusedAbsenceThreshold: 3,
        absenceAlertEnabled: true,
        attendanceNotificationEnabled: true
    },
    notifications: {
        emergencyBroadcastEnabled: true,
        dailySummaryEnabled: false
    }
};

export class SchoolSettingsService {
    /**
     * Helper to validate HH:MM time format
     */
    private static isValidTimeFormat(time: string): boolean {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    }

    /**
     * Converts HH:MM string into minutes from midnight for comparison
     */
    private static timeToMinutes(time: string): number {
        const parts = time.split(":");
        const hours = parseInt(parts[0] || "0", 10);
        const minutes = parseInt(parts[1] || "0", 10);
        return hours * 60 + minutes;
    }

    /**
     * Validate General Operations settings payload
     */
    static validateGeneralSettings(data: any): Partial<SchoolGeneralSettings> {
        const validated: Partial<SchoolGeneralSettings> = {};

        if (data.primaryLanguage !== undefined) {
            if (typeof data.primaryLanguage !== "string" || !data.primaryLanguage.trim() || data.primaryLanguage.length > 50) {
                throw new Error("Primary language must be a non-empty string under 50 characters.");
            }
            validated.primaryLanguage = data.primaryLanguage.trim();
        }

        if (data.schoolDayStartTime !== undefined) {
            if (typeof data.schoolDayStartTime !== "string" || !this.isValidTimeFormat(data.schoolDayStartTime)) {
                throw new Error("School day start time must be in HH:MM 24-hour format (e.g., 08:00).");
            }
            validated.schoolDayStartTime = data.schoolDayStartTime;
        }

        if (data.schoolDayEndTime !== undefined) {
            if (typeof data.schoolDayEndTime !== "string" || !this.isValidTimeFormat(data.schoolDayEndTime)) {
                throw new Error("School day end time must be in HH:MM 24-hour format (e.g., 15:30).");
            }
            validated.schoolDayEndTime = data.schoolDayEndTime;
        }

        if (validated.schoolDayStartTime && validated.schoolDayEndTime) {
            if (this.timeToMinutes(validated.schoolDayStartTime) >= this.timeToMinutes(validated.schoolDayEndTime)) {
                throw new Error("School day start time must be earlier than school day end time.");
            }
        }

        if (data.periodDurationMinutes !== undefined) {
            const minutes = Number(data.periodDurationMinutes);
            if (!Number.isInteger(minutes) || minutes < 15 || minutes > 180) {
                throw new Error("Period duration must be an integer between 15 and 180 minutes.");
            }
            validated.periodDurationMinutes = minutes;
        }

        if (data.instructionalDays !== undefined) {
            if (!Array.isArray(data.instructionalDays) || data.instructionalDays.length === 0) {
                throw new Error("At least one instructional day must be selected.");
            }
            for (const day of data.instructionalDays) {
                if (!VALID_INSTRUCTIONAL_DAYS.includes(day)) {
                    throw new Error(`Invalid instructional day: ${day}. Must be one of ${VALID_INSTRUCTIONAL_DAYS.join(", ")}.`);
                }
            }
            validated.instructionalDays = Array.from(new Set(data.instructionalDays)) as InstructionalDay[];
        }

        return validated;
    }

    /**
     * Validate Attendance Rules settings payload
     */
    static validateAttendanceSettings(data: any): Partial<SchoolAttendanceSettings> {
        const validated: Partial<SchoolAttendanceSettings> = {};

        if (data.consecutiveUnexcusedAbsenceThreshold !== undefined) {
            const threshold = Number(data.consecutiveUnexcusedAbsenceThreshold);
            if (!Number.isInteger(threshold) || threshold < 1 || threshold > 30) {
                throw new Error("Consecutive unexcused absence threshold must be an integer between 1 and 30.");
            }
            validated.consecutiveUnexcusedAbsenceThreshold = threshold;
        }

        if (data.absenceAlertEnabled !== undefined) {
            if (typeof data.absenceAlertEnabled !== "boolean") {
                throw new Error("absenceAlertEnabled must be a boolean.");
            }
            validated.absenceAlertEnabled = data.absenceAlertEnabled;
        }

        if (data.attendanceNotificationEnabled !== undefined) {
            if (typeof data.attendanceNotificationEnabled !== "boolean") {
                throw new Error("attendanceNotificationEnabled must be a boolean.");
            }
            validated.attendanceNotificationEnabled = data.attendanceNotificationEnabled;
        }

        return validated;
    }

    /**
     * Validate Notification Preferences payload
     */
    static validateNotificationSettings(data: any): Partial<SchoolNotificationSettings> {
        const validated: Partial<SchoolNotificationSettings> = {};

        if (data.emergencyBroadcastEnabled !== undefined) {
            if (typeof data.emergencyBroadcastEnabled !== "boolean") {
                throw new Error("emergencyBroadcastEnabled must be a boolean.");
            }
            validated.emergencyBroadcastEnabled = data.emergencyBroadcastEnabled;
        }

        if (data.dailySummaryEnabled !== undefined) {
            if (typeof data.dailySummaryEnabled !== "boolean") {
                throw new Error("dailySummaryEnabled must be a boolean.");
            }
            validated.dailySummaryEnabled = data.dailySummaryEnabled;
        }

        return validated;
    }

    /**
     * Fetch settings for a school organization, returning structured configuration
     */
    static async getSettings(organizationId: string): Promise<SchoolOperationalSettings> {
        const profile = await prisma.schoolProfile.findUnique({
            where: { organizationId },
            select: { configuration: true }
        });

        const rawConfig = (profile?.configuration as Record<string, any>) || {};

        return {
            general: {
                ...DEFAULT_SCHOOL_SETTINGS.general,
                ...(rawConfig.general || {})
            },
            attendance: {
                ...DEFAULT_SCHOOL_SETTINGS.attendance,
                ...(rawConfig.attendance || {})
            },
            notifications: {
                ...DEFAULT_SCHOOL_SETTINGS.notifications,
                ...(rawConfig.notifications || {})
            }
        };
    }

    /**
     * Update operational settings for a category while preserving unrelated JSON
     */
    static async updateSettings(
        organizationId: string,
        category: "general" | "attendance" | "notifications" | "all",
        data: any,
        userId?: string
    ): Promise<SchoolOperationalSettings> {
        const currentProfile = await prisma.schoolProfile.findUnique({
            where: { organizationId }
        });

        const currentConfig = (currentProfile?.configuration as Record<string, any>) || {};
        let updatedCategoryData: any = {};

        if (category === "general") {
            const validated = this.validateGeneralSettings(data);
            const mergedGeneral = {
                ...DEFAULT_SCHOOL_SETTINGS.general,
                ...(currentConfig.general || {}),
                ...validated
            };
            if (this.timeToMinutes(mergedGeneral.schoolDayStartTime) >= this.timeToMinutes(mergedGeneral.schoolDayEndTime)) {
                throw new Error("School day start time must be earlier than school day end time.");
            }
            updatedCategoryData = mergedGeneral;
            currentConfig.general = mergedGeneral;
        } else if (category === "attendance") {
            const validated = this.validateAttendanceSettings(data);
            const mergedAttendance = {
                ...DEFAULT_SCHOOL_SETTINGS.attendance,
                ...(currentConfig.attendance || {}),
                ...validated
            };
            updatedCategoryData = mergedAttendance;
            currentConfig.attendance = mergedAttendance;
        } else if (category === "notifications") {
            const validated = this.validateNotificationSettings(data);
            const mergedNotifications = {
                ...DEFAULT_SCHOOL_SETTINGS.notifications,
                ...(currentConfig.notifications || {}),
                ...validated
            };
            updatedCategoryData = mergedNotifications;
            currentConfig.notifications = mergedNotifications;
        } else if (category === "all") {
            if (data.general) {
                const validatedGeneral = this.validateGeneralSettings(data.general);
                const mergedGeneral = {
                    ...DEFAULT_SCHOOL_SETTINGS.general,
                    ...(currentConfig.general || {}),
                    ...validatedGeneral
                };
                if (this.timeToMinutes(mergedGeneral.schoolDayStartTime) >= this.timeToMinutes(mergedGeneral.schoolDayEndTime)) {
                    throw new Error("School day start time must be earlier than school day end time.");
                }
                currentConfig.general = mergedGeneral;
            }
            if (data.attendance) {
                const validatedAttendance = this.validateAttendanceSettings(data.attendance);
                currentConfig.attendance = {
                    ...DEFAULT_SCHOOL_SETTINGS.attendance,
                    ...(currentConfig.attendance || {}),
                    ...validatedAttendance
                };
            }
            if (data.notifications) {
                const validatedNotifications = this.validateNotificationSettings(data.notifications);
                currentConfig.notifications = {
                    ...DEFAULT_SCHOOL_SETTINGS.notifications,
                    ...(currentConfig.notifications || {}),
                    ...validatedNotifications
                };
            }
            updatedCategoryData = data;
        } else {
            throw new Error(`Unknown settings category: ${category}. Allowed: 'general', 'attendance', 'notifications', 'all'.`);
        }

        const profile = await prisma.schoolProfile.upsert({
            where: { organizationId },
            update: {
                configuration: currentConfig as Prisma.InputJsonValue
            },
            create: {
                organizationId,
                configuration: currentConfig as Prisma.InputJsonValue
            }
        });

        // Audit Logging for settings modification
        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: userId || null,
                action: "UPDATE_SETTINGS",
                resource: "SCHOOL_SETTINGS",
                resourceId: profile.id,
                newValue: {
                    category,
                    changes: updatedCategoryData
                }
            }
        });

        return {
            general: {
                ...DEFAULT_SCHOOL_SETTINGS.general,
                ...(currentConfig.general || {})
            },
            attendance: {
                ...DEFAULT_SCHOOL_SETTINGS.attendance,
                ...(currentConfig.attendance || {})
            },
            notifications: {
                ...DEFAULT_SCHOOL_SETTINGS.notifications,
                ...(currentConfig.notifications || {})
            }
        };
    }

    /**
     * Fetch paginated audit logs scoped strictly to the organization
     */
    static async getAuditLogs(organizationId: string, page: number = 1, limit: number = 20) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const skip = (safePage - 1) * safeLimit;

        const [total, logs] = await Promise.all([
            prisma.auditLog.count({
                where: { organizationId }
            }),
            prisma.auditLog.findMany({
                where: { organizationId },
                orderBy: { createdAt: "desc" },
                skip,
                take: safeLimit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            })
        ]);

        return {
            logs,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit) || 1
        };
    }
}
