import { Request } from "express";

export interface PaginationResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export function getPaginationParams(req: Request) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Safety boundaries
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const skip = (safePage - 1) * safeLimit;
    const take = safeLimit;

    return { skip, take, page: safePage, limit: safeLimit };
}

export function formatPaginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginationResult<T> {
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}
