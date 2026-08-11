import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";

export const metadata = { title: "Умови надання послуг" };

// Placeholder only — no real Terms of Service content was part of this
// redesign's brief. This exists so the new footer link (v0.3.0-alpha)
// points at something real instead of 404ing. Replace this body with the
// actual terms whenever they're written.
export default function TermsPage() {
  return (
    <Section>
      <Container>
        <SectionTitle as="h1">Умови надання послуг</SectionTitle>
        <p className="mt-8 font-sans text-ash">
          Ця сторінка ще порожня — текст умов надання послуг буде додано найближчим часом.
        </p>
      </Container>
    </Section>
  );
}
