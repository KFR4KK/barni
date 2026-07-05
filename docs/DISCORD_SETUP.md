# Discord Bot Integration — Setup Guide

This guide covers **Phase 4**'s Discord Bot: the credential used server-side to
check whether a signed-in member is actually in the Discord server, and to sync
that into their `Profile` (`serverMember`, `serverJoinedAt`, `discordRoles`).

This is a **separate credential from Discord OAuth login** (`AUTH_DISCORD_ID` /
`AUTH_DISCORD_SECRET`, see `docs/AUTH_SETUP.md`). OAuth login only ever proves
"this is who they say they are on Discord." The bot token is what lets the server
ask Discord's API "is that person actually in *our* guild, and with which roles?"
— something the user's own OAuth token is never scoped to answer. You need both;
neither replaces the other.

---

## 1. Add a Bot to Your Existing Discord Application

You do **not** need a second Discord application. Use the same one from
`docs/AUTH_SETUP.md`:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   and open that application.
2. In the left sidebar, click **Bot**.
3. Click **Reset Token** (or **Copy** if a token already shows) to get the bot
   token. Treat it exactly like the OAuth Client Secret — never commit it, never
   paste it anywhere public, reset it immediately if it's ever exposed.
4. Under **Privileged Gateway Intents**, enable **Server Members Intent**. This
   project's membership check is a plain REST lookup (`GET
   /guilds/{guild.id}/members/{user.id}`), which works without this intent — but
   enable it anyway, since without it Discord omits role data for members the
   bot hasn't otherwise seen, which would make `discordRoles` unreliable.

## 2. Invite the Bot to Your Server

The bot has to actually be a member of the guild before it can look anyone else
up in it.

1. Still in the Developer Portal, go to **OAuth2 → URL Generator**.
2. Under **Scopes**, check **`bot`**.
3. Under **Bot Permissions**, check **View Server Insights** (or simply
   **View Channels** — the membership-lookup endpoint this project uses only
   needs the bot to be *in* the guild, not to have elevated permissions; keep
   this minimal rather than granting Administrator).
4. Copy the generated URL, open it in a browser, and select your server.

## 3. Find Your Guild (Server) ID

1. In Discord, open **User Settings → Advanced** and enable **Developer Mode**.
2. Right-click your server's icon in the sidebar and click **Copy Server ID**.
   This is `DISCORD_GUILD_ID`.

## 4. Create a Permanent Invite Link

`DISCORD_INVITE` is what the "Приєднатися до Discord" button links to for
members who aren't in the server yet. Create one invite that won't expire:

1. Right-click any channel in your server → **Invite People** → **Edit invite
   link**.
2. Set **Expire After** to **Never** and **Max Number of Uses** to **No limit**.
3. Copy the resulting `https://discord.gg/...` URL.

## 5. Environment Variables

Add these three to `.env.local` (see `.env.local.example`):

| Variable | What it is | Where it comes from |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Bot's API credential | Developer Portal → your app → Bot → Reset Token (Step 1) |
| `DISCORD_GUILD_ID` | Your server's ID | Right-click server icon → Copy Server ID (Step 3) |
| `DISCORD_INVITE` | Permanent invite URL | Step 4 above |

## 6. Run the Migration

This phase adds `serverMember`, `serverJoinedAt`, `discordRoles`, and
`discordSyncedAt` to the `Profile` model (`prisma/migrations/
20260706120000_add_discord_membership/`):

```bash
npx prisma migrate dev
```

(`migrate deploy` instead of `migrate dev` in production, same as every other
migration in this project.)

## 7. Verify It Works

1. `npm run dev`, sign in with Discord.
2. If your account already owns a claimed Profile (see `docs/AUTH_SETUP.md` /
   Phase 3's claiming flow), visit `/profile` — the Discord membership badge
   should show immediately (sync runs on login and on every `/profile` load).
3. Click **"Оновити статус Discord"** on `/profile` to trigger a sync manually
   without reloading the page.
4. Visit that member's public page (`/members/[slug]`) and confirm the same
   badge appears there.
5. To test the "not a member" state: leave the test server with a throwaway
   Discord account, sign in as that account, claim a profile, and confirm the
   gray badge + "Приєднатися до Discord" button (linking to `DISCORD_INVITE`)
   show instead.

## Troubleshooting

- **Every sync silently keeps showing the old state** — check your server logs
  for `[discord-sync] Discord API unavailable`. This is by design: a Discord
  outage or a bad/expired bot token never resets a member to "not a member,"
  it just leaves the last successfully-synced value in place (see
  `lib/discord-sync.ts`). Fix the bot token/guild ID and the next sync (next
  login, next `/profile` load, or the manual refresh button) will correct it.
- **A real member shows the gray "not joined" badge** — confirm
  `DISCORD_GUILD_ID` is the server you actually invited the bot to (Step 2/3),
  and that the member's Discord account is in that exact server.
- **`discordRoles` looks empty for someone with roles** — confirm **Server
  Members Intent** is enabled (Step 1.4). Note this project doesn't render
  roles anywhere yet by design — this is only relevant if you're inspecting
  the column directly (e.g. via `npx prisma studio`) ahead of a future phase.

## What This Phase Does *Not* Include

By design, none of the following exist yet:

- Any UI built on top of `discordRoles` (it's stored and synced, not displayed
  or used for permissions/gating)
- Comments, moderation, or the roles/permissions system referenced elsewhere in
  the roadmap
- Any change to how sign-in itself works, or to the OAuth scopes requested —
  see `docs/AUTH_SETUP.md`, which is still the only source of truth for that
