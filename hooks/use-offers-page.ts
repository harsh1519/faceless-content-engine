"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/lib/toast";
import type { OfferStatus } from "@/lib/supabase/types";
import {
  createOffer,
  fetchOffersWithStats,
  type CreateOfferInput,
  type OfferWithStats,
  updateOfferStatus,
} from "@/lib/queries/offers-page";

export function useOffersWithStats() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["offers-with-stats"],
    queryFn: () => fetchOffersWithStats(supabase),
  });
}

export function useCreateOffer() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOfferInput) => createOffer(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toastSuccess("Offer created");
    },
    onError: toastError,
  });
}

export function useUpdateOfferStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      offerId,
      status,
    }: {
      offerId: string;
      status: OfferStatus;
    }) => updateOfferStatus(supabase, offerId, status),
    onMutate: async ({ offerId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["offers-with-stats"] });
      const previous = queryClient.getQueryData<OfferWithStats[]>([
        "offers-with-stats",
      ]);

      queryClient.setQueryData<OfferWithStats[]>(
        ["offers-with-stats"],
        (old) =>
          old?.map((offer) =>
            offer.offer_id === offerId ? { ...offer, status } : offer
          )
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["offers-with-stats"], context.previous);
      }
      toastError(err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["offers-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onSuccess: (_data, vars) =>
      toastSuccess(
        vars.status === "active" ? "Offer activated" : "Offer paused"
      ),
  });
}
