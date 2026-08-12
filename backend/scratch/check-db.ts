import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
  const users = await prisma.user.findMany({ include: { roleAssignments: true } });
  console.log("Users:", JSON.stringify(users, null, 2));

  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
  console.log("Roles:", JSON.stringify(roles, null, 2));
  
  const assignments = await prisma.roleAssignment.findMany({ include: { role: true, scope: true } });
  console.log("Assignments:", JSON.stringify(assignments, null, 2));

  const rolePermissions = await prisma.rolePermission.findMany({ include: { role: true, permission: true } });
  console.log("RolePermissions:", JSON.stringify(rolePermissions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
