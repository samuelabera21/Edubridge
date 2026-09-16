export interface OrganizationUnit {
    id: string;
    name: string;
    type: "SYSTEM" | "MINISTRY" | "BUREAU" | "WOREDA" | "SCHOOL";
    parentId?: string | null;
    status: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
    createdAt: string;
    updatedAt: string;
}

export interface SchoolProfile {
    id: string;
    organizationId: string;
    establishedYear?: number;
    contactEmail?: string;
    phoneNumber?: string;
    address?: string;
    schoolType?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AcademicYear {
    id: string;
    organizationId: string;
    name: string;
    startDate: string;
    endDate: string;
    status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    stats?: {
        students: number;
        teachers: number;
        grades: number;
        sections: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface Student {
    id: string;
    organizationId: string;
    userId: string;
    studentId: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    status: "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED";
    createdAt: string;
    updatedAt: string;
}

export interface Teacher {
    id: string;
    organizationId: string;
    userId: string;
    employeeId: string;
    specialization?: string;
    status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
    createdAt: string;
    updatedAt: string;
}

// Common API Response Wrappers
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ApiError {
    message: string;
    code?: string;
    details?: any;
}
