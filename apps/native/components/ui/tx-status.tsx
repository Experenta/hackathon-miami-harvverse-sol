import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export type TxState = "pending" | "confirmed" | "failed";

interface TxStatusProps {
	state: TxState;
	signature?: string | null;
	errorMessage?: string | null;
}

export function TxStatus({ state, signature, errorMessage }: TxStatusProps) {
	return (
		<View style={[styles.container, stateStyles[state]]}>
			{state === "pending" && (
				<>
					<ActivityIndicator size="small" color="#15803d" />
					<View style={styles.textContainer}>
						<Text style={styles.pendingTitle}>
							Transaction pending…
						</Text>
						{signature && (
							<Text style={styles.signature} numberOfLines={1}>
								{signature}
							</Text>
						)}
					</View>
				</>
			)}

			{state === "confirmed" && (
				<>
					<Text style={styles.icon}>✓</Text>
					<View style={styles.textContainer}>
						<Text style={styles.confirmedTitle}>
							Transaction confirmed
						</Text>
						{signature && (
							<Text style={styles.signature} numberOfLines={1}>
								{signature}
							</Text>
						)}
					</View>
				</>
			)}

			{state === "failed" && (
				<>
					<Text style={styles.icon}>✗</Text>
					<View style={styles.textContainer}>
						<Text style={styles.failedTitle}>
							Transaction failed
						</Text>
						{errorMessage && (
							<Text style={styles.errorMessage} numberOfLines={2}>
								{errorMessage}
							</Text>
						)}
					</View>
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		borderRadius: 8,
		padding: 12,
	},
	textContainer: {
		flex: 1,
		gap: 2,
	},
	icon: {
		fontSize: 18,
		fontWeight: "bold",
	},
	pendingTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#15803d",
	},
	confirmedTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#15803d",
	},
	failedTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#dc2626",
	},
	signature: {
		fontSize: 12,
		color: "#6b7280",
		fontFamily: "monospace",
	},
	errorMessage: {
		fontSize: 12,
		color: "#dc2626",
	},
});

const stateStyles = StyleSheet.create({
	pending: {
		backgroundColor: "#f0fdf4",
	},
	confirmed: {
		backgroundColor: "#f0fdf4",
	},
	failed: {
		backgroundColor: "#fef2f2",
	},
});
