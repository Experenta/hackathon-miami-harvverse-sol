"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { PropsWithChildren } from "react";
import { ConvexClientProvider } from "../lib/convex/client-provider";
import { ClusterProvider } from "./cluster-context";
import { WalletProvider } from "../lib/wallet/context";
import { SolanaClientProvider } from "../lib/solana-client-context";
import { RoleProvider } from "../lib/role-context";

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <ConvexClientProvider>
        <ClusterProvider>
          <SolanaClientProvider>
            <WalletProvider>
              <RoleProvider>{children}</RoleProvider>
            </WalletProvider>
          </SolanaClientProvider>
          <Toaster position="bottom-right" richColors />
        </ClusterProvider>
      </ConvexClientProvider>
    </ThemeProvider>
  );
}
