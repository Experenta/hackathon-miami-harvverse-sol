import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";

/**
 * Hook that queries all published lots from Convex for the partner catalog.
 * Returns the lot list and loading state.
 */
export function useLotCatalog() {
  const lots = useQuery(api.lots.listPublished);

  return {
    lots: lots ?? [],
    isLoading: lots === undefined,
  };
}
