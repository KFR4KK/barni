"use client";

// Isolated client boundary, same principle as NoiseOverlay and AwardsSection:
// the page itself stays a server component, and only the piece that needs
// Framer Motion (stagger-in, reduced-motion aware) opts into the client.

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Member } from "@/data/types";
import { socialIcons, socialLabels, socialOrder } from "@/lib/social-icons";
import { duration, easing } from "@/lib/motion";
import { splitIntoParagraphs, isImageIcon } from "@/lib/utils";

interface ProfileContentProps {
  member: Member;
}

export function ProfileContent({ member }: ProfileContentProps) {
  const shouldReduceMotion = useReducedMotion();

  const paragraphs = splitIntoParagraphs(member.bio);
  const activeSocials = socialOrder.filter((platform) => member.socials?.[platform]);
  const quickInfoItems = (member.quickInfo ?? []).filter((item) => item.label);

  const sectionContainer = {
    hidden: {},
    show: { transition: shouldReduceMotion ? {} : { staggerChildren: 0.12 } },
  };

  const sectionItem = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion ? { duration: 0 } : { duration: duration.slow, ease: easing },
    },
  };

  const listContainer = {
    hidden: {},
    show: { transition: shouldReduceMotion ? {} : { staggerChildren: 0.05 } },
  };

  const listItem = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion ? { duration: 0 } : { duration: duration.base, ease: easing },
    },
  };

  return (
    <motion.div variants={sectionContainer} initial="hidden" animate="show" className="flex flex-col gap-14">
      <motion.section variants={sectionItem} aria-labelledby="profile-about-heading">
        <h2
          id="profile-about-heading"
          className="font-mono text-xs uppercase tracking-[0.2em] text-ash"
        >
          Опис
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="max-w-[58ch] font-sans text-base leading-[1.75] text-bone/90"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </motion.section>

      {activeSocials.length > 0 && (
        <motion.section variants={sectionItem} aria-labelledby="profile-socials-heading">
          <h2
            id="profile-socials-heading"
            className="font-mono text-xs uppercase tracking-[0.2em] text-ash"
          >
            Соц мережі
          </h2>
          <motion.ul
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="mt-5 flex flex-wrap gap-3"
          >
            {activeSocials.map((platform) => {
              const Icon = socialIcons[platform];
              const url = member.socials?.[platform];
              if (!url) return null;
              const label = socialLabels[platform];

              return (
                <motion.li key={platform} variants={listItem}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${label} (відкриється у новій вкладці)`}
                    className="group inline-flex items-center gap-2 rounded-full border border-line/60 bg-charcoal/40 px-4 py-2 font-sans text-sm text-bone/90 transition-all duration-base ease-out hover:-translate-y-0.5 hover:border-brass/50 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="text-ash transition-colors duration-base group-hover:text-brass"
                    />
                    {label}
                  </a>
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.section>
      )}

      {quickInfoItems.length > 0 && (
        <motion.section variants={sectionItem} aria-labelledby="profile-quickinfo-heading">
          <h2
            id="profile-quickinfo-heading"
            className="font-mono text-xs uppercase tracking-[0.2em] text-ash"
          >
            Коротко про себе
          </h2>
          <motion.ul
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="mt-5 flex flex-wrap gap-2"
          >
            {quickInfoItems.map((item, index) => (
              <motion.li
                key={index}
                variants={listItem}
                className="inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-charcoal/30 px-3.5 py-1.5 font-sans text-sm text-bone/80"
              >
                {isImageIcon(item.icon) ? (
                  <span className="relative inline-block h-[18px] w-5 shrink-0">
                    <Image
                      src={item.icon}
                      alt=""
                      fill
                      sizes="20px"
                      className="object-contain"
                    />
                  </span>
                ) : (
                  <span aria-hidden="true">{item.icon}</span>
                )}
                {item.label}
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}
    </motion.div>
  );
}
