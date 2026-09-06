import { Router } from "express";
import { 
    getProblems, createProblem,
    getPlans, createPlan,
    getActivities, createActivity,
    getTargets, createTarget,
    getOutcomes, createOutcome
} from "./improvement.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();
router.use(requireScope("SCHOOL"));

// 1. Problems
router.get("/problems", requirePermission("ACADEMIC:VIEW"), getProblems);
router.post("/problems", requirePermission("ACADEMIC:CREATE"), createProblem);

// 2. Priorities (uses problem endpoints with filter/severity)
router.get("/priorities", requirePermission("ACADEMIC:VIEW"), getProblems);

// 3. Plans (SIP)
router.get("/plans", requirePermission("ACADEMIC:VIEW"), getPlans);
router.post("/plans", requirePermission("ACADEMIC:CREATE"), createPlan);

// 4. Activities
router.get("/activities", requirePermission("ACADEMIC:VIEW"), getActivities);
router.post("/activities", requirePermission("ACADEMIC:CREATE"), createActivity);

// 5. Targets / KPIs
router.get("/targets", requirePermission("ACADEMIC:VIEW"), getTargets);
router.post("/targets", requirePermission("ACADEMIC:CREATE"), createTarget);

// 6. Progress Monitoring (uses plans & activities)
router.get("/monitoring", requirePermission("ACADEMIC:VIEW"), getPlans);

// 7. Outcomes
router.get("/outcomes", requirePermission("ACADEMIC:VIEW"), getOutcomes);
router.post("/outcomes", requirePermission("ACADEMIC:CREATE"), createOutcome);

export default router;
