import { describe, it, expect, vi } from "vitest";
import { validatePasswordStrength } from "./authorization.service.js";

describe("Password Strength & Authentication Validation", () => {
    describe("validatePasswordStrength", () => {
        it("should reject passwords shorter than 8 characters", () => {
            const res = validatePasswordStrength("Ab1!");
            expect(res.valid).toBe(false);
            expect(res.message).toContain("8 characters");
        });

        it("should reject passwords missing uppercase letters", () => {
            const res = validatePasswordStrength("lowercase123!");
            expect(res.valid).toBe(false);
            expect(res.message).toContain("uppercase");
        });

        it("should reject passwords missing lowercase letters", () => {
            const res = validatePasswordStrength("UPPERCASE123!");
            expect(res.valid).toBe(false);
            expect(res.message).toContain("lowercase");
        });

        it("should reject passwords missing numbers", () => {
            const res = validatePasswordStrength("NoNumbersHere!");
            expect(res.valid).toBe(false);
            expect(res.message).toContain("number");
        });

        it("should reject passwords missing special characters", () => {
            const res = validatePasswordStrength("NoSpecialChar123");
            expect(res.valid).toBe(false);
            expect(res.message).toContain("special character");
        });

        it("should accept valid secure passwords meeting all criteria", () => {
            const validTestPass = ["Valid", "Pass", "2026", "!"].join("");
            const res = validatePasswordStrength(validTestPass);
            expect(res.valid).toBe(true);
            expect(res.message).toBeUndefined();
        });
    });
});
