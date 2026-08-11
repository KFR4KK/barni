// Shared timing/easing constants for the animation system.
// The current build uses only CSS transitions (see MemberRow, Button, etc.),
// which already reference these same values by convention. Framer Motion
// variants (fadeUp, staggerContainer, underline, page-transition presets)
// are intentionally NOT built yet — that's next-stage work, per the approved
// architecture. Keeping this file in place now means every component that
// will eventually consume these presets already imports from a stable path.

export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.5,
} as const;

export const easing = [0.16, 1, 0.3, 1] as const;
