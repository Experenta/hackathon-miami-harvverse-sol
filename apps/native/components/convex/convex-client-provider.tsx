import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PropsWithChildren } from "react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export function ConvexClientProvider({ children }: PropsWithChildren) {
  if (!convex) {
    console.warn("Missing EXPO_PUBLIC_CONVEX_URL; Convex is not connected.");
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
