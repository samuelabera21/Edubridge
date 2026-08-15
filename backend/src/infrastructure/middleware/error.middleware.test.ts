import { describe, it, expect, vi } from "vitest";
import { errorHandler, ApiError } from "./error.middleware.js";
import { Request, Response, NextFunction } from "express";

describe("Error Middleware", () => {
    it("should handle ApiError", () => {
        const mockReq = {} as Request;
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        } as unknown as Response;
        const mockNext = vi.fn() as NextFunction;

        const error = new ApiError(400, "Bad Request Test");
        
        // suppress console.error for test
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: "Bad Request Test"
        }));

        consoleSpy.mockRestore();
    });

    it("should handle unknown errors", () => {
        const mockReq = {} as Request;
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        } as unknown as Response;
        const mockNext = vi.fn() as NextFunction;

        const error = new Error("Unknown error");
        
        // suppress console.error for test
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: "Internal Server Error"
        }));

        consoleSpy.mockRestore();
    });
});
