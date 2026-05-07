import { Stack } from "expo-router";
import { RoleGuard } from "@/components/role-guard";

export default function PartnerLayout() {
	return (
		<RoleGuard requiredRole="partner">
			<Stack>
				<Stack.Screen name="home" options={{ headerShown: false }} />
				<Stack.Screen
					name="profile"
					options={{ title: "My Profile" }}
				/>
				<Stack.Screen
					name="catalog"
					options={{ title: "Lot Catalog" }}
				/>
				<Stack.Screen
					name="lots/[lotCode]/index"
					options={{ title: "Lot Details" }}
				/>
				<Stack.Screen
					name="lots/[lotCode]/reserve"
					options={{ title: "Reserve Partnership" }}
				/>
				<Stack.Screen
					name="partnerships/[partnershipId]/index"
					options={{ title: "Partnership" }}
				/>
				<Stack.Screen
					name="partnerships/[partnershipId]/settlement"
					options={{ title: "Settlement Preview" }}
				/>
			</Stack>
		</RoleGuard>
	);
}
