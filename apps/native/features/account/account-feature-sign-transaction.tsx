import { useState } from "react";
import { Text, View } from "react-native";
import { getAddMemoInstruction } from "@solana-program/memo";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { Address, Instruction } from "@solana/kit";
import { Banner, Button, Card } from "@/components/ui";
import { useTheme } from "@/theme";

export function AccountFeatureSignTransaction({
	address,
}: {
	address: Address;
}) {
	const { sendTransactions } = useMobileWallet();
	const { theme } = useTheme();
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

	async function submit() {
		console.log("submit");
		try {
			const instructions: Instruction[] = [
				// You can add more instructions here
				getAddMemoInstruction({
					memo: `gm from Mobile Wallet Adapter - ${address}`,
				}),
			];

			const signature = await sendTransactions(instructions);

			setStatus("success");
			console.log(`Signed transaction: ${signature}!`);
		} catch (e) {
			setStatus("error");
			console.log(`Error signing transaction: ${e}`);
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
					Transaction signature
				</Text>
				<Text
					style={[
						theme.typography.bodySm,
						{ color: theme.colors.text.secondary },
					]}
				>
					Sends a lightweight memo instruction through the wallet to test transaction signing.
				</Text>
			</Card>
			<Button onPress={submit} title="Sign transaction" />
			{status === "success" ? (
				<Banner
					tone="success"
					title="Transaction signed"
					description="The wallet accepted the memo transaction request."
				/>
			) : null}
			{status === "error" ? (
				<Banner
					tone="error"
					title="Transaction signing failed"
					description="The wallet rejected the memo transaction or could not submit it."
				/>
			) : null}
		</View>
	);
}
