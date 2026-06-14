import { Instagram, Youtube } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Platform } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  const iconClass = cn("h-4 w-4", className);

  switch (platform) {
    case "youtube":
      return <Youtube className={iconClass} />;
    case "instagram":
      return <Instagram className={iconClass} />;
    case "tiktok":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={iconClass}
          aria-hidden
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
  }
}

export function platformLabel(platform: Platform): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function HealthBadge({ score }: { score: number }) {
  const variant =
    score > 70 ? "success" : score >= 40 ? "warning" : "danger";

  return <Badge variant={variant}>{score}</Badge>;
}

export function StatusBadge({ status }: { status: "active" | "paused" }) {
  return (
    <Badge variant={status === "active" ? "success" : "secondary"}>
      {status}
    </Badge>
  );
}
