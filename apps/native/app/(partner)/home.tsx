import { FlatList, Text, TouchableOpacity, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import {
	Banner,
	Button,
	ListItemCard,
	MetricCard,
	Screen,
} from "@/components/ui";
import { AiChatPanel } from "@/features/agent/ai-chat-panel";
import { usePartnerships } from "@/features/partner/use-partnership";
import { useRole } from "@/features/role/use-role";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function PartnerHomeScreen() {
	const { account } = useMobileWallet();
	const { rolePda } = useRole();
	const { partnerships, isLoading } = usePartnerships();
	const router = useRouter();
	const { theme } = useTheme();
	const wallet = account?.address?.toString() ?? "";

	const reservedCount = partnerships.filter(
		(partnership) => partnership.status === "reserved",
	).length;
	const activeCount = partnerships.filter(
		(partnership) => partnership.status === "active",
	).length;
	const settledCount = partnerships.filter(
		(partnership) => partnership.status === "settled",
	).length;

	return (
		<Screen contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
			<FlatList
				data={partnerships}
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
												color: "#67B9C1",
												letterSpacing: 1.2,
												textTransform: "uppercase",
											},
										]}
									>
										Partner
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
										Partnerships
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
											"rgba(103, 185, 193, 0.08)",
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
											backgroundColor: "#67B9C1",
										}}
									/>
									<Text
										style={[
											theme.typography.caption,
											{ color: "#67B9C1" },
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
									tone="partner"
									eyebrow="Pipeline"
									label="Positions"
									value={String(partnerships.length)}
									helper={`${reservedCount} reserved`}
									style={{ minWidth: 100 }}
								/>
								<MetricCard
									tone="success"
									eyebrow="Active"
									label="In cycle"
									value={String(activeCount)}
									helper={`${settledCount} settled`}
									style={{ minWidth: 100 }}
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
					<ListItemCard
						accessibilityLabel={`Partnership for lot ${item.lotCode}`}
						onPress={() =>
							router.push(
								`/(partner)/partnerships/${item._id}/settlement` as Href,
							)
						}
						tone="partner"
						eyebrow={item.lotCode}
						title={`Lot ${item.lotCode}`}
						subtitle={`Farmer ${ellipsify(item.farmerWallet)}`}
						status={mapPartnerStatus(item.status)}
						badges={[
							{
								label: item.partnershipPda
									? "On-chain"
									: "Pending",
								tone: item.partnershipPda ? "info" : "neutral",
							},
						]}
						details={[
							{
								label: "Farmer",
								value: ellipsify(item.farmerWallet),
							},
						]}
					/>
				)}
			/>
		</Screen>
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
