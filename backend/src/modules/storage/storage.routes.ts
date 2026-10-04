import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "./storage.controller.js";

const router = Router();

router.use(requireAuth());

router.post(
    "/presign",
    getPresignedUploadUrl
);

router.get(
    "/download-url",
    getPresignedDownloadUrl
);

export default router;
