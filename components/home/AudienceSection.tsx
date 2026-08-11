import { Container } from "@/components/ui/Container";
import { HomeImage } from "@/components/home/HomeImage";
import { RotatingWord } from "@/components/home/RotatingWord";

// v0.3.0-alpha — Section 3/4 ("Для кого платформа").
export function AudienceSection() {
  return (
    <section className="flex min-h-screen flex-col justify-center">
      <Container wide className="w-full">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <HomeImage
            src="/images/home/audience.jpg"
            alt=""
            className="aspect-[4/5] w-full order-2 md:order-1"
          />

          <p className="order-1 font-display text-3xl leading-snug text-bone sm:text-4xl md:order-2 md:text-5xl md:leading-[1.15]">
            місце де <RotatingWord />
            <br />
            можуть ділитися своїми роботами, вести власний блог, знаходити
            однодумців і надихатися роботами інших.
          </p>
        </div>
      </Container>
    </section>
  );
}
