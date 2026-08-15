import { User } from "../../generated/prisma/client.js";

declare global {
    namespace Express {
        interface Request {
            user?: User;
            accessScope?: {
                type: string;
                id: string;
            };
        }
    }
}
