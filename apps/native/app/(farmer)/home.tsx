import { FlatList, Text, TouchableOpacity, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { formatMockUsdcBaseUnits } from "@repo/solana-client";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import {
	Banner,
	Button,
	ListItemCard,
	MetricCard,
	Screen,
	Section,
} from "@/components/ui";
import { useFarmerLots } from "@/features/farmer/use-farmer-lots";
import { useFarmerPartnerships } from "@/features/partner/use-partnership";
import { useRole } from "@/features/role/use-role";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function FarmerHomeScreen() {
	const { rolePda } = useRole();
	const { lots, isLoading } = useFarmerLots();
	const { partnerships, isLoading: isLoadingPartnerships } =
		useFarmerPartnerships();
	const router = useRouter();
	const { theme } = useTheme();

	const activeLots = lots.filter((lot) =>
		["published", "reserved", "in_cycle"].includes(lot.status),
	).length;
	const totalTicketUsdcCents = lots.reduce(
		(total, lot) => total + lot.ticketUsdcCents,
		0,
	);
	const fundedPartnerships = partnerships.filter((partnership) =>
		Boolean(partnership.fundingTx),
	);
	const totalEscrowedBaseUnits = fundedPartnerships.reduce(
		(total, partnership) =>
			total + BigInt(partnership.depositedAmountBaseUnits ?? 0),
		0n,
	);

	return (
		<Screen contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
			<FlatList
				data={lots}
				style={{ flex: 1 }}
				keyExtractor={(item) => item._id}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					gap: theme.spacing.md,
					paddingBottom: theme.spacing.xl,
				}}
				ListHeaderComponent={
					<View style={{ gap: theme.spacing.lg }}>
						{/* Header row */}
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
									{rolePda ? (
										<Text
											style={[
												theme.typography.caption,
												{
													color: theme.colors.text
														.brand,
												},
											]}
										>
											Farmer · {ellipsify(rolePda, 4)}
										</Text>
									) : null}
								</View>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										gap: theme.spacing.sm,
									}}
								>
									<TouchableOpacity
										accessibilityLabel="Edit profile"
										accessibilityRole="button"
										onPress={() =>
											router.push(
												"/(farmer)/profile" as Href,
											)
										}
										style={{
											width: 36,
											height: 36,
											borderRadius: 18,
											backgroundColor:
												theme.colors.surface.subtle,
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<MaterialIcons
											name="person-outline"
											size={18}
											color={theme.colors.text.muted}
										/>
									</TouchableOpacity>
									<DisconnectWalletButton />
								</View>
							</View>
						</Animated.View>

						{/* Metrics — 2 cards, clean */}
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
									label="Lots"
									value={String(lots.length)}
									helper={`${activeLots} live`}
									style={{ flex: 1 }}
								/>
								<MetricCard
									tone="success"
									eyebrow="Capital"
									label="Ticketed"
									value={formatUsd(totalTicketUsdcCents)}
									helper={
										fundedPartnerships.length > 0
											? `${formatMockUsdcBaseUnits(totalEscrowedBaseUnits)} escrowed`
											: "No escrow yet"
									}
									style={{ flex: 1 }}
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

						{/* Funded partnerships — compact inline list */}
						{fundedPartnerships.length > 0 ? (
							<Animated.View
								entering={FadeInUp.delay(85).duration(200)}
							>
								<Section title="Funded partnerships">
									<View style={{ gap: theme.spacing.sm }}>
										{fundedPartnerships.map(
											(partnership) => (
												<ListItemCard
													key={partnership._id}
													accessibilityLabel={`Funded partnership for ${partnership.lotCode}`}
													onPress={() =>
														router.push(
															`/(farmer)/partnerships/${partnership._id}` as Href,
														)
													}
													tone="farmer"
													eyebrow={
														partnership.lotCode
													}
													title={`Lot ${partnership.lotCode}`}
													subtitle={`Partner ${ellipsify(partnership.partnerWallet)}`}
													status={mapFarmerStatus(
														"in_cycle",
													)}
													highlight={{
														label: "Funded",
														value: formatMockUsdcBaseUnits(
															partnership.depositedAmountBaseUnits ??
																0,
														),
													}}
													details={[
														{
															label: "Released",
															value: formatMockUsdcBaseUnits(
																partnership.releasedAmountBaseUnits ??
																	0,
															),
														},
													]}
												/>
											),
										)}
									</View>
								</Section>
							</Animated.View>
						) : isLoadingPartnerships ? (
							<Animated.View
								entering={FadeIn.delay(85).duration(150)}
							>
								<Banner
									tone="info"
									title="Loading partnerships"
									description="Checking for active escrow positions."
								/>
							</Animated.View>
						) : null}

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
							label: "Ticket",
							value: formatUsd(item.ticketUsdcCents),
						}}
						badges={[{ label: item.variety, tone: "brand" }]}
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
	return `${(cents / 100).toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;
}
