"use client";

import { COUNTRIES } from "@/lib/countries";
import { flagUrlByCode } from "@/lib/currencies";

interface Props {
  /** Spanish country name as stored in profiles.country (e.g. "Perú", "Colombia") */
  countryName: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Renders a small flag image from flagcdn.com using the profile's country name.
 * Works cross-platform (flagcdn.com serves real flag images, unlike emoji on Windows).
 */
export function FlagImg({ countryName, size = "sm", className = "" }: Props) {
  if (!countryName) return null;
  const found = COUNTRIES.find(
    c => c.name.toLowerCase() === countryName.trim().toLowerCase()
  );
  if (!found) return null;

  const dims = size === "sm"
    ? { w: 20, h: 15, cls: "w-5 h-[15px]" }
    : { w: 28, h: 21, cls: "w-7 h-[21px]" };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagUrlByCode(found.code)}
      alt={countryName}
      width={dims.w}
      height={dims.h}
      className={`${dims.cls} rounded-[2px] object-cover flex-shrink-0 ${className}`}
    />
  );
}
