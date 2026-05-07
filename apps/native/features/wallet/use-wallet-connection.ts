import { useCallback } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMutation } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";

/**
 * Wraps MWA authorize/deauthorize and calls the Convex upsert mutation
 * on successful connection so the user record is created/updated.
 */
export function useWalletConnection() {
  const { account, connect, disconnect } = useMobileWallet();
  const upsertUser = useMutation(api.users.upsertAfterWalletConnect);

  const handleConnect = useCallback(async () => {
    await connect();
    // account is updated asynchronously by MWA; the upsert is triggered
    // from the connect-wallet screen once account is available.
  }, [connect]);

  const handleConnectAndUpsert = useCallback(
    async (walletAddress: string) => {
      await upsertUser({ wallet: walletAddress });
    },
    [upsertUser],
  );

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  return {
    account,
    connect: handleConnect,
    connectAndUpsert: handleConnectAndUpsert,
    disconnect: handleDisconnect,
    isConnected: !!account,
  };
}
