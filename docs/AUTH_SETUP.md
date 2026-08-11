# Discord Authentication — Setup Guide

This guide assumes you've never configured Discord OAuth before. Follow it
in order; each step depends on the one before it.

---

## 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, give it a name (e.g. "Barni — The Collective"), accept the terms, and click **Create**.
3. On the **General Information** page, you'll see your **Application ID** — you won't need this directly (Auth.js uses the OAuth2 Client ID instead, next step), but it's good to know it's there.
4. In the left sidebar, click **OAuth2**.
5. Under **Client information**, copy the **Client ID** and click **Reset Secret** (or **Copy** if a secret already shows) to get the **Client Secret**. Keep this tab open — you'll paste both into `.env.local` in Step 4.

Treat the Client Secret exactly like a password. If it's ever exposed (committed to git, pasted in a chat, etc.), reset it immediately from this same page.

---

## 2. Which OAuth Scopes Are Required

This project requests exactly one scope: **`identify`**.

That's enough to get the user's Discord ID, username, global display name, and avatar hash — everything the current `User` model stores. We deliberately do **not** request the `email` scope, since nothing in the app uses an email address; requesting scopes you don't use is an unnecessary trust ask of every person who signs in.

You don't need to manually configure scopes anywhere in the Discord portal — they're requested by the app itself (see `lib/auth.ts`, `authorization.params.scope`). This section exists so you know why only that one scope shows up on the Discord consent screen when you test the login flow.

---

## 3. Which Redirect URI to Configure

Still on the **OAuth2** page in the Discord Developer Portal, scroll to **Redirects** and click **Add Redirect**. Add **both** of the following (you can register multiple redirect URIs on the same application — you don't need separate Discord apps for dev and prod):

```
http://localhost:3000/api/auth/callback/discord
```
```
https://yourdomain.com/api/auth/callback/discord
```

Replace `yourdomain.com` with your real production domain once you have one. Use `https://`, not `http://`, for production. Click **Save Changes** at the bottom of the page.

This path is fixed by Auth.js convention: `/api/auth/callback/{provider-id}`, where the route handler lives at `app/api/auth/[...nextauth]/route.ts` and the provider is registered as `discord` in `lib/auth.ts`. If you ever rename the provider, this URL changes with it.

> **Note on preview deployments:** if you deploy on Vercel, every PR gets a random `*.vercel.app` URL that won't match a fixed redirect URI, and Discord doesn't support wildcard redirect URIs. Sign-in will only work on `localhost` and whichever domain(s) you've explicitly registered above — preview deploys can still be tested unauthenticated.

---

## 4. Which Environment Variables Are Needed

Copy the template and fill it in:

```bash
cp .env.local.example .env.local
```

| Variable | What it is | Where it comes from |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Your database provider (local Postgres, Neon, Supabase, etc.) |
| `AUTH_SECRET` | Key used to sign/encrypt session cookies | Generate with `npx auth secret`, or `openssl rand -base64 33` |
| `AUTH_URL` | The app's public URL | Only needed in production — e.g. `https://yourdomain.com` |
| `AUTH_DISCORD_ID` | OAuth2 Client ID | Discord Developer Portal → your app → OAuth2 (Step 1) |
| `AUTH_DISCORD_SECRET` | OAuth2 Client Secret | Same page as above |

`AUTH_SECRET` must be set in **every** environment, and should be a **different** value in production than in local development — never reuse a dev secret in prod.

---

## 5. Where to Place Them

- **Local development:** `.env.local` in the project root (already gitignored — verify with `git check-ignore .env.local`, it should print the filename back).
- **Production (Vercel):** Project Settings → Environment Variables in the Vercel dashboard. Add each variable there; do **not** put real secrets in `.env.local.example`, in `next.config.mjs`, or anywhere that gets committed.
- **Never** hardcode any of these values directly in source files. Every place that needs them reads from `process.env` (see `lib/auth.ts`).

---

## 6. How to Run the Project Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up your database connection
cp .env.local.example .env.local
# → fill in DATABASE_URL, AUTH_SECRET, AUTH_DISCORD_ID, AUTH_DISCORD_SECRET

# 3. Create the database tables from the Prisma schema
npx prisma migrate dev --name init_auth

# 4. Start the dev server
npm run dev
```

Visit `http://localhost:3000`, click **"Увійти через Discord"** in the nav, and you should be sent through Discord's consent screen and back, now signed in with the avatar/username menu showing in the nav.

To inspect the database directly at any point:

```bash
npx prisma studio
```

---

## 7. How to Deploy Authentication Later

1. Provision a production Postgres database (Neon, Supabase, or any managed Postgres) and set its connection string as `DATABASE_URL` in Vercel's environment variables.
2. Run the migration against production before or during your first deploy:
   ```bash
   npx prisma migrate deploy
   ```
   (`migrate deploy` — not `migrate dev` — for production; it applies existing migrations without prompting or generating new ones.)
3. Set `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, and `AUTH_URL` (your real production URL) in Vercel's environment variables.
4. Confirm your production redirect URI (`https://yourdomain.com/api/auth/callback/discord`) is registered in the Discord Developer Portal (Step 3) — this is the single most common cause of a working local login and a broken production one.
5. Deploy. Test the full login → callback → session flow on the live domain before considering this phase done.

---

## What This Phase Does *Not* Include

By design, none of the following exist yet — they're later phases in the roadmap:

- Editing any profile field
- The community wall / comments
- The admin panel
- Notifications, activity feed, reputation, achievements
- Linking a signed-in Discord account to one of the existing hand-authored member profiles ("claiming") — the `/profile` page you'll see after logging in is a deliberate placeholder for that

If you're picking this project up fresh: sign-in, sign-out, and a persistent database-backed session are the only things to verify work correctly before moving to the next phase.
