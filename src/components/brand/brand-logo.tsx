import Image from "next/image";
import Link from "next/link";

export interface BrandLogoProps {
  variant?: "mark" | "full";
  theme?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
  className?: string;
  link?: boolean;
}

const sizes = { sm: { m: 24, f: 100 }, md: { m: 32, f: 140 }, lg: { m: 40, f: 180 } };

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
          className="object-contain dark:hidden"
          priority
        />
        <Image
          src={darkSrc}
          alt={alt}
          width={w}
          height={h}
          className="hidden object-contain dark:block"
          priority
        />
      </>
    ) : theme === "dark" ? (
      <Image src={darkSrc} alt={alt} width={w} height={h} className="object-contain" priority />
    ) : (
      <Image src={lightSrc} alt={alt} width={w} height={h} className="object-contain" priority />
    );

  if (link) {
    return (
      <Link href="/" aria-label="Marketra home" className={className}>
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}
