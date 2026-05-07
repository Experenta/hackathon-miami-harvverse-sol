import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PropsWithChildren } from "react";
import { Badge, Banner, Screen, ScreenHeader } from "@/components/ui";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl
	? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
	: null;

export function ConvexClientProvider({ children }: PropsWithChildren) {
	if (!convex) {
		console.warn("Missing EXPO_PUBLIC_CONVEX_URL; Convex is not connected.");
		return (
			<Screen contentContainerStyle={{ justifyContent: "center" }}>
				<ScreenHeader
					eyebrow="Backend"
					title="Convex is not configured"
					subtitle="Set EXPO_PUBLIC_CONVEX_URL in apps/native/.env.local and restart Expo."
					trailing={<Badge label="Blocking" tone="warning" />}
				/>
				<Banner
					tone="warning"
					title="Native shell loaded without backend"
					description="The Android UI theme is active, but Convex queries and mutations are intentionally unavailable until the environment variable is set."
				/>
			</Screen>
		);
	}

	return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
