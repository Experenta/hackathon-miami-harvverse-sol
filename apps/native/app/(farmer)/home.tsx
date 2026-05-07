import { FlatList, Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import {
	ActionBar,
	Banner,
	Button,
	ListItemCard,
	MetricCard,
	Screen,
	Section,
} from "@/components/ui";
import { useFarmerLots } from "@/features/farmer/use-farmer-lots";
import { useRole } from "@/features/role/use-role";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function FarmerHomeScreen() {
	const { account } = useMobileWallet();
	const { rolePda } = useRole();
	const { lots, isLoading } = useFarmerLots();
	const router = useRouter();
	const { theme } = useTheme();

	const publishedLots = lots.filter(
		(lot) => lot.status === "published",
	).length;
	const activeLots = lots.filter((lot) =>
		["published", "reserved", "in_cycle"].includes(lot.status),
	).length;
	const totalTicketUsdcCents = lots.reduce(
		(total, lot) => total + lot.ticketUsdcCents,
		0,
	);

	return (
		<Screen contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
			<FlatList
				data={lots}
				style={{ flex: 1 }}
				keyExtractor={(item) => item._id}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					gap: theme.spacing.lg,
					paddingBottom: theme.spacing.xl,
				}}
				ListHeaderComponent={
					<View style={{ gap: theme.spacing.lg }}>
						{/* Compact header row */}
						<Animated.View entering={FadeInDown.duration(200)}>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<View style={{ gap: 2 }}>
									<Text
										style={[
											theme.typography.labelSm,
											{
												color: theme.colors.text.brand,
												letterSpacing: 1.2,
												textTransform: "uppercase",
											},
										]}
									>
										Farmer
									</Text>
									<Text
										style={[
											theme.typography.h1,
											{
												color: theme.colors.text
													.primary,
												fontSize: 26,
												lineHeight: 32,
											},
										]}
									>
										Portfolio
									</Text>
								</View>
								<DisconnectWalletButton />
							</View>
						</Animated.View>

						{/* Inline identity row */}
						{rolePda ? (
							<Animated.View
								entering={FadeIn.delay(75).duration(150)}
							>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										gap: theme.spacing.xs,
										backgroundColor:
											"rgba(147, 216, 50, 0.08)",
										borderRadius: theme.radius.sm,
										paddingHorizontal: theme.spacing.sm,
										paddingVertical: 6,
										alignSelf: "flex-start",
									}}
								>
									<View
										style={{
											width: 8,
											height: 8,
											borderRadius: 4,
											backgroundColor: "#93D832",
										}}
									/>
									<Text
										style={[
											theme.typography.caption,
											{ color: theme.colors.text.brand },
										]}
									>
										Role live · {ellipsify(rolePda, 4)}
									</Text>
								</View>
							</Animated.View>
						) : null}

						{/* Metrics row */}
						<Animated.View
							entering={FadeInUp.delay(50).duration(200)}
						>
							<View
								style={{
									flexDirection: "row",
									gap: theme.spacing.sm,
								}}
							>
								<MetricCard
									tone="farmer"
									eyebrow="Inventory"
									label="Total lots"
									value={String(lots.length)}
									helper={`${activeLots} live`}
									style={{ minWidth: 100 }}
								/>
								<MetricCard
									tone="success"
									eyebrow="Capital"
									label="Ticketed"
									value={formatUsd(totalTicketUsdcCents)}
									helper={`${publishedLots} published`}
									style={{ minWidth: 100 }}
								/>
							</View>
						</Animated.View>

						{/* Create action */}
						<Animated.View
							entering={FadeInUp.delay(75).duration(200)}
						>
							<Button
								title="Create Lot"
								onPress={() =>
									router.push("/(farmer)/lots/new" as Href)
								}
							/>
						</Animated.View>

						{/* List divider */}
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: theme.spacing.xs,
							}}
						>
							<View
								style={{
									flex: 1,
									height: 1,
									backgroundColor: theme.colors.border.subtle,
								}}
							/>
							<Text
								style={[
									theme.typography.labelSm,
									{
										color: theme.colors.text.muted,
										letterSpacing: 1,
										textTransform: "uppercase",
									},
								]}
							>
								My lots
							</Text>
							<View
								style={{
									flex: 1,
									height: 1,
									backgroundColor: theme.colors.border.subtle,
								}}
							/>
						</View>
					</View>
				}
				ListEmptyComponent={
					isLoading ? (
						<Banner
							tone="info"
							title="Loading lots"
							description="Fetching your inventory."
						/>
					) : (
						<Banner
							tone="success"
							title="No lots yet"
							description="Create your first lot to start building on-chain inventory."
						/>
					)
				}
				renderItem={({ item }) => (
					<ListItemCard
						accessibilityLabel={`Lot ${item.lotCode}`}
						onPress={() =>
							router.push(
								`/(farmer)/lots/${item.lotCode}/edit` as Href,
							)
						}
						tone="farmer"
						eyebrow={item.lotCode}
						title={item.farmName}
						subtitle={`${item.variety} · ${item.region}, ${item.country}`}
						status={mapFarmerStatus(item.status)}
						highlight={{
							label: "Ticket size",
							value: formatUsd(item.ticketUsdcCents),
						}}
						badges={[
							{ label: item.variety, tone: "brand" },
							{
								label: `${trimNumber(item.areaManzanas)} mz`,
								tone: "neutral",
							},
						]}
						details={[
							{
								label: "Split",
								value: `${item.farmerShareBps / 100}% / ${item.partnerShareBps / 100}%`,
								helper: "Farmer / Partner",
							},
						]}
					/>
				)}
			/>
		</Screen>
	);
}

function mapFarmerStatus(status: string) {
	switch (status) {
		case "published":
			return { label: status, tone: "success" as const };
		case "reserved":
			return { label: status, tone: "info" as const };
		case "in_cycle":
		case "settled":
			return {
				label: status.replace(/_/g, " "),
				tone: "accent" as const,
			};
		case "cancelled":
			return { label: status, tone: "error" as const };
		case "draft":
		default:
			return { label: status, tone: "farmer" as const };
	}
}

function formatUsd(cents: number) {
	return `$${(cents / 100).toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;
}

function trimNumber(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
