import { Container } from "@/components/ui/Container";

const STEPS = ["Створюй.", "Співпрацюй.", "Ділись.", "Зростай."];

// Deliberately short, per the brief — four words, no supporting
// paragraph underneath. The border between words does the same "divide
// into thirds" trick the previous home page's AboutSection used, kept
// here as the one piece of that section worth carrying forward.
export function LandingAbout() {
  return (
    <section className="border-y border-line/60 py-16 sm:py-20">
      <Container wide>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          {STEPS.map((step, index) => (
            <span key={step} className="flex items-center gap-x-3">
              <span className="font-display text-2xl font-normal text-bone sm:text-3xl md:text-4xl">
                {step}
              </span>
              {index < STEPS.length - 1 && (
                <span className="hidden h-1.5 w-1.5 rounded-full bg-brass/60 sm:inline-block" aria-hidden="true" />
              )}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
