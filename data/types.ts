// Fixed, curated set of platforms the profile UI knows how to render —
// deliberately not an open string so a typo in data/members.ts fails at
// compile time instead of silently rendering nothing.
export type SocialPlatform =
  | "telegram"
  | "discord"
  | "instagram"
  | "github"
  | "youtube"
  | "tiktok"
  | "x"
  | "behance"
  | "dribbble"
  | "website";

export type Socials = Partial<Record<SocialPlatform, string>>;

export interface QuickInfoItem {
  icon: string; // an emoji/glyph (e.g. "🎂") OR an image path (e.g. "/images/flags/ua.svg") —
  // the component detects which by file extension and renders accordingly
  label: string; // the text shown next to the icon, e.g. "Вінниця", "16 років"
  type?: string; // optional free-form tag (e.g. "location") — not used for rendering logic, reserved for future use
}

export interface AmbientPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Award {
  title: string;
  description?: string;
  icon: string; // Lucide icon name, e.g. "Trophy" — see lib/icons.ts for the supported set
}

export interface Member {
  slug: string; // URL identifier, e.g. "ava-cole"
  nickname: string;
  realName?: string; // shown as secondary text under the nickname, e.g. "(Макс)"; omit or leave empty to hide it entirely
  role?: string; // short descriptor shown in the masthead, e.g. "Illustrator, Motion"
  skills?: string[]; // short list shown directly under the nickname, e.g. ["веб дизайнер", "фотограф"]
  bio: string; // the profile-page paragraph
  avatar: string; // path under /public
  avatarAlt: string; // required, not optional — accessibility floor, not an afterthought
  bannerImage?: string;
  socials?: Socials; // present platforms only; the profile hides the section entirely if empty
  quickInfo?: QuickInfoItem[]; // shown in order, each with its own icon; omit or leave empty to hide the section
  joinedDate: string; // ISO date string, e.g. "2022-03-14"
  status?: "active" | "away" | "alumni";
  accentColor?: string; // rare per-member override of the brass accent
  location?: string;
  tags?: string[]; // reserved for future filtering — unused at launch
  awards?: Award[]; // optional honors shown on the profile page; omit or leave empty to hide the section
  background?: AmbientPalette; // optional manual ambient tint for the profile page; if omitted, colors are sampled from the avatar automatically
}
