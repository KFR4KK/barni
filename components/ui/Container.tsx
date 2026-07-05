import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Use the wider (1200px) measure for the members index; default is the
   * narrower (760px) reading measure used for prose. */
  wide?: boolean;
}

export function Container({ children, className, wide = false }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 md:px-10",
        wide ? "max-w-[1200px]" : "max-w-[760px]",
        className
      )}
    >
      {children}
    </div>
  );
}
