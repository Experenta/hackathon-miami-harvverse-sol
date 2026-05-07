import React from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { Button } from "@/components/ui";

export function AccountFeatureConnect() {
	const { account, connect } = useMobileWallet();

	return (
		<Button
			disabled={!!account}
			title="Connect wallet"
			variant="accent"
			onPress={connect}
		/>
	);
}
