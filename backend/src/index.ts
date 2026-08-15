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
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001", "http://localhost:5001"],
    credentials: true,
}));

// Better Auth - Custom middleware to preserve full URL and avoid path-to-regexp crashes
app.use((req, res, next) => {
    if (req.path.startsWith("/api/auth/") || req.path === "/api/auth") {
        return toNodeHandler(auth)(req, res);
    }
    next();
});
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});