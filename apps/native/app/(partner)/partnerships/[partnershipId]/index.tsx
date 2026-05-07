import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
	ActionBar,
	Badge,
	Banner,
	Button,
	Card,
	CollapsibleSection,
	DetailRow,
	MetricCard,
	Screen,
	ScreenHeader,
	StatusPill,
} from "@/components/ui";
import { usePartnerships } from "@/features/partner/use-partnership";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function PartnershipDetailScreen() {
	const { partnershipId } = useLocalSearchParams<{
		partnershipId: string;
	}>();
	const { partnerships } = usePartnerships();
	const { theme } = useTheme();
	const router = useRouter();

	const partnership = partnerships.find((p) => p._id === partnershipId);

	if (!partnership) {
		return (
			<Screen
				contentContainerStyle={{
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Banner
					tone="error"
					title="Partnership not found"
					description="No partnership was found for this detail screen."
				/>
			</Screen>
		);
	}

	const statusTone = mapPartnerStatusTone(partnership.status);
	const statusLabel = formatStatusLabel(partnership.status);

	return (
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.lg }}>
			{/* Header */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow={partnership.lotCode}
					title="Yield agreement"
					trailing={<Badge label="Partner" tone="partner" />}
				/>
			</Animated.View>

			{/* Status */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: theme.spacing.sm,
					}}
				>
					<StatusPill label={statusLabel} tone={statusTone} />
					<StatusPill
						label={
							partnership.partnershipPda ? "On-chain" : "Pending"
						}
						tone={partnership.partnershipPda ? "success" : "info"}
					/>
				</View>
			</Animated.View>

			{/* Position snapshot — 2 cards */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
					<MetricCard
						tone="partner"
						eyebrow="Position"
						label="Lot"
						value={partnership.lotCode}
						helper="Underlying asset"
						style={{ flex: 1 }}
					/>
					<MetricCard
						tone={statusTone === "success" ? "success" : "info"}
						eyebrow="Lifecycle"
						label="Status"
						value={statusLabel}
						helper="Agreement state"
						style={{ flex: 1 }}
					/>
				</View>
			</Animated.View>

			{/* Counterparty info — inline */}
			<Animated.View entering={FadeInUp.delay(90).duration(250)}>
				<Card variant="muted">
					<DetailRow
						label="Farmer"
						value={ellipsify(partnership.farmerWallet)}
						mono
						valueTone="secondary"
					/>
					{partnership.termsHash ? (
						<DetailRow
							label="Terms hash"
							value={ellipsify(partnership.termsHash, 8)}
							mono
							valueTone="secondary"
						/>
					) : null}
				</Card>
			</Animated.View>

			{/* On-chain references — collapsed */}
			<Animated.View entering={FadeInUp.delay(100).duration(250)}>
				<CollapsibleSection title="On-chain references">
					<Card variant="muted">
						{partnership.partnershipPda ? (
							<DetailRow
								label="Partnership PDA"
								value={ellipsify(partnership.partnershipPda)}
								mono
								valueTone="secondary"
							/>
						) : null}
						{partnership.reserveTx ? (
							<DetailRow
								label="Reserve tx"
								value={ellipsify(partnership.reserveTx)}
								mono
								valueTone="secondary"
							/>
						) : null}
						{partnership.termsHash ? (
							<DetailRow
								label="Terms hash"
								value={ellipsify(partnership.termsHash, 8)}
								mono
								valueTone="secondary"
							/>
						) : null}
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* Action */}
			<Animated.View entering={FadeInUp.delay(75).duration(200)}>
				<ActionBar>
					<Button
						title="View Settlement Preview"
						variant="accent"
						onPress={() =>
							router.push(
								`/(partner)/partnerships/${partnershipId}/settlement` as Href,
							)
						}
					/>
				</ActionBar>
			</Animated.View>
		</Screen>
	);
}

function mapPartnerStatusTone(status: string) {
	switch (status) {
		case "active":
			return "success" as const;
		case "settled":
			return "accent" as const;
		case "cancelled":
			return "error" as const;
		case "reserved":
		default:
			return "info" as const;
	}
}

function formatStatusLabel(status: string) {
	return status.replace(/_/g, " ");
}
