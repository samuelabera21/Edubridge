import { Router } from "express";
import { 
    createActivity, 
    getActivities,
    submitActivity,
    raiseSupportFlag,
    getSupportFlags,
    resolveSupportFlag,
    deleteSupportFlag
} from "./learning.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

router.use(requireScope("SCHOOL"));

// Learning Activities & Submissions
router.post("/activity", requirePermission("ACADEMIC:CREATE"), createActivity);
router.get("/activity", requirePermission("ACADEMIC:VIEW"), getActivities);
router.post("/submission", requirePermission("ACADEMIC:CREATE"), submitActivity);

// Student Support Flags & Interventions
router.post("/support", requirePermission("ACADEMIC:CREATE"), raiseSupportFlag);
router.get("/support", requirePermission("ACADEMIC:VIEW"), getSupportFlags);
router.patch("/support/:id/resolve", requirePermission("ACADEMIC:UPDATE"), resolveSupportFlag);
router.delete("/support/:id", requirePermission("ACADEMIC:DELETE"), deleteSupportFlag);

export default router;
