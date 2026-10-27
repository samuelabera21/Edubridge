import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./infrastructure/middleware/error.middleware.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./modules/authentication/auth.js";
import authorizationRoutes from "./modules/authentication/authorization.routes.js";
import schoolRoutes from "./modules/school/school.routes.js";
import academicRoutes from "./modules/academic/academic.routes.js";
import timetableRoutes from "./modules/timetable/timetable.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import assessmentRoutes from "./modules/assessment/assessment.routes.js";
import learningRoutes from "./modules/learning/learning.routes.js";
import communicationRoutes from "./modules/communication/communication.routes.js";
import operationalRoutes from "./modules/operational/operational.routes.js";
import studentRoutes from "./modules/student/student.routes.js";
import teacherRoutes from "./modules/teacher/teacher.routes.js";
import parentRoutes from "./modules/parent/parent.routes.js";
import vicePrincipalRoutes from "./modules/vice-principal/vice-principal.routes.js";
import supportStaffRoutes from "./modules/support-staff/support-staff.routes.js";
import committeeRoutes from "./modules/committee/committee.routes.js";
import supportRoutes from "./modules/support/support.routes.js";
import improvementRoutes from "./modules/improvement/improvement.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import aiLeadershipRoutes from "./modules/ai-leadership/ai-leadership.routes.js";
import schoolSettingsRoutes from "./modules/school-settings/school-settings.routes.js";
import hierarchyRoutes from "./modules/hierarchy/hierarchy.routes.js";
import governanceRoutes from "./modules/governance/governance.routes.js";
import directiveRoutes from "./modules/directive/directive.routes.js";
import programRoutes from "./modules/program/program.routes.js";
import hierarchicalReportRoutes from "./modules/hierarchical-reporting/hierarchical-report.routes.js";
import dataRequestRoutes from "./modules/data-request/data-request.routes.js";
import { GoogleFormsSyncPoller } from "./modules/data-request/google-forms-sync.poller.js";
import storageRoutes from "./modules/storage/storage.routes.js";
import { StorageService } from "./modules/storage/storage.service.js";
import gradeSubmissionRoutes from "./modules/grade-submission/grade-submission.routes.js";
import aiAnalyticsRoutes from "./modules/ai-analytics/ai-analytics.routes.js";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import { initSocketServer } from "./infrastructure/socket/socket.service.js";

const app = express();
const httpServer = createServer(app);
const PORT = 5000;

// Initialize WebSocket / Socket.IO gateway
initSocketServer(httpServer);

// Middleware
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3001",
    "http://localhost:5001",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/+$/, "")] : []),
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Allow during transition or restrict as needed
    },
    credentials: true,
}));

// Better Auth - Custom middleware to preserve full URL and avoid path-to-regexp crashes
app.use((req, res, next) => {
    if ((req.path === "/api/auth/sign-in/social" || req.path === "/api/auth/sign-in/social/") && req.method === "POST") {
        const id = process.env.GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, "").trim();
        const secret = process.env.GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, "").trim();
        const hasGoogleCreds = Boolean(
            id &&
            secret &&
            id !== "your-client-id.apps.googleusercontent.com" &&
            secret !== "your-client-secret"
        );
        if (!hasGoogleCreds) {
            return res.status(400).json({
                message: "Google Sign-In is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.",
            });
        }
    }
    if (req.path.startsWith("/api/auth/") || req.path === "/api/auth") {
        return toNodeHandler(auth)(req, res);
    }
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Swagger Docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api/authorization", authorizationRoutes);
app.use("/api/school", schoolRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/operational", operationalRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/vice-principal", vicePrincipalRoutes);
app.use("/api/support-staff", supportStaffRoutes);
app.use("/api/committee", committeeRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/improvement", improvementRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/ai-leadership", aiLeadershipRoutes);
app.use("/api/school-settings", schoolSettingsRoutes);
app.use("/api/hierarchy", hierarchyRoutes);
app.use("/api/governance", governanceRoutes);
app.use("/api/directives", directiveRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/hierarchical-reports", hierarchicalReportRoutes);
app.use("/api/data-requests", dataRequestRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/grade-submissions", gradeSubmissionRoutes);
app.use("/api/ai-analytics", aiAnalyticsRoutes);

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "EduBridge backend is running",
    });
});

// Catch 404s
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Verify MinIO bucket exists on startup (non-blocking)
    StorageService.ensureBucketExists().catch(err =>
        console.warn("[Storage] Bucket check failed:", err?.message)
    );
    // Start automated background synchronization for active Google Forms
    GoogleFormsSyncPoller.startPolling(30000);
});