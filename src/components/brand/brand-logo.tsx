import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface BrandLogoProps {
  variant?: "mark" | "full";
  theme?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
  className?: string;
  link?: boolean;
}

// Full logo assets use a 15:4 aspect ratio. Matching the source ratio prevents
// the browser from correcting a mismatched intrinsic size after first paint.
const sizes = { sm: { m: 24, f: 90 }, md: { m: 32, f: 120 }, lg: { m: 40, f: 150 } };

export function BrandLogo({
  variant = "full",
  theme = "auto",
  size = "md",
  className,
  link,
}: BrandLogoProps) {
  const s = sizes[size];
  const isCompact = variant === "mark";
  const w = isCompact ? s.m : s.f;
  const h = s.m;
  const alt = isCompact ? "" : "Marketra";

  const lightSrc = isCompact ? "/brand/marketra-mark-dark.png" : "/brand/marketra-logo-dark.png";
  const darkSrc = isCompact ? "/brand/marketra-mark-light.png" : "/brand/marketra-logo-light.png";

  const content =
    theme === "auto" ? (
      <>
        <Image
          src={lightSrc}
          alt={alt}
          width={w}
          height={h}
          className="block max-w-none object-contain dark:hidden"
          priority
        />
        <Image
          src={darkSrc}
          alt={alt}
          width={w}
          height={h}
          className="hidden max-w-none object-contain dark:block"
          priority
        />
      </>
    ) : theme === "dark" ? (
      <Image
        src={darkSrc}
        alt={alt}
        width={w}
        height={h}
        className="block max-w-none object-contain"
        priority
      />
    ) : (
      <Image
        src={lightSrc}
        alt={alt}
        width={w}
        height={h}
        className="block max-w-none object-contain"
        priority
      />
    );

  if (link) {
    return (
      <Link
        href="/"
        aria-label="Marketra home"
        className={cn("inline-flex min-h-11 shrink-0 items-center", className)}
      >
        {content}
      </Link>
    );
  }

  return <span className={cn("inline-flex shrink-0 items-center", className)}>{content}</span>;
}
