"use client";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
}

function AppLogo({ className }: AppLogoProps) {
  return (
    <img
      src="/app-loco.png"
      alt="Mechanic Shop"
      className={cn(
        "size-10 rounded-xl border border-border/60 bg-white object-contain p-1 shadow-sm",
        className,
      )}
      draggable={false}
    />
  );
}

interface AppBrandProps {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  compact?: boolean;
  subtitle?: string;
}

function AppBrand({
  className,
  titleClassName,
  subtitleClassName,
  compact = false,
  subtitle = "Shop Manager",
}: AppBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AppLogo className={compact ? "size-9" : "size-10"} />
      <div className="min-w-0">
        <div className={cn("truncate font-bold text-foreground", titleClassName)}>
          Mechanic Shop
        </div>
        <div
          className={cn(
            "truncate text-xs text-muted-foreground",
            subtitleClassName,
          )}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export { AppLogo, AppBrand };
