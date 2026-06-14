import type { SupabaseClient } from "@supabase/supabase-js";

import type { Conversion, Offer, OfferStatus, OfferType } from "@/lib/supabase/types";

export interface OfferWithStats extends Offer {
  clicks: number;
  conversions: number;
  revenue: number;
  epc: number;
}

export interface CreateOfferInput {
  name: string;
  offer_type: OfferType;
  payout: number;
  vertical: string;
  affiliate_url: string;
  cloaked_url?: string | null;
}

function aggregateConversions(conversions: Conversion[]) {
  const map = new Map<
    string,
    { clicks: number; conversions: number; revenue: number }
  >();

  for (const row of conversions) {
    const existing = map.get(row.offer_id) ?? {
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };
    existing.clicks += row.click_count;
    existing.conversions += row.conversion_count;
    existing.revenue += Number(row.revenue);
    map.set(row.offer_id, existing);
  }

  return map;
}

export async function fetchOffersWithStats(
  supabase: SupabaseClient
): Promise<OfferWithStats[]> {
  const [offersRes, conversionsRes] = await Promise.all([
    supabase.from("offers").select("*").order("name"),
    supabase.from("conversions").select("*"),
  ]);

  if (offersRes.error) throw offersRes.error;
  if (conversionsRes.error) throw conversionsRes.error;

  const stats = aggregateConversions(conversionsRes.data ?? []);

  return (offersRes.data ?? []).map((offer) => {
    const agg = stats.get(offer.offer_id) ?? {
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };
    const epc = agg.clicks > 0 ? agg.revenue / agg.clicks : 0;

    return {
      ...offer,
      clicks: agg.clicks,
      conversions: agg.conversions,
      revenue: agg.revenue,
      epc,
    };
  });
}

export async function createOffer(
  supabase: SupabaseClient,
  input: CreateOfferInput
): Promise<Offer> {
  const { data, error } = await supabase
    .from("offers")
    .insert({
      name: input.name,
      offer_type: input.offer_type,
      payout: input.payout,
      vertical: input.vertical,
      affiliate_url: input.affiliate_url,
      cloaked_url: input.cloaked_url ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOfferStatus(
  supabase: SupabaseClient,
  offerId: string,
  status: OfferStatus
): Promise<void> {
  const { error } = await supabase
    .from("offers")
    .update({ status })
    .eq("offer_id", offerId);

  if (error) throw error;
}

export function formatOfferType(type: OfferType): string {
  const labels: Record<OfferType, string> = {
    cpa_lead: "CPA Lead",
    cpa_sale: "CPA Sale",
    affiliate: "Affiliate",
  };
  return labels[type];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatEpc(value: number): string {
  return `$${value.toFixed(2)}`;
}
