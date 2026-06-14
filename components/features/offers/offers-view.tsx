"use client";

import { useCallback, useState } from "react";

import { AddOfferDialog } from "@/components/features/offers/add-offer-dialog";
import { OffersTable } from "@/components/features/offers/offers-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegisterPageAction } from "@/components/providers/page-actions-provider";
import { useOffersWithStats } from "@/hooks/use-offers-page";

export function OffersView() {
  const { data: offers, isLoading, isError, error, refetch } = useOffersWithStats();
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  useRegisterPageAction("onNew", openDialog);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">Could not load offers</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Check your Supabase connection."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end lg:hidden">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Add Offer
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <OffersTable offers={offers ?? []} />
      )}

      <AddOfferDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
