import { Stack } from "expo-router";
import { RoleGuard } from "@/components/role-guard";

export default function PartnerLayout() {
	return (
		<RoleGuard requiredRole="partner">
			<Stack screenOptions={{ headerShown: false }} />
		</RoleGuard>
	);
}
