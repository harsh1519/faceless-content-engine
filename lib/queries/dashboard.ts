import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Channel,
  ContentObject,
  Conversion,
  Lead,
  Offer,
} from "@/lib/supabase/types";

export interface DashboardRawData {
  conversions: Conversion[];
  leads: Lead[];
  publishedContent: ContentObject[];
  channels: Channel[];
  failedContent: ContentObject[];
  pausedOffers: Offer[];
  lowHealthChannels: Channel[];
}

export async function fetchDashboardData(
  supabase: SupabaseClient
): Promise<DashboardRawData> {
  const [
    conversionsRes,
    leadsRes,
    publishedRes,
    channelsRes,
    failedRes,
    pausedOffersRes,
    lowHealthRes,
  ] = await Promise.all([
    supabase.from("conversions").select("*").order("occurred_at", { ascending: true }),
    supabase.from("leads").select("*"),
    supabase
      .from("content_objects")
      .select("*")
      .eq("status", "published"),
    supabase.from("channels").select("*"),
    supabase.from("content_objects").select("*").eq("status", "failed"),
    supabase.from("offers").select("*").eq("status", "paused"),
    supabase.from("channels").select("*").lt("health_score", 50),
  ]);

  const firstError =
    conversionsRes.error ??
    leadsRes.error ??
    publishedRes.error ??
    channelsRes.error ??
    failedRes.error ??
    pausedOffersRes.error ??
    lowHealthRes.error;

  if (firstError) throw firstError;

  return {
    conversions: conversionsRes.data ?? [],
    leads: leadsRes.data ?? [],
    publishedContent: publishedRes.data ?? [],
    channels: channelsRes.data ?? [],
    failedContent: failedRes.data ?? [],
    pausedOffers: pausedOffersRes.data ?? [],
    lowHealthChannels: lowHealthRes.data ?? [],
  };
}

export interface KpiMetric {
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  label: string;
}

export interface DashboardAlert {
  id: string;
  type: "channel" | "content" | "offer";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function sumRevenue(conversions: Conversion[], from: Date, to?: Date): number {
  return conversions.reduce((sum, row) => {
    const at = new Date(row.occurred_at);
    if (at < from) return sum;
    if (to && at >= to) return sum;
    return sum + Number(row.revenue);
  }, 0);
}

function sumClicks(conversions: Conversion[], from: Date, to?: Date): number {
  return conversions.reduce((sum, row) => {
    const at = new Date(row.occurred_at);
    if (at < from) return sum;
    if (to && at >= to) return sum;
    return sum + row.click_count;
  }, 0);
}

function countLeadsInRange(leads: Lead[], from: Date, to?: Date): number {
  return leads.filter((lead) => {
    const at = new Date(lead.created_at);
    if (at < from) return false;
    if (to && at >= to) return false;
    return true;
  }).length;
}

function calcTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEpc(revenue: number, clicks: number): string {
  if (clicks === 0) return "$0.00";
  return `$${(revenue / clicks).toFixed(2)}`;
}

export function computeKpis(data: DashboardRawData): KpiMetric[] {
  const now = new Date();
  const last7 = daysAgo(7);
  const prev7Start = daysAgo(14);
  const today = startOfDay(now);
  const yesterday = daysAgo(1);

  const totalRevenue = data.conversions.reduce(
    (sum, c) => sum + Number(c.revenue),
    0
  );
  const revenue7d = sumRevenue(data.conversions, last7);
  const revenuePrev7d = sumRevenue(data.conversions, prev7Start, last7);

  const totalLeads = data.leads.length;
  const leads7d = countLeadsInRange(data.leads, last7);
  const leadsPrev7d = countLeadsInRange(data.leads, prev7Start, last7);

  const postsToday = data.publishedContent.filter(
    (c) => c.published_at && isSameDay(new Date(c.published_at), today)
  ).length;
  const postsYesterday = data.publishedContent.filter(
    (c) => c.published_at && isSameDay(new Date(c.published_at), yesterday)
  ).length;

  const totalClicks = data.conversions.reduce((sum, c) => sum + c.click_count, 0);
  const totalRev = data.conversions.reduce((sum, c) => sum + Number(c.revenue), 0);
  const avgEpc = totalClicks > 0 ? totalRev / totalClicks : 0;

  const clicks7d = sumClicks(data.conversions, last7);
  const rev7dForEpc = sumRevenue(data.conversions, last7);
  const epc7d = clicks7d > 0 ? rev7dForEpc / clicks7d : 0;

  const clicksPrev7d = sumClicks(data.conversions, prev7Start, last7);
  const revPrev7dForEpc = sumRevenue(data.conversions, prev7Start, last7);
  const epcPrev7d = clicksPrev7d > 0 ? revPrev7dForEpc / clicksPrev7d : 0;

  return [
    {
      label: "Revenue",
      value: formatCurrency(totalRevenue),
      trend: calcTrend(revenue7d, revenuePrev7d),
      trendLabel: "vs prior 7 days",
    },
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString(),
      trend: calcTrend(leads7d, leadsPrev7d),
      trendLabel: "vs prior 7 days",
    },
    {
      label: "Posts Today",
      value: postsToday.toString(),
      trend: calcTrend(postsToday, postsYesterday),
      trendLabel: "vs yesterday",
    },
    {
      label: "Average EPC",
      value: formatEpc(totalRev, totalClicks),
      trend: calcTrend(epc7d, epcPrev7d),
      trendLabel: "vs prior 7 days",
    },
  ];
}

export function computeRevenueSeries(
  conversions: Conversion[]
): RevenueDataPoint[] {
  const today = startOfDay(new Date());
  const points: RevenueDataPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const revenue = conversions.reduce((sum, row) => {
      const at = new Date(row.occurred_at);
      if (at >= day && at < nextDay) {
        return sum + Number(row.revenue);
      }
      return sum;
    }, 0);

    points.push({
      date: day.toISOString().slice(0, 10),
      revenue,
      label: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    });
  }

  return points;
}

export function computeAlerts(data: DashboardRawData): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const channel of data.lowHealthChannels) {
    alerts.push({
      id: `channel-${channel.channel_id}`,
      type: "channel",
      title: channel.name,
      description: `Health score ${channel.health_score} — below 50 threshold`,
      actionLabel: "Review Channel",
      href: "/channels",
    });
  }

  for (const content of data.failedContent) {
    alerts.push({
      id: `content-${content.video_id}`,
      type: "content",
      title: "Failed render",
      description: content.script.slice(0, 80) + (content.script.length > 80 ? "…" : ""),
      actionLabel: "Fix in Pipeline",
      href: "/pipeline",
    });
  }

  for (const offer of data.pausedOffers) {
    alerts.push({
      id: `offer-${offer.offer_id}`,
      type: "offer",
      title: offer.name,
      description: `${offer.vertical} offer paused — ${formatCurrency(Number(offer.payout))} payout`,
      actionLabel: "Manage Offer",
      href: "/offers",
    });
  }

  return alerts;
}
