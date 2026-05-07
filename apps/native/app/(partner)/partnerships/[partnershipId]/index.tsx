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
	DetailRow,
	ListItemCard,
	MetricCard,
	Screen,
	ScreenHeader,
	Section,
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
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.xl }}>
			{/* Hero */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow="Active position"
					title={`Yield agreement ${partnership.lotCode}`}
					subtitle="This position represents your active partnership with commercial and on-chain references."
					trailing={<Badge label="Partner position" tone="partner" />}
				/>
			</Animated.View>

			{/* Status pills */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						gap: theme.spacing.md,
					}}
				>
					<StatusPill label={statusLabel} tone={statusTone} />
					<StatusPill label="Yield agreement" tone="accent" />
					<StatusPill
						label={
							partnership.partnershipPda
								? "On-chain linked"
								: "Pending PDA"
						}
						tone={partnership.partnershipPda ? "success" : "info"}
					/>
				</View>
			</Animated.View>

			{/* Position snapshot */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section
					title="Position snapshot"
					description="Primary position state is surfaced ahead of technical identifiers."
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
							eyebrow="Position"
							label="Lot code"
							value={partnership.lotCode}
							helper="Underlying asset reference"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							tone={statusTone === "success" ? "success" : "info"}
							eyebrow="Lifecycle"
							label="Status"
							value={statusLabel}
							helper="Current agreement state"
							style={{ minWidth: 160 }}
						/>
					</View>
				</Section>
			</Animated.View>

			{/* Agreement identity */}
			<Animated.View entering={FadeInUp.delay(50).duration(250)}>
				<Section
					title="Agreement identity"
					description="The partnership framed as a live yield agreement."
				>
					<ListItemCard
						disabled
						tone="partner"
						eyebrow={partnership.lotCode}
						title={`Position on lot ${partnership.lotCode}`}
						subtitle={`Counterparty ${ellipsify(partnership.farmerWallet)}`}
						status={{ label: statusLabel, tone: statusTone }}
						highlight={{
							label: "Partner role",
							value: "Active position",
						}}
						badges={[
							{ label: "Yield agreement", tone: "partner" },
							{
								label: partnership.reserveTx
									? "Reserved on-chain"
									: "Awaiting tx",
								tone: partnership.reserveTx
									? "success"
									: "info",
							},
						]}
						details={[
							{
								label: "Farmer wallet",
								value: ellipsify(partnership.farmerWallet),
							},
							{
								label: "Terms hash",
								value: partnership.termsHash
									? ellipsify(partnership.termsHash, 8)
									: "Pending",
							},
						]}
					/>
				</Section>
			</Animated.View>

			{/* Agreement references */}
			<Animated.View entering={FadeInUp.delay(250).duration(250)}>
				<Section
					title="Agreement references"
					description="On-chain and transaction references."
					aside={<Badge label="Reference data" tone="info" />}
				>
					<Card variant="accent">
						<DetailRow label="Lot" value={partnership.lotCode} />
						<DetailRow
							label="Status"
							value={statusLabel}
							valueTone="secondary"
						/>
						<DetailRow
							label="Farmer"
							value={ellipsify(partnership.farmerWallet)}
							mono
							valueTone="secondary"
						/>
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
				</Section>
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
