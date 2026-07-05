import type { DefaultSession } from "next-auth";

// Extends next-auth's built-in types with our custom User columns
// (see prisma/schema.prisma) so `session.user.username` etc. are typed
// everywhere instead of requiring `as any` at every call site.
declare module "next-auth" {
  interface User {
    discordId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }

  interface Session {
    user: {
      id: string;
      discordId: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }
}
