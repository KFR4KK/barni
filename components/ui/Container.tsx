import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Use the wider (1200px) measure for the members index; default is the
   * narrower (760px) reading measure used for prose. */
  wide?: boolean;
  /** Even wider (1680px) measure, used only by the /feed three-column
   * layout so its center column has real room to breathe. Takes priority
   * over `wide` if both are set. */
  feedWide?: boolean;
}

export function Container({ children, className, wide = false, feedWide = false }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 md:px-10",
        feedWide ? "max-w-[1680px]" : wide ? "max-w-[1200px]" : "max-w-[760px]",
        className
      )}
    >
      {children}
    </div>
  );
}
