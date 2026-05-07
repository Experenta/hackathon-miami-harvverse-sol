import { View } from "react-native";
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
      <ScreenHeader
        eyebrow="Active position"
        title={`Yield agreement ${partnership.lotCode}`}
        subtitle="This detail screen frames the partnership as an active position with commercial and on-chain references."
        trailing={<Badge label="Partner position" tone="partner" />}
      />

      <Section
        description="Navigation and settlement preview routing remain unchanged."
        aside={<StatusPill label={statusLabel} tone={statusTone} />}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.md,
          }}
        >
          <StatusPill label="Yield agreement" tone="accent" />
          <StatusPill
            label={
              partnership.partnershipPda ? "On-chain linked" : "Pending PDA"
            }
            tone={partnership.partnershipPda ? "success" : "info"}
          />
        </View>
      </Section>

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

      <Section
        title="Agreement identity"
        description="The partnership should feel like a live yield agreement, not a raw record."
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
              tone: partnership.reserveTx ? "success" : "info",
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

      <Section
        title="Agreement references"
        description="On-chain and transaction references are visible but secondary."
        aside={<Badge label="Reference data" tone="info" />}
      >
        <Card variant="accent">
          <DetailRow label="Lot" value={partnership.lotCode} />
          <DetailRow label="Status" value={statusLabel} valueTone="secondary" />
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
