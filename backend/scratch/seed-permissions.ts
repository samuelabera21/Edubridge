import { assignPermissionToRole } from "../src/modules/authentication/authorization.service.js";

async function main() {
  console.log("Seeding SCHOOL:VIEW permission to SCHOOL_ADMIN...");
  await assignPermissionToRole(
    "SCHOOL_ADMIN",
    "SCHOOL:VIEW",
    "View school profile and data"
  );
  
  console.log("Seeding SCHOOL:UPDATE permission to SCHOOL_ADMIN...");
  const result2 = await assignPermissionToRole(
    "SCHOOL_ADMIN",
    "SCHOOL:UPDATE",
    "Update school profile and data"
  );
  console.log("Seeded successfully:", JSON.stringify(result2, null, 2));
}

main().catch(console.error);
