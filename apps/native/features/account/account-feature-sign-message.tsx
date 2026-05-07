import { useState } from "react";
import { Text, View } from "react-native";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { Address } from "@solana/kit";
import { Banner, Button, Card } from "@/components/ui";
import { useTheme } from "@/theme";

export function AccountFeatureSignMessage({ address }: { address: Address }) {
	const { signMessages } = useMobileWallet();
	const { theme } = useTheme();
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

	async function submit() {
		try {
			await signMessages(
				new TextEncoder().encode(`Signing a message with ${address}`),
			);
			setStatus("success");
			console.log("Message signed!");
		} catch (e) {
			setStatus("error");
			console.log(`Error signing message: ${e}`);
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
					Message signature
				</Text>
				<Text
					style={[
						theme.typography.bodySm,
						{ color: theme.colors.text.secondary },
					]}
				>
					Uses the connected wallet to sign an arbitrary message for testing.
				</Text>
			</Card>
			<Button onPress={submit} title="Sign message" />
			{status === "success" ? (
				<Banner
					tone="success"
					title="Message signed"
					description="The wallet returned a signed message payload."
				/>
			) : null}
			{status === "error" ? (
				<Banner
					tone="error"
					title="Message signing failed"
					description="The wallet did not complete the message signature request."
				/>
			) : null}
		</View>
	);
}
