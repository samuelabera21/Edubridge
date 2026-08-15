export class ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    meta?: any;

    constructor(success: boolean, data?: T, error?: string, meta?: any) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.meta = meta;
    }

    static success<T>(data: T, meta?: any) {
        return new ApiResponse<T>(true, data, undefined, meta);
    }

    static error(message: string) {
        return new ApiResponse<null>(false, undefined, message);
    }
}
