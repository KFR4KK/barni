import { getDiscordInviteUrl } from "@/lib/discord";

interface DiscordBadgeProps {
  serverMember: boolean;
  /** Smaller pill for inline use next to a name (e.g. CommentItem), where
   * the header-sized badge draws too much attention sitting next to plain
   * text. Matches the same px-2/py-0.5/text-[10px] proportions as the
   * "Profile Owner" tag it sits beside there. Header usage (MemberHeader)
   * doesn't pass this, so it keeps its original larger size. */
  compact?: boolean;
}

// Phase 4 — the one place that renders Discord membership status, used
// wherever a claimed Profile is displayed (currently MemberHeader on
// `/members/[slug]`). Deliberately just a badge + optional invite link,
// not a card or new section — the brief is explicit that the existing UI
// isn't being redesigned, so this reuses the same pill styling already
// used for skills/quick-info elsewhere in the design (rounded-full,
// border-line, font-mono uppercase label) rather than introducing a new
// shape.
//
// Green/gray aren't part of `tailwind.config.ts`'s documented token set
// (graphite/charcoal/bone/ash/brass/line — see that file's own comment
// about not adding colors without updating the design doc first), so
// this intentionally reaches for Tailwind's built-in `emerald` shade
// rather than inventing a new brand token for what's really just a
// status indicator, not a design accent.
export function DiscordBadge({ serverMember, compact }: DiscordBadgeProps) {
  const inviteUrl = getDiscordInviteUrl();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {serverMember ? (
        <span
          className={
            compact
              ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400"
              : "inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider text-emerald-400"
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Учасник Discord серверу
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-line/60 bg-charcoal/40 px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider text-ash">
          <span className="h-1.5 w-1.5 rounded-full bg-ash" aria-hidden="true" />
          Не приєднався до Discord серверу
        </span>
      )}

      {!serverMember && inviteUrl && (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          Приєднатися до Discord
        </a>
      )}
    </div>
  );
}
