// Renders the grain texture from the creative direction as an inline SVG
// fractal-noise filter, so the foundation doesn't depend on a binary asset
// that hasn't been produced yet. A designed grain PNG can replace this
// during the polish stage without touching any other file — this component
// is the only place that decision lives.
export function NoiseOverlay() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
    >
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}
