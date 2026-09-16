import { Router } from "express";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "./storage.controller.js";

const router = Router();

/**
 * @openapi
 * /api/storage/presign:
 *   post:
 *     tags: [Storage]
 *     summary: Request a presigned URL to upload a document directly to MinIO
 *     description: |
 *       Returns a short-lived (5 min) signed URL the client uses to PUT a file
 *       directly to MinIO object storage — the file never passes through the backend.
 *       After upload, store the returned publicUrl as the document's fileUrl.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, contentType]
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "birth-certificate.pdf"
 *               contentType:
 *                 type: string
 *                 example: "application/pdf"
 *               folder:
 *                 type: string
 *                 example: "students/documents"
 *     responses:
 *       200:
 *         description: Presigned URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 presignedUrl:
 *                   type: string
 *                   description: Short-lived PUT URL to upload file directly to MinIO
 *                 fileKey:
 *                   type: string
 *                   description: Unique key inside the bucket (for reference)
 *                 publicUrl:
 *                   type: string
 *                   description: Permanent public URL to access the file after upload
 *       400:
 *         description: Invalid file type or missing params
 */
router.post(
    "/presign",
    requireScope("SCHOOL"),
    requirePermission("ACADEMIC:CREATE"),
    getPresignedUploadUrl
);

/**
 * @openapi
 * /api/storage/download-url:
 *   get:
 *     tags: [Storage]
 *     summary: Get a presigned GET URL for a private file
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: "students/documents/2024-09/uuid.pdf"
 */
router.get(
    "/download-url",
    requireScope("SCHOOL"),
    requirePermission("ACADEMIC:VIEW"),
    getPresignedDownloadUrl
);

export default router;
