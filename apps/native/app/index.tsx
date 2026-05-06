import { useEffect } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRole } from "@/features/role/use-role";
import { LoadingScreen } from "@/components/loading-screen";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Root index screen — acts as a router:
 *
 * 1. No wallet connected  → redirect to /connect-wallet
 * 2. Wallet connected, fetching role → show loading screen
 * 3. Role fetch failed → show error with retry
 * 4. No role PDA → redirect to /role-select
 * 5. Farmer role → redirect to /(farmer)/home
 * 6. Partner role → redirect to /(partner)/home
 */
export default function IndexScreen() {
	const router = useRouter();
	const { account } = useMobileWallet();
	const { role, isLoading, error, refetch } = useRole();

	useEffect(() => {
		// No wallet — go to connect screen
		if (!account) {
			router.replace("/connect-wallet" as Href);
			return;
		}

		// Still loading — wait
		if (isLoading) return;

		// Error — stay on this screen to show retry UI
		if (error) return;

		// No role PDA — go to role selection
		if (role === null) {
			router.replace("/role-select" as Href);
			return;
		}

		// Route by role
		if (role === "farmer") {
			router.replace("/(farmer)/home" as Href);
		} else {
			router.replace("/(partner)/home" as Href);
		}
	}, [account, isLoading, error, role, router]);

	// No wallet — show nothing while redirect fires
	if (!account) {
		return null;
	}

	// Loading role PDA
	if (isLoading) {
		return <LoadingScreen message="Checking your on-chain role…" />;
	}

	// RPC error — show retry
	if (error) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.container}>
					<Text style={styles.errorTitle}>Could not fetch role</Text>
					<Text style={styles.errorMessage}>{error.message}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={refetch}
					>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Waiting for redirect to fire
	return <LoadingScreen />;
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: "#f9fafb",
	},
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
		gap: 12,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#dc2626",
	},
	errorMessage: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
	},
	retryButton: {
		backgroundColor: "#16a34a",
		paddingVertical: 12,
		paddingHorizontal: 28,
		borderRadius: 8,
		marginTop: 8,
	},
	retryText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "600",
	},
});
