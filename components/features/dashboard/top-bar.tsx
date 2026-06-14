"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { usePageActions } from "@/components/providers/page-actions-provider";
import { createClient } from "@/lib/supabase/client";
import { getNavItemForPath } from "@/lib/navigation";
import { toastError, toastSuccess } from "@/lib/toast";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const current = getNavItemForPath(pathname);
  const { actions } = usePageActions();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toastError(error);
      return;
    }
    toastSuccess("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-zinc-950/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {current.title}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Faceless content automation
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => actions.onNew?.()}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{current.newLabel}</span>
          <span className="sm:hidden">New</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="relative hidden border-border/60 bg-zinc-900/50 sm:flex"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-zinc-950" />
        </Button>

        {user?.email && (
          <span className="hidden max-w-[120px] truncate text-xs text-muted-foreground lg:inline xl:max-w-[180px]">
            {user.email}
          </span>
        )}

        <Button
          variant="outline"
          size="icon"
          className="border-border/60 bg-zinc-900/50"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
