import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/api-response.js";

// Custom error class for API errors
export class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ApiError";
    }
}

// Global error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Caught Exception:", err);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(ApiResponse.error(err.message));
    }

    // Prisma specific errors could be caught here (e.g. unique constraint violation)
    if (err.code === "P2002") {
        return res.status(409).json(ApiResponse.error("A record with this data already exists."));
    }

    if (err.code === "P2025") {
        return res.status(404).json(ApiResponse.error("Record not found."));
    }

    // Default 500 error
    return res.status(500).json(ApiResponse.error("Internal Server Error"));
};

// 404 handler for unknown routes
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json(ApiResponse.error(`Route ${req.method} ${req.url} not found`));
};
