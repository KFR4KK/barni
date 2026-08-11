import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeImageProps {
  /** Path under /public, e.g. "/images/home/hero.jpg". */
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

// v0.3.0-alpha's hero and "Для кого платформа" sections both call for a
// large decorative photo that doesn't exist in the repo yet (no such
// asset was provided with the brief). Rather than pointing next/image at
// a path that 404s, this checks the file's presence on disk at render
// time (a cheap, one-time fs.existsSync — these are Server Components,
// rendered on the server, so this never ships to the client) and falls
// back to a plain placeholder card in the same rounded shape.
//
// To go live: drop the real photo at public + the exact `src` path each
// call site below already uses (see HeroSection / AudienceSection) —
// nothing else needs to change.
export function HomeImage({ src, alt, className, priority = false }: HomeImageProps) {
  const hasFile = existsSync(path.join(process.cwd(), "public", src));

  if (!hasFile) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[32px] border border-line bg-charcoal md:rounded-[40px]",
          className
        )}
      >
        <ImageIcon className="h-8 w-8 text-ash/40" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[32px] md:rounded-[40px]", className)}>
      <Image src={src} alt={alt} fill priority={priority} className="object-cover" sizes="(min-width: 768px) 45vw, 90vw" />
    </div>
  );
}
