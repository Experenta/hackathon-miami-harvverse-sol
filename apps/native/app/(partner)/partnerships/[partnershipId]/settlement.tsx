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
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.xl }}>
			{/* Hero */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					eyebrow="Yield statement"
					title="Settlement preview"
					subtitle={`Projected settlement math for lot ${partnership.lotCode}.`}
				/>
			</Animated.View>

			{/* Status */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						gap: theme.spacing.md,
					}}
				>
					<StatusPill label={partnership.status} tone="partner" />
					<StatusPill label="Demo economics" tone="warning" />
					<Badge label="Projected" tone="warning" />
				</View>
			</Animated.View>

			{/* Yield statement metrics */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section
					title="Yield statement"
					description="Real-world framing for output, revenue, cost, and distributable value."
				>
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.spacing.md,
						}}
					>
						<MetricCard
							label="Harvest yield"
							value={`${DEMO_YIELD_QQ} qq`}
							helper={`${totalLbs.toFixed(1)} lb equivalent`}
							eyebrow="Output"
							tone="success"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Gross revenue"
							value={formatUsd(revenueCents)}
							helper={`$${PRICE_PER_LB.toFixed(2)} per lb`}
							eyebrow="Market"
							tone="info"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Operating cost"
							value={formatUsd(costCents)}
							helper="Production + processing"
							eyebrow="Expense"
							tone="default"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Net distributable"
							value={formatUsd(profitCents)}
							helper="Gross revenue minus cost"
							eyebrow="Settlement"
							tone="partner"
							style={{ minWidth: 160 }}
						/>
					</View>
				</Section>
			</Animated.View>

			{/* Partnership statement */}
			<Animated.View entering={FadeInUp.delay(50).duration(250)}>
				<Section
					title="Partnership statement"
					description="Primary commercial fields stay front and center."
					aside={<Badge label={partnership.lotCode} tone="partner" />}
				>
					<Card variant="accent">
						<DetailRow label="Lot" value={partnership.lotCode} />
						<DetailRow
							label="Farmer"
							value={ellipsify(partnership.farmerWallet)}
							mono
							valueTone="secondary"
						/>
						<DetailRow label="Status" value={partnership.status} />
						{partnership.partnershipPda ? (
							<DetailRow
								label="Partnership PDA"
								value={ellipsify(partnership.partnershipPda)}
								mono
								valueTone="secondary"
							/>
						) : null}
					</Card>
				</Section>
			</Animated.View>

			{/* Settlement breakdown */}
			<Animated.View entering={FadeInUp.delay(250).duration(250)}>
				<Section
					title="Settlement breakdown"
					description="Deterministic math for the projected settlement."
				>
					<Card variant="success">
						<DetailRow
							label="Revenue formula"
							value={`${DEMO_YIELD_QQ}qq × ${LBS_PER_QQ} lb/qq × $${PRICE_PER_LB.toFixed(2)}`}
							valueTone="secondary"
						/>
						<DetailRow
							label="Revenue"
							value={formatUsd(revenueCents)}
						/>
						<DetailRow label="Cost" value={formatUsd(costCents)} />
						<DetailRow
							label="Profit"
							value={formatUsd(profitCents)}
						/>

						{/* Visual separator */}
						<View
							style={{
								height: 1,
								backgroundColor: theme.colors.border.subtle,
								marginVertical: theme.spacing.xs,
							}}
						/>

						<DetailRow
							label={`Farmer (${farmerShareBps / 100}%)`}
							value={formatUsd(farmerShareCents)}
						/>
						<DetailRow
							label={`Partner (${partnerShareBps / 100}%)`}
							value={formatUsd(partnerShareCents)}
						/>
					</Card>
				</Section>
			</Animated.View>

			{/* Disclaimer */}
			<Animated.View entering={FadeInUp.delay(75).duration(200)}>
				<Banner
					tone="warning"
					title="Projected settlement only"
					description="This statement uses demo values of 6qq yield, $3.50/lb price, and $1,490 operating cost. Actual settlement will be recorded on-chain after harvest completion."
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
