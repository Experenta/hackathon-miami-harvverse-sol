"use client";

import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { useWallet } from "../wallet/context";

export function usePartnerships() {
  const { wallet } = useWallet();
  const address = wallet?.account.address?.toString() ?? "";

  const partnerships = useQuery(
    api.partnerships.listByPartner,
    address ? { wallet: address } : "skip",
  );

  return {
    partnerships: partnerships ?? [],
    isLoading: partnerships === undefined,
  };
}
