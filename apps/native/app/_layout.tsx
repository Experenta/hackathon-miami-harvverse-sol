import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { AppProviders } from "@/components/app-providers";

export default function RootLayout() {
	return (
		<AppProviders>
			<Stack>
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen
					name="connect-wallet"
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="role-select"
					options={{ title: "Select Role", headerBackVisible: false }}
				/>
				<Stack.Screen
					name="(farmer)"
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="(partner)"
					options={{ headerShown: false }}
				/>
			</Stack>
			<StatusBar style="auto" />
		</AppProviders>
	);
}
