import { Request, Response } from "express";
import { getSchoolProfile } from "../school/school.service.js";

// Get the currently logged in Vice Principal's overview profile
export async function getVicePrincipalProfile(req: Request, res: Response) {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const profile = await getSchoolProfile(accessScope.id);
        
        return res.json({
            school: accessScope,
            profile: profile || null,
            role: "VICE_PRINCIPAL",
            // In a real app we'd fetch specific academic overview data here
        });
    } catch (error) {
        console.error("Error fetching VP profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
