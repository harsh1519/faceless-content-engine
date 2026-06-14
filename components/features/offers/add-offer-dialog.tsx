"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateOffer } from "@/hooks/use-offers-page";
import type { OfferType } from "@/lib/supabase/types";

interface AddOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultForm = {
  name: "",
  offer_type: "affiliate" as OfferType,
  payout: "",
  vertical: "",
  affiliate_url: "",
  cloaked_url: "",
};

export function AddOfferDialog({ open, onOpenChange }: AddOfferDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const createOffer = useCreateOffer();

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) setForm(defaultForm);
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createOffer.mutateAsync({
      name: form.name.trim(),
      offer_type: form.offer_type,
      payout: parseFloat(form.payout) || 0,
      vertical: form.vertical.trim(),
      affiliate_url: form.affiliate_url.trim(),
      cloaked_url: form.cloaked_url.trim() || null,
    });
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Offer</DialogTitle>
            <DialogDescription>
              Track a CPA or affiliate offer for monetization.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="offer-name">Name</Label>
              <Input
                id="offer-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="CreditBoost Pro Lead"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="offer-type">Type</Label>
              <Select
                value={form.offer_type}
                onValueChange={(value: OfferType) =>
                  setForm({ ...form, offer_type: value })
                }
              >
                <SelectTrigger id="offer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpa_lead">CPA Lead</SelectItem>
                  <SelectItem value="cpa_sale">CPA Sale</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="payout">Payout ($)</Label>
                <Input
                  id="payout"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.payout}
                  onChange={(e) =>
                    setForm({ ...form, payout: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vertical">Vertical</Label>
                <Input
                  id="vertical"
                  value={form.vertical}
                  onChange={(e) =>
                    setForm({ ...form, vertical: e.target.value })
                  }
                  placeholder="finance"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="affiliate-url">Affiliate URL</Label>
              <Input
                id="affiliate-url"
                type="url"
                value={form.affiliate_url}
                onChange={(e) =>
                  setForm({ ...form, affiliate_url: e.target.value })
                }
                placeholder="https://affiliate.example.com/offer"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cloaked-url">Cloaked URL (optional)</Label>
              <Input
                id="cloaked-url"
                type="url"
                value={form.cloaked_url}
                onChange={(e) =>
                  setForm({ ...form, cloaked_url: e.target.value })
                }
                placeholder="https://go.example.com/offer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createOffer.isPending}>
              {createOffer.isPending ? "Creating…" : "Create Offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
