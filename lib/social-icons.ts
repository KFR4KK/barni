import {
  Send,
  MessageCircle,
  Camera,
  Github,
  PlayCircle,
  Music2,
  Hash,
  PenTool,
  Palette,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { SocialPlatform } from "@/data/types";

// Deliberately generic, neutral icons rather than brand logos/colors — the
// design system uses one accent (brass) and no third-party brand identity.
export const socialIcons: Record<SocialPlatform, LucideIcon> = {
  telegram: Send,
  discord: MessageCircle,
  instagram: Camera,
  github: Github,
  youtube: PlayCircle,
  tiktok: Music2,
  x: Hash,
  behance: PenTool,
  dribbble: Palette,
  website: Globe,
};

export const socialLabels: Record<SocialPlatform, string> = {
  telegram: "Telegram",
  discord: "Discord",
  instagram: "Instagram",
  github: "GitHub",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  behance: "Behance",
  dribbble: "Dribbble",
  website: "Сайт",
};

// Fixed display order, independent of however the fields happen to be
// ordered in a given member object.
export const socialOrder: SocialPlatform[] = [
  "telegram",
  "discord",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "github",
  "behance",
  "dribbble",
  "website",
];
