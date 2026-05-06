import { useEffect, type PropsWithChildren } from "react";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRole } from "@/features/role/use-role";
import { LoadingScreen } from "@/components/loading-screen";

interface RoleGuardProps extends PropsWithChildren {
	/** The role required to access this route group. */
	requiredRole: "farmer" | "partner";
}

/**
 * Wraps a route group and enforces role-based access.
 *
 * - No wallet → redirect to /connect-wallet
 * - Loading role → show loading screen
 * - Wrong role → redirect to the correct dashboard
 * - No role → redirect to /role-select
 * - Correct role → render children
 */
export function RoleGuard({ requiredRole, children }: RoleGuardProps) {
	const router = useRouter();
	const { account } = useMobileWallet();
	const { role, isLoading } = useRole();

	useEffect(() => {
		// Wallet disconnected
		if (!account) {
			router.replace("/connect-wallet" as Href);
			return;
		}

		if (isLoading) return;

		// No role registered yet
		if (role === null) {
			router.replace("/role-select" as Href);
			return;
		}

		// Wrong role — redirect to the correct dashboard
		if (role !== requiredRole) {
			const destination =
				role === "farmer"
					? ("/(farmer)/home" as Href)
					: ("/(partner)/home" as Href);
			router.replace(destination);
		}
	}, [account, isLoading, role, requiredRole, router]);

	if (!account || isLoading) {
		return <LoadingScreen />;
	}

	if (role !== requiredRole) {
		return <LoadingScreen />;
	}

	return <>{children}</>;
}
