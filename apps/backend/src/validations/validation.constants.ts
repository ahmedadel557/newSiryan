import { z } from 'zod';

/* ── Shared limits ──────────────────────────────────────────── */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 50;

/**
 * Name content regex:
 *  - Allows Latin letters, accented Latin (À-ÿ), Arabic (٠-ۿ), spaces, hyphens, apostrophes.
 *  - First character must be a letter (Latin, accented, or Arabic).
 *  - Rejects numeric-only, special-char-only, and whitespace-only values
 *    because the first-char anchor requires a letter.
 */
export const NAME_PATTERN = /^[a-zA-Z\u00C0-\u00FF\u0600-\u06FF][\w\s'\-\u00C0-\u00FF\u0600-\u06FF]*$/;
export const NAME_PATTERN_MSG = 'Must start with a letter and contain only letters, spaces, hyphens, or apostrophes';

/**
 * Stricter email regex that requires a TLD of at least 2 chars.
 * Zod's built-in `.email()` accepts `user@host` without a TLD.
 */
export const STRICT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ── Reusable Zod builders ──────────────────────────────────── */

/** Validated person-name field (required). */
export const zodName = (label: string) =>
  z.string()
    .trim()
    .min(1, `${label} is required`)
    .max(MAX_NAME_LENGTH, `${label} must be at most ${MAX_NAME_LENGTH} characters`)
    .regex(NAME_PATTERN, `${label}: ${NAME_PATTERN_MSG}`);

/** Validated email field (required). */
export const zodEmail = () =>
  z.string()
    .trim()
    .max(MAX_EMAIL_LENGTH, `Email must be at most ${MAX_EMAIL_LENGTH} characters`)
    .email('Enter a valid email address')
    .refine((v) => STRICT_EMAIL_RE.test(v), 'Enter a valid email address (e.g. user@example.com)');

/** Validated login password field (min 1, max 128). */
export const zodLoginPassword = () =>
  z.string()
    .min(1, 'Password is required')
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);

/** Validated registration / change-password field (min 8, max 128, uppercase + digit). */
export const zodStrongPassword = (label = 'Password') =>
  z.string()
    .min(MIN_PASSWORD_LENGTH, `${label} must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, `${label} must be at most ${MAX_PASSWORD_LENGTH} characters`)
    .regex(/[A-Z]/, `${label} must contain an uppercase letter`)
    .regex(/[0-9]/, `${label} must contain a number`);
