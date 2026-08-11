import Image from "next/image";
import type { ReactNode } from "react";
import { MediaType, type Profile } from "@prisma/client";
import type { Member } from "@/data/types";
import { socialLabels, socialOrder } from "@/lib/social-icons";
import { formatDate, formatDisplayUrl, calculateAge, isExternalUrl, splitIntoParagraphs } from "@/lib/utils";
import { ProfileMediaBlock } from "@/components/members/ProfileMediaBlock";

interface ProfileHeaderProps {
  member: Member;
  profile: Profile | null;
  location: string | null;
  followSection?: ReactNode;
  actions?: ReactNode;
  /** Phase 12 revision — the "favorite music" widget used to be a
   * viewport-fixed mini-player that followed the visitor around the
   * whole page. Per the mockup it's a static widget that lives in the
   * header's right column, in flow with everything else, so it scrolls
   * away with the rest of the header instead of chasing the viewer. */
  musicPlayer?: ReactNode;
}

// Phase 12 — Profile Redesign. Replaces the old MemberHeader + top of
// ProfileContent with the mockup's layout in one component: a full-width
// banner (point 1), the avatar overlapping its bottom edge (point 2 —
// "no redesign needed besides positioning", so the avatar's own styling
// — size, rounded corners, border — is unchanged from MemberHeader, only
// where it sits changed), and the description/links/skills/location/
// education/age info grid (point 3).
export function ProfileHeader({
  member,
  profile,
  location,
  followSection,
  actions,
  musicPlayer,
}: ProfileHeaderProps) {
  const activeSocials = socialOrder.filter((platform) => member.socials?.[platform]);
  const paragraphs = splitIntoParagraphs(member.bio);
  const skills = profile?.skills ?? [];
  const age = profile?.birthday ? calculateAge(profile.birthday) : null;

  return (
    <div>
      {/* Point 1 — Banner. A profile with nothing set yet (no `banner`)
         just shows the graphite base surface — the same "no data yet,
         show nothing extra" fallback the old bannerImage field always
         had, just now actually visible as a plain surface instead of an
         unused field. */}
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-charcoal">
        {member.bannerImage && (
          <>
            <ProfileMediaBlock
              url={member.bannerImage}
              type={profile?.bannerType ?? MediaType.IMAGE}
              alt=""
              sizes="(min-width: 1024px) 1680px, 100vw"
            />
            {/* Правки 3 — the gradient now runs the full height of the
               banner (no more transparent top half) so the whole photo
               reads as gradually darkening into the page, not just the
               bottom third. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-graphite/10 to-graphite"
            />
          </>
        )}
      </div>

      {/* Правки 6 — the previous percentage-based margin-top (meant to
         equal exactly 1/3 of the banner's height) ended up shifting the
         info columns up far more than intended in practice, pushing most
         of опис/посилання/скіли off past the top of the banner entirely
         (invisible) while only the avatar — sized and positioned
         independently — stayed visible. Back to a plain, fixed-pixel
         overlap (safely well inside the banner at any screen size), with
         an explicit `relative z-10` so this row is always guaranteed to
         paint above the banner regardless of stacking-context quirks. */}
      <div className="relative z-10 mx-auto -mt-24 grid max-w-[1180px] grid-cols-1 items-start gap-10 md:-mt-32 lg:-mt-40 lg:grid-cols-[280px_1fr_300px] lg:justify-center lg:gap-10">
        {/* Left — avatar (overlapping the banner above), name, stats. */}
        <div>
          <div className="relative h-32 w-32 overflow-hidden rounded-2xl border-4 border-graphite bg-graphite md:h-40 md:w-40">
            <Image
              src={member.avatar}
              alt={member.avatarAlt}
              fill
              sizes="160px"
              className="object-cover"
              priority
              unoptimized={isExternalUrl(member.avatar)}
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-normal text-bone">{member.nickname}</h1>
            </div>
            {member.realName && (
              <p className="mt-1 font-sans text-sm text-ash/70">({member.realName})</p>
            )}
            <p className="mt-2 font-sans text-xs text-ash">Приєднався {formatDate(member.joinedDate)}</p>
            {followSection && <div className="mt-3">{followSection}</div>}
            {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
          </div>
        </div>

        {/* Middle — опис + посилання + плеєр. */}
        <div className="flex flex-col gap-8">
          <section aria-labelledby="profile-about-heading">
            <h2 id="profile-about-heading" className="font-display text-base font-normal lowercase text-bone">
              Опис
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="max-w-[58ch] font-sans text-sm leading-[1.75] text-bone/90">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {activeSocials.length > 0 && (
            <section aria-labelledby="profile-links-heading">
              <h2 id="profile-links-heading" className="font-display text-base font-normal lowercase text-bone">
                Посилання
              </h2>
              <ul className="mt-4 flex flex-col gap-1.5">
                {activeSocials.map((platform) => {
                  const url = member.socials?.[platform];
                  if (!url) return null;
                  return (
                    <li key={platform} className="font-sans text-sm">
                      <span className="text-bone/90">{socialLabels[platform]} - </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brass underline decoration-brass/30 underline-offset-2 transition-colors duration-fast hover:decoration-brass"
                      >
                        {formatDisplayUrl(url)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {musicPlayer && (
            <section aria-labelledby="profile-music-heading">
              <h2 id="profile-music-heading" className="font-display text-base font-normal lowercase text-bone">
                Улюблений трек
              </h2>
              <div className="mt-4">{musicPlayer}</div>
            </section>
          )}
        </div>

        {/* Right — скіли / проживання / навчання / вік. Each section
           only renders if that field is actually set — same "omit or
           leave empty to hide it entirely" rule every optional profile
           field in this app already follows (see data/types.ts's own
           comments on quickInfo/skills). */}
        <div className="flex flex-col gap-6">
          {skills.length > 0 && (
            <section aria-labelledby="profile-skills-heading">
              <h2 id="profile-skills-heading" className="font-display text-base font-normal lowercase text-bone">
                Скіли
              </h2>
              <p className="mt-3 font-sans text-sm text-bone/90">{skills.join(", ")}</p>
            </section>
          )}

          {location && (
            <section aria-labelledby="profile-location-heading">
              <h2 id="profile-location-heading" className="font-display text-base font-normal lowercase text-bone">
                Проживання
              </h2>
              <p className="mt-3 font-sans text-sm text-bone/90">{location}</p>
            </section>
          )}

          {profile?.education && (
            <section aria-labelledby="profile-education-heading">
              <h2 id="profile-education-heading" className="font-display text-base font-normal lowercase text-bone">
                Навчання
              </h2>
              <p className="mt-3 font-sans text-sm text-bone/90">{profile.education}</p>
            </section>
          )}

          {age !== null && (
            <section aria-labelledby="profile-age-heading">
              <h2 id="profile-age-heading" className="font-display text-base font-normal lowercase text-bone">
                Вік
              </h2>
              <p className="mt-3 font-sans text-sm text-bone/90">{age} років</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
