import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/prisma/client.js", () => ({
  prisma: {
    verification: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organizationUnit: {
      findUnique: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn(async (value: string) => `hashed:${value}`),
}));

const { prisma } = await import("../../infrastructure/prisma/client.js");
const router = (await import("./authorization.routes.js")).default;

const app = express();
app.use(express.json());
app.use("/api/authorization", router);

describe("authorization invitation routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("validates a valid invitation token", async () => {
    vi.mocked(prisma.verification.findFirst).mockResolvedValue({
      id: "ver_1",
      identifier: "invitation:usr_1:org_1",
      value: "inv_valid",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "usr_1",
      name: "Jane Admin",
      email: "jane@example.com",
      emailVerified: false,
      isActive: true,
      requiresPasswordChange: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    } as any);

    vi.mocked(prisma.organizationUnit.findUnique).mockResolvedValue({
      id: "org_1",
      name: "Addis Ababa Region",
      type: "REGION",
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .get("/api/authorization/validate-invitation")
      .query({ token: "inv_valid" });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.email).toBe("jane@example.com");
    expect(res.body.organizationName).toBe("Addis Ababa Region");
  });

  it("activates a valid invitation and sets the password", async () => {
    vi.mocked(prisma.verification.findFirst).mockResolvedValue({
      id: "ver_1",
      identifier: "invitation:usr_2:org_2",
      value: "inv_activate",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "usr_2",
      name: "John Admin",
      email: "john@example.com",
      emailVerified: false,
      isActive: true,
      requiresPasswordChange: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    } as any);

    vi.mocked(prisma.organizationUnit.findUnique).mockResolvedValue({
      id: "org_2",
      name: "Oromia Region",
      type: "REGION",
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(prisma.account.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.account.create).mockResolvedValue({
      id: "acc_1",
      userId: "usr_2",
      accountId: "usr_2",
      providerId: "credential",
      password: "hashed:StrongPass!123",
      createdAt: new Date(),
      updatedAt: new Date(),
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "usr_2",
      name: "John Admin",
      email: "john@example.com",
      emailVerified: true,
      isActive: true,
      requiresPasswordChange: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    } as any);
    vi.mocked(prisma.verification.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 } as any);

    const res = await request(app)
      .post("/api/authorization/activate-invitation")
      .send({
        token: "inv_activate",
        password: "StrongPass!123",
        confirmPassword: "StrongPass!123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe("john@example.com");
    expect(prisma.account.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailVerified: true, requiresPasswordChange: false }),
      })
    );
  });
});
