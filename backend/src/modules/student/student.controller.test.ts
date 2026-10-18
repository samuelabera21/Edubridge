import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createStudent, getStudents, enrollStudent, 
    getEnrollments, transferStudent, updateStudentStatus, getStudentProfile, getMySupportActivities,
    registerStudent, verifyStudentDocument
} from "./student.controller.js";
import { StudentService } from "./student.service.js";

vi.mock("./student.service.js", () => ({
    StudentService: {
        createStudent: vi.fn(),
        getStudents: vi.fn(),
        enrollStudent: vi.fn(),
        registerStudentIntake: vi.fn(),
        getEnrollments: vi.fn(),
        transferStudent: vi.fn(),
        updateStudentStatus: vi.fn(),
        getStudentByUserId: vi.fn(),
        getStudentSupportActivities: vi.fn(),
        verifyDocument: vi.fn(),
    }
}));

describe("Student Controller", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        vi.clearAllMocks();
    });

    describe("enrollStudent", () => {
        it("should return 403 if missing school scope", async () => {
            await enrollStudent(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { studentId: "s1" }; // missing year and grade
            
            await enrollStudent(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "studentId, academicYearId, and schoolGradeId are required" });
        });

        it("should enroll student successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { studentId: "s1", academicYearId: "ay1", schoolGradeId: "sg1" };
            
            const mockEnrollment = { id: "enr1" };
            vi.mocked(StudentService.enrollStudent).mockResolvedValue(mockEnrollment as any);

            await enrollStudent(mockReq as Request, mockRes as Response);

            expect(StudentService.enrollStudent).toHaveBeenCalledWith("school1", "s1", "ay1", "sg1", undefined);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockEnrollment);
        });
    });

    describe("transferStudent", () => {
        it("should transfer student mid-year", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { enrollmentId: "enr1" };
            mockReq.body = { targetSchoolGradeId: "sg2", targetSectionId: "sec2", reason: "Moved" };

            const mockNewEnrollment = { id: "enr2" };
            vi.mocked(StudentService.transferStudent).mockResolvedValue(mockNewEnrollment as any);

            await transferStudent(mockReq as Request, mockRes as Response);

            expect(StudentService.transferStudent).toHaveBeenCalledWith("school1", "enr1", "sg2", "sec2", "Moved");
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockNewEnrollment);
        });
    });

    describe("updateStudentStatus", () => {
        it("should update student status to dropped out", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { enrollmentId: "enr1" };
            mockReq.body = { status: "DROPPED_OUT", reason: "Left school" };

            const mockUpdate = { id: "enr1", status: "DROPPED_OUT" };
            vi.mocked(StudentService.updateStudentStatus).mockResolvedValue(mockUpdate as any);

            await updateStudentStatus(mockReq as Request, mockRes as Response);

            expect(StudentService.updateStudentStatus).toHaveBeenCalledWith("school1", "enr1", "DROPPED_OUT", "Left school");
            expect(mockRes.json).toHaveBeenCalledWith(mockUpdate);
        });
    });

    describe("getStudentProfile", () => {
        it("should return the authenticated student's scoped profile", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "user1" };
            const profile = { id: "student1", userId: "user1" };
            vi.mocked(StudentService.getStudentByUserId).mockResolvedValue(profile as any);

            await getStudentProfile(mockReq as Request, mockRes as Response);

            expect(StudentService.getStudentByUserId).toHaveBeenCalledWith("user1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith(profile);
        });

        it("should return 403 when authentication context is incomplete", async () => {
            (mockReq as any).accessScope = { id: "school1" };

            await getStudentProfile(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(StudentService.getStudentByUserId).not.toHaveBeenCalled();
        });

        it("should return 404 when the account has no active student profile", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "user1" };
            vi.mocked(StudentService.getStudentByUserId).mockResolvedValue(null);

            await getStudentProfile(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Student profile not found" });
        });
    });

    describe("getMySupportActivities", () => {
        it("returns support activities for the authenticated student and school scope", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "user1" };
            const activities = [{ id: "support1", supportCategory: "REMEDIAL" }];
            vi.mocked(StudentService.getStudentSupportActivities).mockResolvedValue(activities as any);

            await getMySupportActivities(mockReq as Request, mockRes as Response);

            expect(StudentService.getStudentSupportActivities).toHaveBeenCalledWith("user1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith(activities);
        });

        it("rejects requests without an authenticated student context", async () => {
            (mockReq as any).accessScope = { id: "school1" };

            await getMySupportActivities(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(StudentService.getStudentSupportActivities).not.toHaveBeenCalled();
        });
    });

    describe("registerStudent", () => {
        it("should return 403 if missing school scope", async () => {
            await registerStudent(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("should register student intake successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "principal1" };
            mockReq.body = {
                student: { firstName: "Abebe", fatherName: "Kebede", grandfatherName: "Tessema" },
                enrollment: { academicYearId: "ay1", schoolGradeId: "sg1" }
            };

            const mockResult = {
                student: { id: "s1", firstName: "Abebe", studentId: "STU-2601-1234" },
                enrollment: { id: "enr1" }
            };
            vi.mocked(StudentService.registerStudentIntake).mockResolvedValue(mockResult as any);

            await registerStudent(mockReq as Request, mockRes as Response);

            expect(StudentService.registerStudentIntake).toHaveBeenCalledWith("school1", mockReq.body, "principal1");
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });

        it("should return 400 when registration fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "principal1" };
            mockReq.body = {};
            vi.mocked(StudentService.registerStudentIntake).mockRejectedValue(new Error("Academic Year and School Grade are required"));

            await registerStudent(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Academic Year and School Grade are required" });
        });
    });

    describe("verifyStudentDocument", () => {
        it("should return 403 if missing school scope", async () => {
            await verifyStudentDocument(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("should return 400 if verificationStatus is missing", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { documentId: "doc-123" };
            mockReq.body = {};

            await verifyStudentDocument(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "verificationStatus is required" });
        });

        it("should verify document successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "verifier-user-1" };
            mockReq.params = { documentId: "doc-123" };
            mockReq.body = {
                verificationStatus: "VERIFIED",
                verificationNotes: "Verified against institutional records"
            };

            const mockVerified = {
                id: "doc-123",
                verificationStatus: "VERIFIED",
                verificationNotes: "Verified against institutional records",
                verifiedById: "verifier-user-1"
            };
            vi.mocked(StudentService.verifyDocument).mockResolvedValue(mockVerified as any);

            await verifyStudentDocument(mockReq as Request, mockRes as Response);

            expect(StudentService.verifyDocument).toHaveBeenCalledWith(
                "school1",
                "doc-123",
                "VERIFIED",
                "Verified against institutional records",
                "verifier-user-1"
            );
            expect(mockRes.json).toHaveBeenCalledWith(mockVerified);
        });

        it("should return 400 when StudentService throws an error", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "verifier-user-1" };
            mockReq.params = { documentId: "doc-123" };
            mockReq.body = { verificationStatus: "VERIFIED" };

            vi.mocked(StudentService.verifyDocument).mockRejectedValue(new Error("Document not found or student does not belong to this school organization"));

            await verifyStudentDocument(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Document not found or student does not belong to this school organization" });
        });
    });
});
