import { FlatList, View } from "react-native";
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
	ScreenHeader,
	Section,
} from "@/components/ui";
import { WalletAddressCard } from "@/components/wallet-address-card";
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
		<Screen contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
			<FlatList
				data={partnerships}
				style={{ flex: 1 }}
				keyExtractor={(item) => item._id}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					gap: theme.spacing.xl,
					paddingBottom: theme.spacing["2xl"],
				}}
				ListHeaderComponent={
					<View style={{ gap: theme.spacing.xl }}>
						<ScreenHeader
							eyebrow="Partner home"
							title="Partnership dashboard"
							subtitle="Monitor reserved positions, active relationships, and the settlement pipeline from one Harvverse control layer."
							trailing={<DisconnectWalletButton />}
						/>

						{account ? (
							<Section title="Wallet">
								<WalletAddressCard
									address={account.address.toString()}
								/>
							</Section>
						) : null}

						{rolePda ? (
							<Section title="Identity">
								<Banner
									tone="accent"
									title="Partner role is live"
									description={`Role PDA ${ellipsify(rolePda)}`}
									eyebrow="On-chain role"
								/>
							</Section>
						) : null}

						<Section
							title="Partnership metrics"
							description="Signals for sourcing, activation, and cashout progression."
						>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: theme.spacing.md,
								}}
							>
								<MetricCard
									tone="partner"
									eyebrow="Pipeline"
									label="Total positions"
									value={String(partnerships.length)}
									helper="All partner commitments"
									style={{ minWidth: 160 }}
								/>
								<MetricCard
									tone="info"
									eyebrow="Reserved"
									label="Pending cycle"
									value={String(reservedCount)}
									helper="Reserved and waiting for activation"
									style={{ minWidth: 160 }}
								/>
							</View>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: theme.spacing.md,
								}}
							>
								<MetricCard
									tone="success"
									eyebrow="Active"
									label="In execution"
									value={String(activeCount)}
									helper="Partnerships moving through the cycle"
									style={{ minWidth: 160 }}
								/>
								<MetricCard
									tone="partner"
									eyebrow="Settlement"
									label="Settled"
									value={String(settledCount)}
									helper="Completed payout previews or closes"
									style={{ minWidth: 160 }}
								/>
							</View>
						</Section>

						<ActionBar>
							<Button
								title="Browse Lots"
								variant="accent"
								onPress={() =>
									router.push("/(partner)/catalog" as Href)
								}
							/>
						</ActionBar>

						<Section
							title="My partnerships"
							description="Each position links the lot, the farmer counterparty, and the settlement route."
						/>
					</View>
				}
				ListEmptyComponent={
					isLoading ? (
						<Banner
							tone="info"
							title="Loading partnerships"
							description="Fetching your reserved and active positions."
						/>
					) : (
						<Banner
							tone="accent"
							title="No partnerships yet"
							description="Browse the lot catalog to reserve your first opportunity."
							eyebrow="Pipeline start"
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
							{ label: "Partner position", tone: "partner" },
							{
								label: item.partnershipPda ? "On-chain linked" : "Pending PDA",
								tone: item.partnershipPda ? "info" : "neutral",
							},
						]}
						details={[
							{
								label: "Farmer",
								value: ellipsify(item.farmerWallet),
							},
							{
								label: "Partnership PDA",
								value: item.partnershipPda
									? ellipsify(item.partnershipPda)
									: "Pending",
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
			return { label: formatStatusLabel(status), tone: "success" as const };
		case "settled":
			return { label: formatStatusLabel(status), tone: "accent" as const };
		case "cancelled":
			return { label: formatStatusLabel(status), tone: "error" as const };
		case "reserved":
		default:
			return { label: formatStatusLabel(status), tone: "info" as const };
	}
}

function formatStatusLabel(status: string) {
	return status.replace(/_/g, " ");
}
