import { Request, Response } from "express";
import { StorageService } from "./storage.service.js";

/**
 * POST /api/storage/presign
 *
 * Body:
 *   { fileName: string, contentType: string, folder?: string }
 *
 * Returns:
 *   { presignedUrl, fileKey, publicUrl }
 *
 * The client uses presignedUrl to PUT the file directly to MinIO,
 * then stores publicUrl in the form and submits it as part of the document payload.
 */
export const getPresignedUploadUrl = async (req: Request, res: Response) => {
    try {
        const { fileName, contentType, folder } = req.body;

        if (!fileName || typeof fileName !== "string") {
            return res.status(400).json({ error: "fileName is required and must be a string." });
        }
        if (!contentType || typeof contentType !== "string") {
            return res.status(400).json({ error: "contentType is required (e.g. 'application/pdf', 'image/jpeg')." });
        }

        const result = await StorageService.generatePresignedUploadUrl(
            fileName.trim(),
            contentType.trim(),
            folder || "students/documents"
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("[Storage] Presign error:", error);
        if (error.message?.includes("not allowed")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to generate upload URL. Please try again." });
    }
};

/**
 * GET /api/storage/download-url?key=students/documents/...
 *
 * Returns a short-lived presigned GET URL for viewing a private file.
 * (Only needed if bucket is private — otherwise publicUrl works directly)
 */
export const getPresignedDownloadUrl = async (req: Request, res: Response) => {
    try {
        const { key } = req.query;
        if (!key || typeof key !== "string") {
            return res.status(400).json({ error: "key query param is required." });
        }

        const url = await StorageService.generatePresignedDownloadUrl(key);
        return res.status(200).json({ url });
    } catch (error: any) {
        console.error("[Storage] Download presign error:", error);
        return res.status(500).json({ error: "Failed to generate download URL." });
    }
};
