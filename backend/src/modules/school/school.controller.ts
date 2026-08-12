import { Request, Response } from "express";
import { getSchoolProfile, updateSchoolProfile } from "./school.service.js";

export async function getProfileHandler(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ message: "Invalid or missing school scope" });
        }

        const profile = await getSchoolProfile(accessScope.id);
        
        return res.json({
            school: accessScope,
            profile: profile || null,
        });
    } catch (error) {
        console.error("Error getting school profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function updateProfileHandler(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ message: "Invalid or missing school scope" });
        }

        const data = req.body;
        const profile = await updateSchoolProfile(accessScope.id, {
            establishedYear: data.establishedYear,
            contactEmail: data.contactEmail,
            phoneNumber: data.phoneNumber,
            address: data.address,
        });

        return res.json({
            message: "Profile updated successfully",
            profile,
        });
    } catch (error) {
        console.error("Error updating school profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
