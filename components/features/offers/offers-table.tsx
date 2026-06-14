"use client";

import { StatusBadge } from "@/components/features/channels/channel-utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUpdateOfferStatus } from "@/hooks/use-offers-page";
import {
  formatCurrency,
  formatEpc,
  formatOfferType,
  type OfferWithStats,
} from "@/lib/queries/offers-page";
import type { OfferStatus } from "@/lib/supabase/types";

interface OffersTableProps {
  offers: OfferWithStats[];
}

export function OffersTable({ offers }: OffersTableProps) {
  const updateStatus = useUpdateOfferStatus();

  if (!offers.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
        No offers yet — use &ldquo;New Offer&rdquo; to create one.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Vertical</TableHead>
            <TableHead>Payout</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>Conversions</TableHead>
            <TableHead>EPC</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.offer_id}>
              <TableCell className="font-medium">{offer.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {formatOfferType(offer.offer_type)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {offer.vertical}
              </TableCell>
              <TableCell>{formatCurrency(Number(offer.payout))}</TableCell>
              <TableCell>{offer.clicks.toLocaleString()}</TableCell>
              <TableCell>{offer.conversions.toLocaleString()}</TableCell>
              <TableCell>{formatEpc(offer.epc)}</TableCell>
              <TableCell>
                <StatusBadge status={offer.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={offer.status === "active"}
                    disabled={updateStatus.isPending}
                    onCheckedChange={(checked) =>
                      updateStatus.mutate({
                        offerId: offer.offer_id,
                        status: (checked ? "active" : "paused") as OfferStatus,
                      })
                    }
                    aria-label={`Toggle ${offer.name} status`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {offer.status === "active" ? "On" : "Off"}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
