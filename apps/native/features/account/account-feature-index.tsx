import { View } from "react-native";
import React from "react";
import { AccountFeatureGetBalance } from "@/features/account/account-feature-get-balance";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { AccountFeatureSignMessage } from "@/features/account/account-feature-sign-message";
import { AccountFeatureSignTransaction } from "@/features/account/account-feature-sign-transaction";
import { AccountFeatureSignIn } from "@/features/account/account-feature-sign-in";
import { AccountFeatureDisconnect } from "@/features/account/account-feature-disconnect";
import { AccountFeatureConnect } from "@/features/account/account-feature-connect";
import { Banner, Card, DetailRow, Section, StatusPill } from "@/components/ui";
import { useTheme } from "@/theme";

export function AccountFeatureIndex() {
	const { account } = useMobileWallet();
	const { theme } = useTheme();

	return (
		<View style={{ gap: theme.spacing.lg }}>
			<Section
				title="Account"
				description="Wallet utility actions and signature checks live here."
				aside={
					<StatusPill
						label={account ? "Connected" : "Disconnected"}
						tone={account ? "success" : "warning"}
					/>
				}
			>
				<Card variant={account ? "success" : "warning"}>
					<DetailRow
						label="Wallet"
						value={account?.label ?? "No wallet connected"}
						valueTone="secondary"
					/>
					{account ? (
						<AccountFeatureGetBalance address={account.address} />
					) : null}
				</Card>
			</Section>
			{account ? (
				<View style={{ gap: theme.spacing.md }}>
					<AccountFeatureSignIn account={account} />
					<AccountFeatureSignMessage address={account.address} />
					<AccountFeatureSignTransaction address={account.address} />
					<AccountFeatureDisconnect />
				</View>
			) : (
				<View style={{ gap: theme.spacing.md }}>
					<Banner
						tone="info"
						title="Connect a wallet first"
						description="The signature test tools activate once a mobile wallet session is available."
					/>
					<AccountFeatureConnect />
					<AccountFeatureSignIn />
				</View>
			)}
		</View>
	);
}
