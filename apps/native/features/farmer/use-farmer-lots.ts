import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { useMobileWallet } from "@wallet-ui/react-native-kit";

/**
 * Hook that queries the farmer's lots from Convex.
 * Returns the lot list and loading state.
 */
export function useFarmerLots() {
  const { account } = useMobileWallet();
  const wallet = account?.address?.toString() ?? "";

  const lots = useQuery(api.lots.listByFarmer, wallet ? { wallet } : "skip");

  return {
    lots: lots ?? [],
    isLoading: lots === undefined,
  };
}
