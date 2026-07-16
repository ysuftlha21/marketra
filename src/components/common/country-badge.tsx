import { cn } from "@/lib/utils/cn";
import { getCountry } from "@/config/countries";

export interface CountryBadgeProps {
  countryCode: string;
  showName?: boolean;
  className?: string;
}

export function CountryBadge({ countryCode, showName = true, className }: CountryBadgeProps) {
  const country = getCountry(countryCode);
  const name = country?.name ?? countryCode.toUpperCase();
  const flag = country?.flagEmoji ?? "🏳";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-foreground",
        className,
      )}
      title={name}
    >
      <span aria-hidden>{flag}</span>
      {showName ? <span>{name}</span> : null}
    </span>
  );
}
