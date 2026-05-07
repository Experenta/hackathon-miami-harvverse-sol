import { FlatList, Text, TouchableOpacity, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import {
	formatMockUsdcBaseUnits,
	usdcCentsToMockUsdcBaseUnits,
} from "@repo/solana-client";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import {
	Badge,
	Banner,
	Button,
	ListItemCard,
	MetricCard,
	Screen,
} from "@/components/ui";
import { AiChatPanel } from "@/features/agent/ai-chat-panel";
import { usePartnerships } from "@/features/partner/use-partnership";
import { usePartnershipEscrowBalances } from "@/features/partner/use-mock-usdc";
import { useRole } from "@/features/role/use-role";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

type PartnerPartnership = ReturnType<
	typeof usePartnerships
>["partnerships"][number];

export default function PartnerHomeScreen() {
	const { account } = useMobileWallet();
	const { rolePda } = useRole();
	const { partnerships, isLoading } = usePartnerships();
	const router = useRouter();
	const { theme } = useTheme();
	const wallet = account?.address?.toString() ?? "";

	const activeCount = partnerships.filter(
		(partnership) => partnership.status === "active",
	).length;
	const fundedCount = partnerships.filter((partnership) =>
		Boolean(partnership.fundingTx),
	).length;
	const totalFundedBaseUnits = partnerships.reduce((total, partnership) => {
		if (partnership.depositedAmountBaseUnits) {
			return total + BigInt(partnership.depositedAmountBaseUnits);
		}
		if (partnership.ticketUsdcCents) {
			return (
				total +
				usdcCentsToMockUsdcBaseUnits(partnership.ticketUsdcCents)
			);
		}
		return total;
	}, 0n);

	return (
		<Screen contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
			<FlatList
				data={partnerships}
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
										Partnerships
									</Text>
									{rolePda ? (
										<Text
											style={[
												theme.typography.caption,
												{ color: "#67B9C1" },
											]}
										>
											Partner · {ellipsify(rolePda, 4)}
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
												"/(partner)/profile" as Href,
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

						{/* Metrics — 2 cards instead of 3 */}
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
									tone="partner"
									eyebrow="Portfolio"
									label="Positions"
									value={String(partnerships.length)}
									helper={`${activeCount} active`}
									style={{ flex: 1 }}
								/>
								<MetricCard
									tone="success"
									eyebrow="Capital"
									label="Deployed"
									value={formatMockUsdcBaseUnits(
										totalFundedBaseUnits,
									)}
									helper={`${fundedCount} funded`}
									style={{ flex: 1 }}
								/>
							</View>
						</Animated.View>

						{/* Browse action */}
						<Animated.View
							entering={FadeInUp.delay(75).duration(200)}
						>
							<Button
								title="Browse Lots"
								variant="accent"
								onPress={() =>
									router.push("/(partner)/catalog" as Href)
								}
							/>
						</Animated.View>

						{/* AI assistant */}
						{wallet ? (
							<Animated.View
								entering={FadeInUp.delay(90).duration(200)}
							>
								<AiChatPanel
									wallet={wallet}
									role="partner"
									description="Ask about your positions or the current catalog."
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
								My partnerships
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
							title="Loading partnerships"
							description="Fetching your positions."
						/>
					) : (
						<Banner
							tone="accent"
							title="No partnerships yet"
							description="Browse the catalog to reserve your first opportunity."
						/>
					)
				}
				renderItem={({ item }) => (
					<PartnerPartnershipCard
						item={item}
						onPress={() =>
							router.push(
								`/(partner)/partnerships/${item._id}` as Href,
							)
						}
					/>
				)}
			/>
		</Screen>
	);
}

function PartnerPartnershipCard({
	item,
	onPress,
}: {
	item: PartnerPartnership;
	onPress: () => void;
}) {
	const escrow = usePartnershipEscrowBalances({
		partnershipPda: item.partnershipPda,
		partnerWallet: item.partnerWallet,
		farmerWallet: item.farmerWallet,
	});

	const depositedBaseUnits =
		escrow.data?.depositedAmountBaseUnits ??
		(item.depositedAmountBaseUnits != null
			? BigInt(item.depositedAmountBaseUnits)
			: item.ticketUsdcCents != null
				? usdcCentsToMockUsdcBaseUnits(item.ticketUsdcCents)
				: 0n);
	const releasedBaseUnits =
		escrow.data?.releasedAmountBaseUnits ??
		BigInt(item.releasedAmountBaseUnits ?? 0);

	return (
		<ListItemCard
			accessibilityLabel={`Partnership for lot ${item.lotCode}`}
			onPress={onPress}
			tone="partner"
			eyebrow={item.lotCode}
			title={`Lot ${item.lotCode}`}
			subtitle={`Farmer ${ellipsify(item.farmerWallet)}`}
			status={mapPartnerStatus(item.status)}
			highlight={{
				label: item.fundingTx ? "Funded" : "Pending",
				value:
					depositedBaseUnits > 0n
						? formatMockUsdcBaseUnits(depositedBaseUnits)
						: "Awaiting escrow",
			}}
			badges={[
				{
					label: item.partnershipPda ? "On-chain" : "Pending",
					tone: item.partnershipPda ? "info" : "neutral",
				},
			]}
			details={[
				{
					label: "Released",
					value: formatMockUsdcBaseUnits(releasedBaseUnits),
				},
			]}
		/>
	);
}

function mapPartnerStatus(status: string) {
	switch (status) {
		case "active":
			return { label: status, tone: "success" as const };
		case "settled":
			return { label: status, tone: "accent" as const };
		case "cancelled":
			return { label: status, tone: "error" as const };
		case "reserved":
		default:
			return { label: status, tone: "info" as const };
	}
}
