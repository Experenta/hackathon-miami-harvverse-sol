"use client";

import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";

export function useLotCatalog() {
  const lots = useQuery(api.lots.listPublished);

  return {
    lots: lots ?? [],
    isLoading: lots === undefined,
  };
}
