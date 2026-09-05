import { describe, it, expect, vi, beforeEach } from "vitest";
import { AcademicService } from "./academic.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        academicYear: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
        },
        academicCalendar: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        academicPeriod: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        calendarEvent: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        auditLog: {
            create: vi.fn(),
        },
    }
}));

describe("Step 2.1 - Academic Calendar & Ethiopian School Calendar Service", () => {
    const orgId = "school-org-123";
    const userId = "user-principal-456";
    const calendarId = "cal-123";
    const yearId = "ay-2026";

    const mockAcademicYear = {
        id: yearId,
        organizationId: orgId,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        endDate: new Date("2027-07-15T00:00:00.000Z"),
        status: "ACTIVE",
    };

    const mockCalendar = {
        id: calendarId,
        organizationId: orgId,
        academicYearId: yearId,
        status: "DRAFT",
        academicYear: mockAcademicYear,
        periods: [
            {
                id: "sem-1",
                name: "Semester 1",
                type: "SEMESTER",
                startDate: new Date("2026-09-08T00:00:00.000Z"),
                endDate: new Date("2027-01-30T00:00:00.000Z"),
            },
            {
                id: "sem-2",
                name: "Semester 2",
                type: "SEMESTER",
                startDate: new Date("2027-02-15T00:00:00.000Z"),
                endDate: new Date("2027-07-05T00:00:00.000Z"),
            }
        ],
        events: [] as any[],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Calendar Event Validation & Creation", () => {
        it("should successfully create a valid exam event inside its parent semester", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);
            const createdMock = {
                id: "evt-midterm-1",
                academicCalendarId: calendarId,
                title: "Semester 1 Midterm Examinations",
                category: "EXAMINATION",
                type: "MIDTERM_EXAM",
                startDate: new Date("2026-11-10T00:00:00.000Z"),
                endDate: new Date("2026-11-16T00:00:00.000Z"),
                academicPeriodId: "sem-1",
                isSchoolClosed: false,
            };
            vi.mocked(prisma.calendarEvent.create).mockResolvedValue(createdMock as any);

            const result = await AcademicService.createCalendarEvent(
                orgId,
                calendarId,
                {
                    title: "Semester 1 Midterm Examinations",
                    category: "EXAMINATION",
                    type: "MIDTERM_EXAM",
                    startDate: "2026-11-10",
                    endDate: "2026-11-16",
                    academicPeriodId: "sem-1",
                },
                userId
            );

            expect(result.event).toBeDefined();
            expect(result.event.id).toBe("evt-midterm-1");
            expect(result.warnings).toEqual([]);
            expect(prisma.calendarEvent.create).toHaveBeenCalledTimes(1);
        });

        it("should reject event creation if startDate is after endDate", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            await expect(
                AcademicService.createCalendarEvent(
                    orgId,
                    calendarId,
                    {
                        title: "Faulty Event",
                        category: "SCHOOL_EVENT",
                        type: "ORIENTATION",
                        startDate: "2026-11-20",
                        endDate: "2026-11-10",
                    },
                    userId
                )
            ).rejects.toThrow("Event startDate must be at or before endDate");
        });

        it("should reject event creation if dates fall outside academic year boundaries", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            await expect(
                AcademicService.createCalendarEvent(
                    orgId,
                    calendarId,
                    {
                        title: "Out of Bounds Event",
                        category: "SCHOOL_EVENT",
                        type: "OTHER",
                        startDate: "2026-08-01",
                        endDate: "2026-08-05",
                    },
                    userId
                )
            ).rejects.toThrow(/must fall within academic year boundary/);
        });

        it("should reject exam if scheduled outside parent semester range", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            await expect(
                AcademicService.createCalendarEvent(
                    orgId,
                    calendarId,
                    {
                        title: "Misplaced Midterm",
                        category: "EXAMINATION",
                        type: "MIDTERM_EXAM",
                        startDate: "2027-02-10", // Semester 1 ends Jan 30
                        endDate: "2027-02-14",
                        academicPeriodId: "sem-1",
                    },
                    userId
                )
            ).rejects.toThrow(/must fall within Semester 1 dates/);
        });

        it("should return soft conflict warning when event overlaps a school closure or concurrent exam", async () => {
            const calendarWithClosure = {
                ...mockCalendar,
                events: [
                    {
                        id: "evt-closure-1",
                        academicCalendarId: calendarId,
                        title: "Regional Holiday",
                        category: "HOLIDAY_BREAK",
                        type: "PUBLIC_HOLIDAY",
                        startDate: new Date("2026-11-12T00:00:00.000Z"),
                        endDate: new Date("2026-11-12T00:00:00.000Z"),
                        isSchoolClosed: true,
                    }
                ]
            };
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(calendarWithClosure as any);

            const createdMock = {
                id: "evt-midterm-1",
                academicCalendarId: calendarId,
                title: "Semester 1 Midterm Examinations",
                category: "EXAMINATION",
                type: "MIDTERM_EXAM",
                startDate: new Date("2026-11-10T00:00:00.000Z"),
                endDate: new Date("2026-11-16T00:00:00.000Z"),
                academicPeriodId: "sem-1",
                isSchoolClosed: false,
            };
            vi.mocked(prisma.calendarEvent.create).mockResolvedValue(createdMock as any);

            const result = await AcademicService.createCalendarEvent(
                orgId,
                calendarId,
                {
                    title: "Semester 1 Midterm Examinations",
                    category: "EXAMINATION",
                    type: "MIDTERM_EXAM",
                    startDate: "2026-11-10",
                    endDate: "2026-11-16",
                    academicPeriodId: "sem-1",
                    isSchoolClosed: false,
                },
                userId
            );

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0]).toContain("coincides with scheduled school closure: \"Regional Holiday\"");
        });
    });

    describe("Calendar Publication Lifecycle & Auditing", () => {
        it("should fail to publish calendar if it has no academic periods", async () => {
            const emptyPeriodsCalendar = {
                ...mockCalendar,
                periods: [],
            };
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(emptyPeriodsCalendar as any);

            await expect(
                AcademicService.publishCalendar(orgId, calendarId, userId)
            ).rejects.toThrow("Cannot publish academic calendar without at least one academic period (semester/term)");
        });

        it("should successfully publish calendar and log audit trail", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);
            vi.mocked(prisma.academicCalendar.update).mockResolvedValue({
                ...mockCalendar,
                status: "PUBLISHED",
                publishedAt: new Date(),
                publishedById: userId,
            } as any);

            const result = await AcademicService.publishCalendar(orgId, calendarId, userId);

            expect(result.status).toBe("PUBLISHED");
            expect(prisma.academicCalendar.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: calendarId },
                    data: expect.objectContaining({ status: "PUBLISHED" }),
                })
            );
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "CALENDAR_PUBLISHED",
                        resource: "ACADEMIC_CALENDAR",
                        resourceId: calendarId,
                    })
                })
            );
        });

        it("should unpublish calendar back to REVIEW and log audit trail", async () => {
            const publishedCalendar = {
                ...mockCalendar,
                status: "PUBLISHED",
            };
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(publishedCalendar as any);
            vi.mocked(prisma.academicCalendar.update).mockResolvedValue({
                ...mockCalendar,
                status: "REVIEW",
            } as any);

            const result = await AcademicService.unpublishCalendar(orgId, calendarId, userId);

            expect(result.status).toBe("REVIEW");
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "CALENDAR_UNPUBLISHED",
                        resource: "ACADEMIC_CALENDAR",
                        resourceId: calendarId,
                    })
                })
            );
        });
    });

    describe("Ethiopian Holiday Suggestions & Confirmation", () => {
        it("should generate suggested Ethiopian holidays within the academic year", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                ...mockAcademicYear,
                academicCalendar: {
                    ...mockCalendar,
                    events: [
                        {
                            id: "evt-existing-meskel",
                            title: "Meskel (Finding of the True Cross)",
                            category: "HOLIDAY_BREAK",
                            type: "PUBLIC_HOLIDAY",
                            startDate: new Date("2026-09-27T00:00:00.000Z"),
                            endDate: new Date("2026-09-27T00:00:00.000Z"),
                        }
                    ]
                }
            } as any);

            const suggestions = await AcademicService.getSuggestedHolidays(orgId, yearId);

            expect(suggestions.length).toBeGreaterThan(0);
            
            // Meskel should be identified as already added
            const meskel = suggestions.find(s => s.title.includes("Meskel"));
            expect(meskel).toBeDefined();
            expect(meskel?.isAdded).toBe(true);

            // Adwa Victory Day should be suggested and not yet added
            const adwa = suggestions.find(s => s.title.includes("Adwa"));
            expect(adwa).toBeDefined();
            expect(adwa?.isAdded).toBe(false);
            expect(adwa?.suggestedStartDate).toBe("2027-03-02");
        });

        it("should confirm and import a suggested holiday with administrator customization", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            const createdHoliday = {
                id: "evt-adwa-1",
                academicCalendarId: calendarId,
                title: "Victory of Adwa Day",
                category: "HOLIDAY_BREAK",
                type: "PUBLIC_HOLIDAY",
                startDate: new Date("2027-03-02T00:00:00.000Z"),
                endDate: new Date("2027-03-02T00:00:00.000Z"),
                isSchoolClosed: true,
                source: "IMPORTED",
            };
            vi.mocked(prisma.calendarEvent.create).mockResolvedValue(createdHoliday as any);

            const result = await AcademicService.confirmSuggestedHoliday(
                orgId,
                calendarId,
                {
                    title: "Victory of Adwa Day",
                    type: "PUBLIC_HOLIDAY",
                    startDate: "2027-03-02",
                    endDate: "2027-03-02",
                    isSchoolClosed: true,
                    description: "Celebration of Ethiopia's victory at the Battle of Adwa (Yekatit 23).",
                },
                userId
            );

            expect(result.id).toBe("evt-adwa-1");
            expect(prisma.calendarEvent.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        title: "Victory of Adwa Day",
                        source: "IMPORTED",
                        isSchoolClosed: true,
                    })
                })
            );
        });
    });
});
