import React from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { Button } from "@/components/ui";

export function AccountFeatureDisconnect() {
  const { account, disconnect } = useMobileWallet();

  return (
    <Button
      disabled={!account}
      title="Disconnect wallet"
      variant="secondary"
      onPress={disconnect}
    />
  );
}
