-- Phase 9.5 — Profile Auto-Provisioning & Welcome Page
--
-- One additive column. Backs the one-time /welcome page (see
-- app/welcome/page.tsx): false for every existing row (including
-- everyone who already signed in before this phase), so every current
-- user sees the Welcome page exactly once on their next sign-in, then
-- never again.
ALTER TABLE "User" ADD COLUMN "hasSeenWelcome" BOOLEAN NOT NULL DEFAULT false;
