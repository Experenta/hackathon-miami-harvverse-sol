"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PropsWithChildren } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: PropsWithChildren) {
  if (!convex) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Missing NEXT_PUBLIC_CONVEX_URL; Convex is not connected.");
    }
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
