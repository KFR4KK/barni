import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Much smaller vertical padding than the default marketing-page rhythm
   * (py-24/36/44). Used by pages like the member profile, where the
   * default spacing left far too much empty air between the navbar and
   * the content below it. */
  compact?: boolean;
}

export function Section({ children, className, id, compact = false }: SectionProps) {
  return (
    <section id={id} className={cn(compact ? "py-8 md:py-10 lg:py-12" : "py-24 md:py-36 lg:py-44", className)}>
      {children}
    </section>
  );
}
