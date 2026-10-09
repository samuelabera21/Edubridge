import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// ─── Allowed MIME types & Extensions ─────────────────────────────────────────
const ALLOWED_MIME_TYPES: Record<string, string> = {
    // Images
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",

    // Documents (PDF, Word, Text)
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",

    // Spreadsheets (Excel, CSV)
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/csv": ".csv",

    // Presentations (PowerPoint)
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",

    // Archives
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
};

const EXTENSION_MAP: Record<string, { ext: string; mime: string }> = {
    ".pdf": { ext: ".pdf", mime: "application/pdf" },
    ".docx": { ext: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ".doc": { ext: ".doc", mime: "application/msword" },
    ".xlsx": { ext: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    ".xls": { ext: ".xls", mime: "application/vnd.ms-excel" },
    ".pptx": { ext: ".pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
    ".ppt": { ext: ".ppt", mime: "application/vnd.ms-powerpoint" },
    ".csv": { ext: ".csv", mime: "text/csv" },
    ".txt": { ext: ".txt", mime: "text/plain" },
    ".jpg": { ext: ".jpg", mime: "image/jpeg" },
    ".jpeg": { ext: ".jpg", mime: "image/jpeg" },
    ".png": { ext: ".png", mime: "image/png" },
    ".webp": { ext: ".webp", mime: "image/webp" },
    ".gif": { ext: ".gif", mime: "image/gif" },
    ".svg": { ext: ".svg", mime: "image/svg+xml" },
    ".zip": { ext: ".zip", mime: "application/zip" },
};

const BUCKET = process.env.MINIO_BUCKET || "edubridge-documents";
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || "http://localhost:9000";
const PRESIGN_EXPIRES_IN = 5 * 60; // 5 minutes

// ─── S3 Client for Internal Docker Communication (Server-to-MinIO) ──────────
const internalS3 = new S3Client({
    endpoint: `http://${process.env.MINIO_ENDPOINT || "minio"}:${process.env.MINIO_PORT || 9000}`,
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || "edubridge_minio",
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || "",
    },
    forcePathStyle: true,
});

// ─── S3 Client for Presigned URLs (Browser-to-MinIO) ────────────────────────
// AWS Signature Version 4 includes the Host header in the signed signature.
// When the browser executes the PUT or GET directly against MinIO, it sends
// Host: localhost:9000 (PUBLIC_URL).
// Therefore, the presigner MUST calculate the signature using PUBLIC_URL so that
// MinIO's signature validation succeeds without "SignatureDoesNotMatch" errors.
const presignS3 = new S3Client({
    endpoint: PUBLIC_URL,
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || "edubridge_minio",
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || "",
    },
    forcePathStyle: true,
});

export class StorageService {
    /**
     * Ensures the bucket exists on startup.
     * Called once when the server boots.
     */
    static async ensureBucketExists(): Promise<void> {
        try {
            await internalS3.send(new HeadBucketCommand({ Bucket: BUCKET }));
            console.log(`[Storage] Bucket "${BUCKET}" is ready.`);
        } catch (err: any) {
            if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
                await internalS3.send(new CreateBucketCommand({ Bucket: BUCKET }));
                console.log(`[Storage] Bucket "${BUCKET}" created.`);
            } else {
                console.warn("[Storage] Could not verify bucket:", err?.message || err);
            }
        }
    }

    /**
     * Generate a presigned PUT URL for the client to upload a file directly.
     *
     * @param originalFileName - Original filename from client (used for extension detection)
     * @param contentType      - MIME type (e.g. "application/pdf", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
     * @param folder           - Logical folder inside the bucket (e.g. "students/documents", "programs/attachments")
     * @returns { presignedUrl, fileKey, publicUrl }
     */
    static async generatePresignedUploadUrl(
        originalFileName: string,
        contentType: string,
        folder: string = "uploads"
    ): Promise<{
        presignedUrl: string;
        fileKey: string;
        publicUrl: string;
    }> {
        // 1. Resolve extension and clean content type
        const cleanType = (contentType || "").toLowerCase().trim();
        const fileExt = originalFileName ? ("." + originalFileName.split(".").pop()?.toLowerCase()) : "";

        let extension = ALLOWED_MIME_TYPES[cleanType];
        let effectiveContentType = cleanType;

        if (!extension && fileExt && EXTENSION_MAP[fileExt]) {
            extension = EXTENSION_MAP[fileExt].ext;
            effectiveContentType = EXTENSION_MAP[fileExt].mime;
        }

        if (!extension) {
            throw new Error(
                `File type "${contentType || fileExt}" is not allowed. Accepted types: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt, .csv), Images (JPEG, PNG, WebP), ZIP.`
            );
        }

        // 2. Build a clean, unique key inside the bucket
        //    e.g.  students/documents/2026-09/a3f9b2c1-uuid.pdf
        const datePart = new Date().toISOString().slice(0, 7); // YYYY-MM
        const uniqueId = randomUUID();
        const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
        const fileKey = `${safeFolder}/${datePart}/${uniqueId}${extension}`;

        // 3. Create the PutObject command
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: fileKey,
            ContentType: effectiveContentType || contentType,
        });

        // 4. Sign using presignS3 so the Signature matches the browser's Host header
        const presignedUrl = await getSignedUrl(presignS3, command, {
            expiresIn: PRESIGN_EXPIRES_IN,
        });

        // 5. Build the permanent public URL for the file (after upload completes)
        const publicUrl = `${PUBLIC_URL}/${BUCKET}/${fileKey}`;

        return {
            presignedUrl,
            fileKey,
            publicUrl,
        };
    }

    /**
     * Generate a presigned GET URL to view a private file (if bucket is private).
     * Not needed if bucket is set to public download, but useful for sensitive docs.
     */
    static async generatePresignedDownloadUrl(fileKey: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: fileKey,
        });
        return getSignedUrl(presignS3, command, { expiresIn: PRESIGN_EXPIRES_IN });
    }
}
