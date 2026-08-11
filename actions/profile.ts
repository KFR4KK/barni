"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MediaType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { socialOrder } from "@/lib/social-icons";
import {
  IMAGE_FOLDERS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_AUDIO_BYTES,
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
  isAllowedAudioMimeType,
  uploadImage,
  uploadVideo,
  uploadAudio,
  type ImageFolder,
} from "@/lib/storage";
import { PROFILE_WIDGETS } from "@/lib/profile-widgets";
import type { Socials } from "@/data/types";

// Thin Server Action wrapper around Profile writes, same convention as
// actions/auth.ts.
//
// Phase 9.5 — Profile Auto-Provisioning. The other action this file used
// to export, claimProfileAction, is gone along with
// components/members/ClaimProfileButton.tsx — every signed-in User now
// gets a Profile automatically (see lib/profiles.ts's
// createProfileForUser, called from lib/auth.ts's `createUser` event),
// so there's nothing left to "claim". updateProfileAction below is
// untouched: editing was never part of the claim flow to begin with.

// Phase 12 — Profile Redesign. Shared by the banner and the custom
// widget media fields below — both accept the exact same three kinds
// (image, GIF, or short muted video) and go through the exact same
// validate-then-upload steps, just into different Storage folders.
// Returns null when the field was left empty (no file chosen this
// submit — the existing value, if any, is simply left untouched by the
// caller), so "didn't touch this field" and "upload failed" are always
// distinguishable: the former returns null, the latter redirects with
// an error before this function's caller can proceed.
async function uploadBannerOrWidgetMedia(
  file: File,
  folder: ImageFolder,
  ownerId: string
): Promise<{ url: string; type: MediaType } | null> {
  if (file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isAllowedVideoMimeType(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) redirect("/profile/edit?error=file-too-large");
    const uploaded = await uploadVideo({ folder, ownerId, mimeType: file.type, data: buffer });
    return { url: uploaded.url, type: MediaType.VIDEO };
  }

  if (isAllowedImageMimeType(file.type)) {
    if (file.size > MAX_IMAGE_BYTES) redirect("/profile/edit?error=file-too-large");
    const uploaded = await uploadImage({ folder, ownerId, mimeType: file.type, data: buffer });
    return { url: uploaded.url, type: file.type === "image/gif" ? MediaType.GIF : MediaType.IMAGE };
  }

  redirect("/profile/edit?error=unsupported-file");
}

const MAX_SKILLS = 20;
const MAX_SKILL_LENGTH = 30;

// Plain <form action={updateProfileAction}> on /profile/edit — every
// field is optional-ish text input, matched up by `name` below.
export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  // Editing a Profile implies onboarding (username choice) already
  // happened — app/welcome/page.tsx's gate guarantees this in practice,
  // this is just the same defensive redirect app/profile/page.tsx uses.
  if (!session.user.username) {
    redirect("/onboarding/username");
  }

  const owned = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });
  if (!owned) {
    // Nothing to edit — this should only ever happen for the rare case
    // lib/auth.ts's `createUser` event failed to auto-create a Profile.
    // app/profile/page.tsx's own defensive fallback (same
    // createProfileForUser call) fixes that on the way back through, so
    // this redirect is self-healing rather than a dead end.
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

  const socials: Socials = {};
  for (const platform of socialOrder) {
    const value = String(formData.get(`social_${platform}`) ?? "").trim();
    if (value) socials[platform] = value;
  }

  // Правки 4 — Avatar now uploads a file from the visitor's device
  // instead of pasting an image URL, same "no file chosen this submit
  // leaves it untouched" rule the banner above already follows. Images
  // only (no video) — an avatar's fixed square crop never has to
  // support the banner's GIF/video cases.
  const avatarFile = formData.get("avatarFile");
  let uploadedAvatarUrl: string | null = null;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!isAllowedImageMimeType(avatarFile.type)) {
      redirect("/profile/edit?error=unsupported-file");
    }
    if (avatarFile.size > MAX_IMAGE_BYTES) {
      redirect("/profile/edit?error=file-too-large");
    }
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const uploaded = await uploadImage({
      folder: IMAGE_FOLDERS.avatars,
      ownerId: session.user.id,
      mimeType: avatarFile.type,
      data: buffer,
    });
    uploadedAvatarUrl = uploaded.url;
  }

  // Phase 12, point 1 — Banner. A new file replaces both `banner` and
  // `bannerType` together; no file chosen this submit leaves both
  // exactly as they were (never cleared just for being omitted from this
  // particular save).
  const bannerFile = formData.get("bannerFile");
  const uploadedBanner =
    bannerFile instanceof File
      ? await uploadBannerOrWidgetMedia(bannerFile, IMAGE_FOLDERS.banners, session.user.id)
      : null;

  // Phase 12, point 3 — Skills. One line, comma-separated, in keeping
  // with every other plain-text field on this form rather than a JS tag
  // picker — parsed into the array Profile.skills actually stores.
  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0 && skill.length <= MAX_SKILL_LENGTH)
    .slice(0, MAX_SKILLS);

  const education = String(formData.get("education") ?? "").trim();

  // Phase 12, point 4 — Birthday. `<input type="date">` submits
  // "YYYY-MM-DD" or an empty string; only ever written as a full Date
  // (midnight UTC on that day) or explicitly cleared to null — never a
  // partial/invalid value reaching the database.
  const birthdayRaw = String(formData.get("birthday") ?? "").trim();
  const birthday = birthdayRaw ? new Date(`${birthdayRaw}T00:00:00.000Z`) : null;
  if (birthdayRaw && Number.isNaN(birthday?.valueOf())) {
    redirect("/profile/edit?error=invalid-birthday");
  }

  // Phase 12, point 6 — Favorite Music. Same "new file replaces it,
  // no file leaves it alone" rule as the banner above. Title/artist are
  // plain text and always saved together with a fresh upload; editing
  // just the title/artist of an already-uploaded track (no new file)
  // is also supported — they're independent of whether this submit
  // included a new audio file.
  const musicFile = formData.get("musicFile");
  let uploadedMusicUrl: string | null = null;
  if (musicFile instanceof File && musicFile.size > 0) {
    if (!isAllowedAudioMimeType(musicFile.type)) {
      redirect("/profile/edit?error=unsupported-file");
    }
    if (musicFile.size > MAX_AUDIO_BYTES) {
      redirect("/profile/edit?error=file-too-large");
    }
    const buffer = Buffer.from(await musicFile.arrayBuffer());
    const uploaded = await uploadAudio({
      folder: IMAGE_FOLDERS.profileMusic,
      ownerId: session.user.id,
      mimeType: musicFile.type,
      data: buffer,
    });
    uploadedMusicUrl = uploaded.url;
  }
  const removeMusic = formData.get("removeMusic") === "on";
  const musicTitle = String(formData.get("musicTitle") ?? "").trim();
  const musicArtist = String(formData.get("musicArtist") ?? "").trim();

  // Phase 12, point 10 — Custom Media Widget.
  const widgetMediaFile = formData.get("widgetMediaFile");
  const uploadedWidgetMedia =
    widgetMediaFile instanceof File
      ? await uploadBannerOrWidgetMedia(widgetMediaFile, IMAGE_FOLDERS.profileMedia, session.user.id)
      : null;
  const removeWidgetMedia = formData.get("removeWidgetMedia") === "on";

  // Phase 12, point 9 — Right Sidebar Widgets. A widget counts as
  // "enabled" exactly when its content field is non-empty — no separate
  // on/off checkbox to keep in sync with it (see
  // components/members/ProfileWidgetsSidebar.tsx's own comment).
  const enabledWidgets: string[] = [];
  const widgetContent: Record<string, string> = {};
  for (const widget of PROFILE_WIDGETS) {
    const value = String(formData.get(`widget_${widget.id}`) ?? "").trim();
    if (value) {
      enabledWidgets.push(widget.id);
      widgetContent[widget.id] = value;
    }
  }

  await prisma.profile.update({
    where: { userId: session.user.id },
    data: {
      displayName,
      realName: realName || null,
      bio,
      city: city || null,
      country: country || null,
      ...(uploadedAvatarUrl && { avatar: uploadedAvatarUrl }),
      socials,
      skills,
      education: education || null,
      birthday,
      ...(uploadedBanner && { banner: uploadedBanner.url, bannerType: uploadedBanner.type }),
      ...(removeMusic
        ? { musicUrl: null, musicTitle: null, musicArtist: null }
        : {
            ...(uploadedMusicUrl && { musicUrl: uploadedMusicUrl }),
            musicTitle: musicTitle || null,
            musicArtist: musicArtist || null,
          }),
      ...(removeWidgetMedia
        ? { widgetMedia: null, widgetMediaType: null }
        : uploadedWidgetMedia && { widgetMedia: uploadedWidgetMedia.url, widgetMediaType: uploadedWidgetMedia.type }),
      enabledWidgets,
      widgetContent,
    },
  });

  revalidatePath(`/members/${session.user.username}`);
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");

  redirect(`/members/${session.user.username}`);
}
