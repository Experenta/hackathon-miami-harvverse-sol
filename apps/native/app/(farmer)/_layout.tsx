import { Stack } from "expo-router";
import { RoleGuard } from "@/components/role-guard";

export default function FarmerLayout() {
	return (
		<RoleGuard requiredRole="farmer">
			<Stack screenOptions={{ headerShown: false }} />
		</RoleGuard>
	);
}
