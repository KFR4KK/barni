import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("uk-UA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildProfileURL(slug: string): string {
  return `/members/${slug}`;
}

// Splits a single bio string into short paragraphs (a couple of sentences
// each) so long bios don't read as one dense block of text. Bios are stored
// as plain sentences in data/members.ts; this keeps that data simple while
// letting the page render comfortable paragraph rhythm.
export function splitIntoParagraphs(text: string, sentencesPerParagraph = 2): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) ?? [text];
  const paragraphs: string[] = [];

  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    const paragraph = sentences
      .slice(i, i + sentencesPerParagraph)
      .join("")
      .trim();
    if (paragraph) paragraphs.push(paragraph);
  }

  return paragraphs.length > 0 ? paragraphs : [text];
}

const IMAGE_ICON_PATTERN = /\.(svg|png|jpe?g|webp|gif|avif)$/i;

// Quick Info icons can be a plain emoji ("🎂") or a path to an image asset
// ("/images/flags/ua.svg"). Detecting by extension keeps the data shape
// simple — authors don't need to set a separate "isImage" flag.
export function isImageIcon(icon: string): boolean {
  return IMAGE_ICON_PATTERN.test(icon);
}

// Phase 3: member avatars used to only ever be local paths under
// /public/images/members, which next/image optimizes freely. Once avatars
// are editable (lib/profiles.ts), a member can paste any external image
// URL — one that almost certainly isn't in next.config.mjs's
// `images.remotePatterns` allowlist. Rather than expand that allowlist to
// an arbitrary wildcard (a real security tradeoff) just to support
// profile editing, callers pass `unoptimized={isExternalUrl(src)}` to
// next/image so external avatars render as-is instead of erroring.
export function isExternalUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
