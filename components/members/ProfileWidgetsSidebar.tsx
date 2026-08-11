import { MediaType, type Profile } from "@prisma/client";
import { PROFILE_WIDGETS, parseEnabledWidgets, parseWidgetContent } from "@/lib/profile-widgets";
import { ProfileMediaBlock } from "@/components/members/ProfileMediaBlock";

interface ProfileWidgetsSidebarProps {
  profile: Profile;
}

// Phase 12, point 9/10 — Right Sidebar Widgets + Custom Media Widget.
//
// NOTE: the mockup's top card in this column is a "Group" card (cover +
// avatar + name + short description). This codebase has no Group/
// community feature at all yet — no model, no membership, nothing to
// query — so there is nothing to "keep" here; building a full Groups
// feature is a separate, much larger effort than the profile redesign
// this component is part of. This sidebar starts directly with the
// optional widgets below where that card would sit; wiring in a real
// Group card is a drop-in addition once that feature exists elsewhere.
//
// Everything below is genuinely implemented: the custom media block
// (point 10 — same three media kinds as the banner, entirely optional,
// collapses when unset) and each enabled small widget (point 9 — quote/
// mini-bio/favorite-game/current-status, whichever the owner turned on
// via the edit form). `enabledWidgets`/`widgetContent` are both plain
// JSON columns (see lib/profile-widgets.ts) specifically so a brand-new
// widget type is never a migration — just a new entry in that file's
// PROFILE_WIDGETS list and a new case below.
export function ProfileWidgetsSidebar({ profile }: ProfileWidgetsSidebarProps) {
  const enabledWidgetIds = parseEnabledWidgets(profile.enabledWidgets);
  const content = parseWidgetContent(profile.widgetContent);
  const enabledWidgets = PROFILE_WIDGETS.filter((widget) => enabledWidgetIds.includes(widget.id));

  const hasCustomMedia = Boolean(profile.widgetMedia);
  const hasAnything = hasCustomMedia || enabledWidgets.length > 0;

  // Point 10 — "If disabled: the layout simply collapses naturally."
  // Nothing here reserves empty space for a widget that isn't on.
  if (!hasAnything) return null;

  return (
    <div className="flex flex-col gap-6">
      {hasCustomMedia && profile.widgetMedia && (
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] border border-line/50">
          <ProfileMediaBlock
            url={profile.widgetMedia}
            type={profile.widgetMediaType ?? MediaType.IMAGE}
            alt=""
            sizes="320px"
          />
        </div>
      )}

      {enabledWidgets.map((widget) => {
        const value = content[widget.id];
        if (!value) return null;

        return (
          <div
            key={widget.id}
            className="rounded-[20px] border border-line/50 bg-charcoal/20 p-6"
          >
            <h2 className="font-display text-base font-normal lowercase text-bone">{widget.label}</h2>
            <p className="mt-3 whitespace-pre-line font-sans text-sm leading-relaxed text-bone/90">
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
