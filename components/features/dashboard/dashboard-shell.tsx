"use client";

import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { PageActionsProvider } from "@/components/providers/page-actions-provider";
import { AppSidebar } from "@/components/features/dashboard/app-sidebar";
import { TopBar } from "@/components/features/dashboard/top-bar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PageActionsProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden bg-zinc-950 text-foreground">
          <div className="hidden md:flex">
            <AppSidebar
              collapsed={collapsed}
              onToggle={() => setCollapsed((prev) => !prev)}
            />
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-60 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <AppSidebar
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onMenuClick={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </TooltipProvider>
    </PageActionsProvider>
  );
}
