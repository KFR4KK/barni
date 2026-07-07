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

// Phase 6.2 — Project Showcase. Shared by the create/edit API routes
// (app/api/projects/route.ts, app/api/projects/[slug]/route.ts) to
// validate the two new optional link fields. Deliberately permissive
// beyond "is this a real http(s) URL" — no reachability check, no
// blocklist — same spirit as coverImage above, which has never been
// validated as an actual image.
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// A GitHub URL is "valid" here if it's a well-formed http(s) URL whose
// host is github.com (with or without the "www." a user might paste from
// a browser address bar). Deliberately not stricter than that — it
// doesn't require a specific path shape (user, user/repo, org, etc.),
// since all of those are legitimate things to link to from a project.
export function isValidGithubUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return host === "github.com" || host === "www.github.com";
}

// Phase 6.1: project slugs are generated from a user-typed Title, which —
// unlike data/members.ts's hand-picked Latin slugs — may well be in
// Ukrainian. Transliterates Cyrillic to Latin first (standard simplified
// scheme) so a title like "Мій перший проєкт" still produces a real,
// URL-safe slug instead of collapsing to an empty string.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
  ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
  ю: "iu", я: "ia", "'": "", "’": "",
};

export function slugify(input: string): string {
  const transliterated = input
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents from any Latin input too
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Phase 7.1 — Profile Comments. "Не отображать абсолютное время" is a
// hard requirement for comment timestamps, so this never falls back to
// formatDate()'s month/year output, however old the comment is.
//
// Structured as a lookup table keyed by locale rather than inline
// template strings, per the brief's "архитектура должна позволять
// локализацию" — adding a second locale later means adding one entry to
// RELATIVE_TIME_LABELS, not touching formatRelativeTime's logic. Kept to
// exactly the granularity the brief's own examples use (щойно / хв / год
// / вчора / дні / then weeks-months-years for anything older, so "never
// absolute" holds even for a very old comment) — no attempt at full
// Ukrainian numeral declension (2-4 vs 5+ forms) beyond what those
// examples already imply, since that's a bigger localization problem
// than one function should take on speculatively.
interface RelativeTimeLabels {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  yesterday: string;
  daysAgo: (n: number) => string;
  weeksAgo: (n: number) => string;
  monthsAgo: (n: number) => string;
  yearsAgo: (n: number) => string;
}

const RELATIVE_TIME_LABELS: Record<"uk", RelativeTimeLabels> = {
  uk: {
    justNow: "щойно",
    minutesAgo: (n) => `${n} хв тому`,
    hoursAgo: (n) => `${n} год тому`,
    yesterday: "вчора",
    daysAgo: (n) => `${n} дні тому`,
    weeksAgo: (n) => `${n} тижні тому`,
    monthsAgo: (n) => `${n} місяців тому`,
    yearsAgo: (n) => `${n} років тому`,
  },
};

export function formatRelativeTime(date: Date | string, locale: keyof typeof RELATIVE_TIME_LABELS = "uk"): string {
  const labels = RELATIVE_TIME_LABELS[locale];
  const target = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.max(0, (Date.now() - target.getTime()) / 1000);

  if (seconds < 60) return labels.justNow;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return labels.minutesAgo(minutes);

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hoursAgo(hours);

  const days = Math.floor(hours / 24);
  if (days < 2) return labels.yesterday;
  if (days < 7) return labels.daysAgo(days);

  const weeks = Math.floor(days / 7);
  if (days < 30) return labels.weeksAgo(weeks);

  const months = Math.floor(days / 30);
  if (days < 365) return labels.monthsAgo(months);

  const years = Math.floor(days / 365);
  return labels.yearsAgo(years);
}
