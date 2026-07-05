"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { socialOrder } from "@/lib/social-icons";
import type { Socials } from "@/data/types";

// Thin Server Action wrappers around Profile writes, same convention as
// actions/auth.ts — components (ClaimProfileButton, the /profile/edit
// form) call these directly as form actions rather than talking to
// Prisma themselves.

// Bound to a specific slug via `.bind(null, slug)` at the call site
// (see components/members/ClaimProfileButton.tsx) — this is the
// documented Next.js pattern for passing an extra argument to a Server
// Action invoked from a plain <form action={...}>.
export async function claimProfileAction(slug: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/members/${slug}`);
  }

  // One User can own only one Profile: check this *before* attempting the
  // claim so a user who already owns a different profile gets a clear
  // reason instead of a raw unique-constraint failure. The real guarantee
  // is still the DB constraint below — this is just the friendlier path.
  const existingOwned = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });
  if (existingOwned && existingOwned.slug !== slug) {
    redirect(`/members/${slug}?claimError=already-owns`);
  }

  // Atomic check-and-set: `userId: null` in the WHERE clause means this
  // only ever updates a row that's still unclaimed at the moment the
  // write executes. If two people click "Claim" on the same profile at
  // the same time, at most one `updateMany` call can match — there's no
  // read-then-write gap between checking and setting for a second claim
  // to slip through. Profile.userId's unique constraint is the backstop
  // underneath even this.
  const result = await prisma.profile.updateMany({
    where: { slug, userId: null },
    data: { userId: session.user.id, claimedAt: new Date() },
  });

  revalidatePath(`/members/${slug}`);
  revalidatePath("/profile");

  if (result.count === 0) {
    redirect(`/members/${slug}?claimError=taken`);
  }

  redirect(`/members/${slug}`);
}

// Plain <form action={updateProfileAction}> on /profile/edit — every
// field is optional-ish text input, matched up by `name` below.
export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const owned = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });
  if (!owned) {
    // Nothing to edit — you can't edit a profile you haven't claimed.
    redirect("/profile");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    redirect("/profile/edit?error=empty-name");
  }

  const realName = String(formData.get("realName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const avatar = String(formData.get("avatar") ?? "").trim();
  const banner = String(formData.get("banner") ?? "").trim();

  const socials: Socials = {};
  for (const platform of socialOrder) {
    const value = String(formData.get(`social_${platform}`) ?? "").trim();
    if (value) socials[platform] = value;
  }

  await prisma.profile.update({
    where: { userId: session.user.id },
    data: {
      displayName,
      realName: realName || null,
      bio,
      city: city || null,
      country: country || null,
      avatar: avatar || null,
      banner: banner || null,
      socials,
    },
  });

  revalidatePath(`/members/${owned.slug}`);
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");

  redirect(`/members/${owned.slug}`);
}
