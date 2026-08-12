import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./modules/authentication/auth.js";

const app = express();
const PORT = 5000;

// Better Auth
app.all("/api/auth/*splat", toNodeHandler(auth));

// Other API routes
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "EduBridge backend is running",
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});