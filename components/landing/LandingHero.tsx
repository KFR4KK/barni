import Link from "next/link";
import { Container } from "@/components/ui/Container";

const primaryButtonClasses =
  "inline-flex items-center justify-center rounded-full bg-brass px-7 py-3.5 font-sans text-sm font-medium text-graphite transition-opacity duration-fast hover:opacity-90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-4";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-full border border-line px-7 py-3.5 font-sans text-sm font-medium text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-4";

// Landing redesign — full-bleed hero, no photo (per the brief's "minimal,
// clean" direction and Linear/Vercel-style reference set — those are
// type-and-space heroes, not photo heroes). The radial glow behind the
// headline is the one deliberate, restrained use of a gradient the brief
// allows ("do not overuse gradients") — everything else on the page is
// flat surfaces + hairline borders.
export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brass/10 blur-[120px]"
      />

      <Container wide className="flex flex-col items-center text-center">
        <span className="rounded-full border border-line px-4 py-1.5 font-sans text-xs uppercase tracking-wider text-ash">
          Платформа для творчих людей
        </span>

        <h1 className="mt-6 max-w-3xl font-display text-4xl font-normal leading-[1.1] text-bone sm:text-5xl md:text-6xl">
          Створюй. Ділись.
          <br />
          Знаходь свою команду.
        </h1>

        <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ash sm:text-lg">
          .vibe — простір, де творчі люди публікують проєкти, ведуть блог,
          збирають команду та будують портфоліо. Не черговий фід — місце
          для того, що ти насправді робиш.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={primaryButtonClasses}>
            Почати
          </Link>
          <Link href="/feed" className={secondaryButtonClasses}>
            Дослідити проєкти
          </Link>
        </div>
      </Container>
    </section>
  );
}
