// One fixed backdrop behind every screen, so pages scroll over a single
// continuous "frame" instead of each page painting its own flat background.
export function AppBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md -z-10 overflow-hidden bg-gradient-to-b from-[#fbf9f6] via-[#f6f2ec] to-[#eee7dd] md:shadow-[0_0_60px_rgba(28,26,23,0.12)]"
    >
      {/* Soft color glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="absolute top-1/2 -right-28 w-72 h-72 rounded-full bg-oak-100/50 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-oak-200/30 blur-3xl" />

      {/* Architecture photo, faded out on every side (no visible edges) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-villa.jpg"
        alt=""
        className="absolute -right-16 top-2 w-[78%] h-72 object-cover object-[85%_center] opacity-35 [filter:sepia(0.4)_saturate(0.45)_brightness(1.3)] [mask-image:radial-gradient(closest-side,black_35%,transparent)]"
      />
    </div>
  );
}
