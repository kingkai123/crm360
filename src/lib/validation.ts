import { z } from "zod";

/** Strips spaces, dashes, brackets and dots so numbers can be checked consistently. */
export const normalizePhone = (value: string) => value.replace(/[\s\-().]/g, "").trim();

/** Accepts an optional leading + and 10 to 15 digits (no leading zero after the country code). */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((v) => /^\+?[1-9]\d{9,14}$/.test(v), {
    message: "Enter a valid phone number (10–15 digits, optional country code)",
  });

/** Same rule, but an empty value is allowed. */
export const optionalPhoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((v) => v === "" || /^\+?[1-9]\d{9,14}$/.test(v), {
    message: "Enter a valid phone number (10–15 digits, optional country code)",
  });

/** Returns an error message when the phone number is invalid, otherwise null. */
export function checkPhone(value: string, { required = false } = {}): string | null {
  const schema = required ? phoneSchema : optionalPhoneSchema;
  const result = schema.safeParse(value ?? "");
  return result.success ? null : (result.error.issues[0]?.message ?? "Invalid phone number");
}

export const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");
