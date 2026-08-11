import { Container } from "@/components/ui/Container";
import { HomeImage } from "@/components/home/HomeImage";

// v0.3.0-alpha "Reimagined Design" — Section 1/4 of the new home page.
// Full-viewport-height (100vh) per the brief; the scroll hint's fade
// animation reuses the .animate-scroll-hint keyframe that already existed
// in globals.css before this redesign.
export function HeroSection() {
  return (
    <section className="flex min-h-screen flex-col justify-center">
      <Container wide className="w-full">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <h1 className="font-display text-5xl leading-[1.05] text-bone sm:text-6xl lg:text-7xl">
            сайт для <span className="text-brass">творчих</span>
            <br />
            та <span className="text-brass">цікавих</span> людей
            <br />з усього світу
          </h1>

          <HomeImage
            src="/images/home/hero.jpg"
            alt=""
            priority
            className="aspect-[4/5] w-full md:aspect-square"
          />
        </div>
      </Container>

      <div className="mt-16 flex flex-col items-center gap-2 md:mt-24">
        <span className="animate-scroll-hint flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-wider text-ash">
          прокрутіть вниз
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 2v11m0 0-4-4m4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </section>
  );
}
