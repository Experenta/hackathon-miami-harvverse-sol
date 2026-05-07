import { useState } from "react";
import { Text, View } from "react-native";
import { Account, useMobileWallet } from "@wallet-ui/react-native-kit";
import { Banner, Button, Card } from "@/components/ui";
import { useTheme } from "@/theme";

export function AccountFeatureSignIn({ account }: { account?: Account }) {
	const { chain, identity, signIn } = useMobileWallet();
	const { theme } = useTheme();
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

	async function submit() {
		try {
			await signIn({
				address: account?.address.toString(),
				chainId: chain,
				uri: identity.uri,
			});
			setStatus("success");
			console.log("Signed in!");
		} catch (e) {
			setStatus("error");
			console.log(`Error signing in: ${e}`);
		}
	}

	return (
		<View style={{ gap: theme.spacing.sm }}>
			<Card variant="muted">
				<Text
					style={[
						theme.typography.labelMd,
						{ color: theme.colors.text.primary },
					]}
				>
					Wallet sign-in
				</Text>
				<Text
					style={[
						theme.typography.bodySm,
						{ color: theme.colors.text.secondary },
					]}
				>
					Requests an authenticated wallet session using the current mobile wallet provider.
				</Text>
			</Card>
			<Button
				onPress={submit}
				title={account ? `Sign In as ${account.label}` : "Sign In and connect"}
			/>
			{status === "success" ? (
				<Banner
					tone="success"
					title="Sign-in approved"
					description="The wallet accepted the sign-in request."
				/>
			) : null}
			{status === "error" ? (
				<Banner
					tone="error"
					title="Sign-in failed"
					description="The wallet rejected the sign-in request or could not complete it."
				/>
			) : null}
		</View>
	);
}
