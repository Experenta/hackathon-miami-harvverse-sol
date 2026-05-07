import { Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import {
	Badge,
	Banner,
	Card,
	CollapsibleSection,
	DetailRow,
	MetricCard,
	Screen,
	ScreenHeader,
	Section,
	StatusPill,
} from "@/components/ui";
import { usePartnerships } from "@/features/partner/use-partnership";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

const DEMO_YIELD_QQ = 6;
const LBS_PER_QQ = 83.3;
const PRICE_PER_LB = 3.5;
const DEMO_COST_CENTS = 149000;

export default function SettlementPreviewScreen() {
	const { partnershipId } = useLocalSearchParams<{
		partnershipId: string;
	}>();
	const { partnerships } = usePartnerships();
	const { theme } = useTheme();

	const partnership = partnerships.find((p) => p._id === partnershipId);

	const lot = useQuery(
		api.lots.getByCode,
		partnership?.lotCode ? { lotCode: partnership.lotCode } : "skip",
	);

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
					description="No partnership was found for this settlement preview."
				/>
			</Screen>
		);
	}

	const farmerShareBps = lot?.farmerShareBps ?? 6000;
	const partnerShareBps = lot?.partnerShareBps ?? 4000;

	const totalLbs = DEMO_YIELD_QQ * LBS_PER_QQ;
	const revenueCents = Math.round(totalLbs * PRICE_PER_LB * 100);
	const costCents = DEMO_COST_CENTS;
	const profitCents = revenueCents - costCents;
	const farmerShareCents = Math.round((profitCents * farmerShareBps) / 10000);
	const partnerShareCents = Math.round(
		(profitCents * partnerShareBps) / 10000,
	);

	return (
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.lg }}>
			{/* Header */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow={`Lot ${partnership.lotCode}`}
					title="Settlement preview"
				/>
			</Animated.View>

			{/* Status — minimal */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: theme.spacing.sm,
					}}
				>
					<StatusPill label={partnership.status} tone="partner" />
					<Badge label="Projected" tone="warning" />
				</View>
			</Animated.View>

			{/* Key numbers — 2 cards */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
					<MetricCard
						label="Net profit"
						value={formatUsd(profitCents)}
						helper={`Revenue ${formatUsd(revenueCents)}`}
						eyebrow="Settlement"
						tone="partner"
						style={{ flex: 1 }}
					/>
					<MetricCard
						label="Your share"
						value={formatUsd(partnerShareCents)}
						helper={`${partnerShareBps / 100}% of profit`}
						eyebrow="Partner"
						tone="success"
						style={{ flex: 1 }}
					/>
				</View>
			</Animated.View>

			{/* Distribution breakdown */}
			<Animated.View entering={FadeInUp.delay(90).duration(250)}>
				<Section title="Distribution">
					<Card variant="success">
						<DetailRow
							label={`Farmer (${farmerShareBps / 100}%)`}
							value={formatUsd(farmerShareCents)}
						/>
						<DetailRow
							label={`Partner (${partnerShareBps / 100}%)`}
							value={formatUsd(partnerShareCents)}
						/>
						<View
							style={{
								height: 1,
								backgroundColor: theme.colors.border.subtle,
								marginVertical: theme.spacing.xs,
							}}
						/>
						<DetailRow
							label="Total distributable"
							value={formatUsd(profitCents)}
						/>
					</Card>
				</Section>
			</Animated.View>

			{/* Yield economics — collapsed for detail-seekers */}
			<Animated.View entering={FadeInUp.delay(100).duration(250)}>
				<CollapsibleSection
					title="Yield economics"
					subtitle="Harvest output, market price, and cost breakdown"
				>
					<Card variant="muted">
						<DetailRow
							label="Harvest yield"
							value={`${DEMO_YIELD_QQ} qq (${totalLbs.toFixed(0)} lb)`}
						/>
						<DetailRow
							label="Market price"
							value={`$${PRICE_PER_LB.toFixed(2)}/lb`}
						/>
						<DetailRow
							label="Gross revenue"
							value={formatUsd(revenueCents)}
						/>
						<DetailRow
							label="Operating cost"
							value={formatUsd(costCents)}
						/>
						<View
							style={{
								height: 1,
								backgroundColor: theme.colors.border.subtle,
								marginVertical: theme.spacing.xs,
							}}
						/>
						<DetailRow
							label="Formula"
							value={`${DEMO_YIELD_QQ}qq × ${LBS_PER_QQ} × $${PRICE_PER_LB.toFixed(2)}`}
							valueTone="secondary"
						/>
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* Partnership reference — collapsed */}
			<Animated.View entering={FadeInUp.delay(110).duration(250)}>
				<CollapsibleSection title="Partnership reference">
					<Card variant="muted">
						<DetailRow label="Lot" value={partnership.lotCode} />
						<DetailRow
							label="Farmer"
							value={ellipsify(partnership.farmerWallet)}
							mono
							valueTone="secondary"
						/>
						{partnership.partnershipPda ? (
							<DetailRow
								label="PDA"
								value={ellipsify(partnership.partnershipPda)}
								mono
								valueTone="secondary"
							/>
						) : null}
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* Disclaimer */}
			<Animated.View entering={FadeInUp.delay(120).duration(200)}>
				<Banner
					tone="warning"
					title="Demo projection"
					description="Uses sample values (6qq yield, $3.50/lb, $1,490 cost). Actual settlement will be recorded on-chain after harvest."
				/>
			</Animated.View>
		</Screen>
	);
}

function formatUsd(cents: number): string {
	return `$${(cents / 100).toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;
}
