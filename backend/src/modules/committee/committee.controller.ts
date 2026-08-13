import { Request, Response } from "express";
import { getSchoolProfile } from "../school/school.service.js";

// Get the currently logged in Committee Member's overview profile
export async function getCommitteeProfile(req: Request, res: Response) {
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
            role: "COMMITTEE",
            // In a real app we'd fetch specific committee meeting notes or reports here
        });
    } catch (error) {
        console.error("Error fetching Committee profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
