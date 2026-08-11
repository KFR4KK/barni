import { Container } from "@/components/ui/Container";

// v0.3.0-alpha — Section 2/4. The decorative lines behind "Про нас" are
// drawn with plain CSS (three hairlines using the existing --color-line
// token — no new colors, per the brief) rather than an SVG/PNG, since
// that turned out simple enough not to need the fallback asset the brief
// offered. If you'd still rather use your own PNG:
//   1. Drop it at /public/images/home/about-lines.png
//   2. Delete the three <span> lines below
//   3. Add: <img src="/images/home/about-lines.png" alt="" className="absolute inset-0 h-full w-full object-contain" />
// inside the same relative wrapper — nothing else in this file needs to change.
export function AboutSection() {
  return (
    <section id="about" className="flex min-h-screen flex-col justify-center">
      <Container wide className="w-full">
        <div className="relative pb-16 pt-4 text-center md:pb-24">
          {/* horizontal hairline through the heading */}
          <span aria-hidden="true" className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          {/* two vertical hairlines dividing the block into thirds */}
          <span aria-hidden="true" className="absolute inset-y-0 left-1/3 w-px bg-line" />
          <span aria-hidden="true" className="absolute inset-y-0 left-2/3 w-px bg-line" />

          <h2 className="relative inline-block bg-graphite px-6 font-display text-3xl font-medium uppercase tracking-wide text-bone sm:text-4xl">
            Про нас
          </h2>
        </div>

        <p className="font-display text-3xl leading-snug text-bone sm:text-4xl md:text-5xl md:leading-[1.15]">
          Ми хочемо побудувати простий, сучасний та комфортний простір, де в
          центрі уваги знаходиться не алгоритм, а сама творчість і люди, які
          її створюють.
        </p>
      </Container>
    </section>
  );
}
