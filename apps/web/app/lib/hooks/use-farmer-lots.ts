"use client";

import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { useWallet } from "../wallet/context";

export function useFarmerLots() {
  const { wallet } = useWallet();
  const address = wallet?.account.address?.toString() ?? "";

  const lots = useQuery(
    api.lots.listByFarmer,
    address ? { wallet: address } : "skip",
  );

  return {
    lots: lots ?? [],
    isLoading: lots === undefined,
  };
}
