import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";

export const metadata = { title: "Політика конфіденційності" };

// Placeholder only — see app/terms/page.tsx's comment, same reasoning.
export default function PrivacyPage() {
  return (
    <Section>
      <Container>
        <SectionTitle as="h1">Політика конфіденційності</SectionTitle>
        <p className="mt-8 font-sans text-ash">
          Ця сторінка ще порожня — текст політики конфіденційності буде додано найближчим часом.
        </p>
      </Container>
    </Section>
  );
}
