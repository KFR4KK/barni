// Phase 12, point 9 — Right Sidebar Widgets.
//
// The catalog of *optional* widgets a profile owner can turn on below
// the always-shown Group card (Profile.enabledWidgets stores which ids
// are on; Profile.widgetContent stores each one's freeform content,
// keyed by id — see that field's own comment in prisma/schema.prisma).
// Adding a brand-new widget type later is: one new entry here, one new
// case in the renderer (components/members/ProfileWidgets.tsx), and —
// if it needs input beyond plain text — one new field on
// WidgetContentByType below. Never a migration, same "single source of
// truth, no schema change to extend" idiom lib/tags.ts's BUILT_IN_TAGS
// and lib/project-media.ts's ProjectMediaItem already use.

export interface ProfileWidgetDefinition {
  id: string;
  label: string;
  /** Shown in the "add a widget" picker on the edit form. */
  description: string;
}

export const PROFILE_WIDGETS: readonly ProfileWidgetDefinition[] = [
  { id: "quote", label: "Цитата", description: "Улюблена цитата або девіз." },
  { id: "mini-bio", label: "Міні-біо", description: "Коротка додаткова розповідь про себе." },
  { id: "favorite-game", label: "Улюблена гра", description: "Гра, у яку зараз найбільше граєте." },
  { id: "current-status", label: "Поточний статус", description: "Що зараз відбувається / над чим працюєте." },
] as const;

export type ProfileWidgetId = (typeof PROFILE_WIDGETS)[number]["id"];

const VALID_WIDGET_IDS = new Set<string>(PROFILE_WIDGETS.map((widget) => widget.id));

export function isValidWidgetId(id: string): id is ProfileWidgetId {
  return VALID_WIDGET_IDS.has(id);
}

// Every current widget is a single line of freeform text, keyed by its
// own id in Profile.widgetContent — e.g. { "quote": "…", "current-status": "…" }.
// A future widget with structured content (e.g. a rating, a list) just
// stores a richer JSON value under its own key; nothing here enforces a
// single shared shape across widgets.
export type ProfileWidgetContent = Record<string, string>;

export function parseWidgetContent(json: unknown): ProfileWidgetContent {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const entries = Object.entries(json as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  return Object.fromEntries(entries);
}

export function parseEnabledWidgets(json: unknown): ProfileWidgetId[] {
  if (!Array.isArray(json)) return [];
  return json.filter((id): id is ProfileWidgetId => typeof id === "string" && isValidWidgetId(id));
}
