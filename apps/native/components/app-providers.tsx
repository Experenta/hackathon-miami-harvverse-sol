import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { NetworkProvider } from "@/features/network/network-provider";
import { MobileWalletProvider } from "@wallet-ui/react-native-kit";
import { AppConfig } from "@/constants/app-config";
import { ConvexClientProvider } from "@/components/convex/convex-client-provider";

const queryClient = new QueryClient();
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConvexClientProvider>
        <NetworkProvider
          networks={AppConfig.networks}
          render={({ selectedNetwork }) => (
            <MobileWalletProvider
              cluster={selectedNetwork}
              identity={AppConfig.identity}
            >
              {children}
            </MobileWalletProvider>
          )}
        />
      </ConvexClientProvider>
    </QueryClientProvider>
  );
}
