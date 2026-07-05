import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ProfileLayout } from "@/components/members/ProfileLayout";
import { MemberHeader } from "@/components/members/MemberHeader";
import { ProfileContent } from "@/components/members/ProfileContent";
import { AwardsSection } from "@/components/members/AwardsSection";
import { AmbientBackground } from "@/components/members/AmbientBackground";
import { getAllMembers, getMemberBySlug } from "@/lib/members";
import { buildMemberMetadata } from "@/lib/seo";

interface MemberPageProps {
  // Next.js 15: dynamic route params are async.
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllMembers().map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = getMemberBySlug(slug);
  if (!member) return {};
  return buildMemberMetadata(member);
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { slug } = await params;
  const member = getMemberBySlug(slug);

  if (!member) {
    notFound();
  }

  return (
    <Section className="relative isolate overflow-hidden">
      <AmbientBackground member={member} />
      <Container wide>
        <a
          href="/"
          className="mb-12 inline-block font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-150 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          ← Індекс
        </a>
        <ProfileLayout
          header={<MemberHeader member={member} />}
          aside={
            member.awards && member.awards.length > 0 ? (
              <AwardsSection awards={member.awards} />
            ) : undefined
          }
        >
          <ProfileContent member={member} />
        </ProfileLayout>
      </Container>
    </Section>
  );
}
