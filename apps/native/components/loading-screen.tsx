import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LoadingScreenProps {
	message?: string;
}

export function LoadingScreen({ message = "Loading…" }: LoadingScreenProps) {
	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#16a34a" />
				<Text style={styles.message}>{message}</Text>
			</View>
		</SafeAreaView>
	);
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
		gap: 12,
	},
	message: {
		fontSize: 16,
		color: "#6b7280",
	},
});
