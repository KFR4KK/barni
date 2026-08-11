import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeaturedProjects } from "@/components/landing/LandingFeaturedProjects";
import { LandingAbout } from "@/components/landing/LandingAbout";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingCommunityCta } from "@/components/landing/LandingCommunityCta";

// Landing page redesign. This route is marketing, not the app — a
// signed-in visitor has nothing to do here, so they're sent straight
// into the Feed instead of seeing "Create account" buttons for an
// account they already have. Everyone else gets the actual landing page
// below (components/landing/*).
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/feed");
  }

  return (
    <>
      <LandingHero />
      <LandingFeaturedProjects />
      <LandingAbout />
      <LandingFeatures />
      <LandingCommunityCta />
    </>
  );
}
