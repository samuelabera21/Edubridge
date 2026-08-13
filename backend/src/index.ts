import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./modules/authentication/auth.js";
import authorizationRoutes from "./modules/authentication/authorization.routes.js";
import schoolRoutes from "./modules/school/school.routes.js";

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
}));

// Better Auth
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.use("/api/authorization", authorizationRoutes);
app.use("/api/school", schoolRoutes);

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "EduBridge backend is running",
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});