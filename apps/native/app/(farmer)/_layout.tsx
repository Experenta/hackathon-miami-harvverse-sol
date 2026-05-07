import { Stack } from "expo-router";
import { RoleGuard } from "@/components/role-guard";

export default function FarmerLayout() {
	return (
		<RoleGuard requiredRole="farmer">
			<Stack>
				<Stack.Screen name="home" options={{ headerShown: false }} />
				<Stack.Screen
					name="profile"
					options={{ title: "My Profile" }}
				/>
				<Stack.Screen
					name="lots/index"
					options={{ title: "My Lots" }}
				/>
				<Stack.Screen
					name="lots/new"
					options={{ title: "Create Lot" }}
				/>
				<Stack.Screen
					name="lots/[lotCode]/edit"
					options={{ title: "Edit Lot" }}
				/>
				<Stack.Screen
					name="lots/[lotCode]/publish-review"
					options={{ title: "Publish Lot" }}
				/>
			</Stack>
		</RoleGuard>
	);
}
