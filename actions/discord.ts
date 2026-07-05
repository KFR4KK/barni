"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncDiscordMembership } from "@/lib/discord-sync";

// Same convention as actions/profile.ts: a thin Server Action wrapper,
// called from a plain <form action={...}> (see
// components/members/RefreshDiscordButton.tsx) — no client JS, no
// client-supplied membership data of any kind. The only input this
// action takes from the request is the signed-in session; everything it
// writes comes from lib/discord-sync.ts's own call to Discord's bot API.
export async function refreshDiscordMembershipAction() {
  const session = await auth();
  if (!session?.user) {
    return;
  }

  const result = await syncDiscordMembership(session.user.id);

  if (result.status === "synced" || result.status === "unavailable") {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { slug: true },
    });
    if (profile) {
      revalidatePath(`/members/${profile.slug}`);
    }
  }

  revalidatePath("/profile");
}
