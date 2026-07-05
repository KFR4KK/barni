import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Divider } from "@/components/ui/Divider";
import { MemberIndex } from "@/components/members/MemberIndex";
import { getAllMembers } from "@/lib/members";
import { siteConfig } from "@/data/site";

export default function HomePage() {
  const members = getAllMembers();

  return (
    <>
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center md:px-10">
        <div className="mx-auto flex max-w-[46ch] flex-col items-center">
          <h1 className="font-serif text-5xl leading-tight text-bone md:text-7xl">
            {siteConfig.name}
          </h1>
          <p className="mt-6 font-sans text-lg text-ash">{siteConfig.tagline}</p>
        </div>

        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 md:bottom-14">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ash/70">
            Прокрутіть вниз
          </span>
          <span aria-hidden="true" className="animate-scroll-hint text-ash/70">
            ↓
          </span>
        </div>
      </section>

      <Divider accent className="mx-6 md:mx-10" />

      <Section id="members">
        <Container wide>
          <SectionTitle as="h2" className="mb-12">
            Адміністрація
          </SectionTitle>
          <MemberIndex members={members} />
        </Container>
      </Section>
    </>
  );
}
