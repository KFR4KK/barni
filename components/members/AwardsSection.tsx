"use client";

// Isolated client boundary, same principle as NoiseOverlay: the rest of the
// profile page stays a server component, and only the piece that needs
// Framer Motion (stagger-in, reduced-motion aware) opts into the client.

import { motion, useReducedMotion } from "framer-motion";
import type { Award as AwardType } from "@/data/types";
import { getAwardIcon } from "@/lib/icons";
import { duration, easing } from "@/lib/motion";

interface AwardsSectionProps {
  awards?: AwardType[];
}

export function AwardsSection({ awards }: AwardsSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!awards || awards.length === 0) return null;

  const container = {
    hidden: {},
    show: {
      transition: shouldReduceMotion ? {} : { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion ? { duration: 0 } : { duration: duration.slow, ease: easing },
    },
  };

  return (
    <div>
      <h2 className="font-serif text-2xl leading-tight text-bone">Почесні нагороди</h2>

      <motion.ul
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-6 flex flex-col gap-4"
      >
        {awards.map((award) => {
          const Icon = getAwardIcon(award.icon);
          return (
            <motion.li
              key={award.title}
              variants={item}
              className="group relative rounded-card border border-line/60 bg-charcoal/40 p-5 shadow-card backdrop-blur-nav transition-all duration-base ease-out hover:-translate-y-1 hover:border-brass/50"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass transition-shadow duration-base group-hover:shadow-[0_0_18px_rgba(198,161,91,0.4)]">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-serif text-base leading-snug text-bone">{award.title}</p>
                  {award.description && (
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-ash">
                      {award.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
