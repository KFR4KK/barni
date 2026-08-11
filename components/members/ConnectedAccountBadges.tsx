import { MessageCircle } from "lucide-react";

interface ConnectedAccountBadgesProps {
  providers: string[];
}

// Account Linking, point 9 — "Connected ≠ Public". Only ever receives
// providers whose Account.showOnProfile is true (filtered by the caller,
// app/members/[slug]/page.tsx) — this component has no opinion of its
// own about what's public, it just renders whatever list it's handed.
const PROVIDER_ICONS: Record<string, typeof MessageCircle> = {
  discord: MessageCircle,
};

const PROVIDER_LABELS: Record<string, string> = {
  discord: "Discord",
};

export function ConnectedAccountBadges({ providers }: ConnectedAccountBadgesProps) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((provider) => {
        const Icon = PROVIDER_ICONS[provider];
        const label = PROVIDER_LABELS[provider] ?? provider;
        return (
          <span
            key={provider}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-sans text-xs text-ash"
          >
            {Icon && <Icon size={12} aria-hidden="true" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}
