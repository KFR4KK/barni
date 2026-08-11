import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";

export const metadata = { title: "Важливі посилання" };

// Placeholder only — same reasoning as app/terms/page.tsx and
// app/privacy/page.tsx. The header's "Важливі посилання" button needs a
// real destination that isn't a dead link; what actually belongs on this
// page (a links list? a dropdown instead of a page?) is a later decision.
export default function ImportantLinksPage() {
  return (
    <Section>
      <Container>
        <SectionTitle as="h1">Важливі посилання</SectionTitle>
        <p className="mt-8 font-sans text-ash">
          Ця сторінка ще порожня — важливі посилання буде додано найближчим часом.
        </p>
      </Container>
    </Section>
  );
}
