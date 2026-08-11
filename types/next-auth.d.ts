import type { DefaultSession } from "next-auth";

// Extends next-auth's built-in types with our custom User columns
// (see prisma/schema.prisma) so `session.user.username` etc. are typed
// everywhere instead of requiring `as any` at every call site.
//
// Account Linking — `discordId` and `username` are now `string | null`:
// a session's user may have signed up through Google/Telegram/Email
// (no discordId) and may not have chosen a username yet (see
// app/welcome/page.tsx's onboarding gate, which is the thing that
// guarantees every OTHER page in the app only ever sees a non-null
// username).
declare module "next-auth" {
  interface User {
    discordId: string | null;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }

  interface Session {
    user: {
      id: string;
      discordId: string | null;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }
}
