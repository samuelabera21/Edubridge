import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSettings, updateSettings, getAuditLogs } from "./school-settings.controller.js";
import { SchoolSettingsService } from "./school-settings.service.js";

vi.mock("./school-settings.service.js", () => ({
    SchoolSettingsService: {
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
        getAuditLogs: vi.fn()
    }
}));

describe("SchoolSettingsController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getSettings", () => {
        it("should return 403 if school scope is missing", async () => {
            const req: any = { accessScope: null };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await getSettings(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("should return settings for authenticated school", async () => {
            const req: any = { accessScope: { id: "school-1" } };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            (SchoolSettingsService.getSettings as any).mockResolvedValue({
                general: { primaryLanguage: "English" }
            });

            await getSettings(req, res);

            expect(SchoolSettingsService.getSettings).toHaveBeenCalledWith("school-1");
            expect(res.json).toHaveBeenCalledWith({
                general: { primaryLanguage: "English" }
            });
        });
    });

    describe("updateSettings", () => {
        it("should return 403 if school scope is missing", async () => {
            const req: any = { accessScope: null, body: {} };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await updateSettings(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it("should call updateSettings with derived organizationId and return updated data", async () => {
            const req: any = {
                accessScope: { id: "school-1" },
                user: { id: "admin-1" },
                body: {
                    category: "attendance",
                    data: { consecutiveUnexcusedAbsenceThreshold: 5 }
                }
            };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            (SchoolSettingsService.updateSettings as any).mockResolvedValue({
                attendance: { consecutiveUnexcusedAbsenceThreshold: 5 }
            });

            await updateSettings(req, res);

            expect(SchoolSettingsService.updateSettings).toHaveBeenCalledWith(
                "school-1",
                "attendance",
                { consecutiveUnexcusedAbsenceThreshold: 5 },
                "admin-1"
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "School operational settings updated successfully",
                settings: {
                    attendance: { consecutiveUnexcusedAbsenceThreshold: 5 }
                }
            });
        });

        it("should return 400 when service validation throws an error", async () => {
            const req: any = {
                accessScope: { id: "school-1" },
                user: { id: "admin-1" },
                body: {
                    category: "attendance",
                    data: { consecutiveUnexcusedAbsenceThreshold: -1 }
                }
            };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            (SchoolSettingsService.updateSettings as any).mockRejectedValue(
                new Error("Consecutive unexcused absence threshold must be an integer between 1 and 30.")
            );

            await updateSettings(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Consecutive unexcused absence threshold must be an integer between 1 and 30."
            });
        });
    });

    describe("getAuditLogs", () => {
        it("should return paginated audit logs for the school", async () => {
            const req: any = {
                accessScope: { id: "school-1" },
                query: { page: "2", limit: "10" }
            };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            (SchoolSettingsService.getAuditLogs as any).mockResolvedValue({
                logs: [],
                total: 25,
                page: 2,
                limit: 10,
                totalPages: 3
            });

            await getAuditLogs(req, res);

            expect(SchoolSettingsService.getAuditLogs).toHaveBeenCalledWith("school-1", 2, 10);
            expect(res.json).toHaveBeenCalledWith({
                logs: [],
                total: 25,
                page: 2,
                limit: 10,
                totalPages: 3
            });
        });
    });
});
