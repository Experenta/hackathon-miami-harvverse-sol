import { FlatList, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  Banner,
  ListItemCard,
  MetricCard,
  Screen,
  ScreenHeader,
  Section,
} from "@/components/ui";
import { useLotCatalog } from "@/features/partner/use-lot-catalog";
import { useTheme } from "@/theme";

export default function CatalogScreen() {
  const { lots, isLoading } = useLotCatalog();
  const router = useRouter();
  const { theme } = useTheme();

  const totalTicketUsdcCents = lots.reduce(
    (total, lot) => total + lot.ticketUsdcCents,
    0,
  );
  const averageTicketUsdcCents =
    lots.length > 0 ? Math.round(totalTicketUsdcCents / lots.length) : 0;

  return (
    <Screen contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
      <FlatList
        data={lots}
        style={{ flex: 1 }}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.lg,
          paddingBottom: theme.spacing["2xl"],
        }}
        ListHeaderComponent={
          <>
            <ScreenHeader
              eyebrow="Partner sourcing"
              title="Lot catalog"
              subtitle="Browse published inventory and evaluate each lot as a structured partnership opportunity."
            />

            <Section
              title="Market snapshot"
              description="A fast read on the current opportunity set available to partner wallets."
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: theme.spacing.sm,
                }}
              >
                <MetricCard
                  tone="partner"
                  eyebrow="Supply"
                  label="Published lots"
                  value={String(lots.length)}
                  helper="Current opportunities in market"
                />
                <MetricCard
                  tone="info"
                  eyebrow="Average"
                  label="Avg. ticket"
                  value={formatUsd(averageTicketUsdcCents)}
                  helper="Mean opportunity size"
                />
              </View>
              <MetricCard
                tone="success"
                eyebrow="Capital"
                label="Catalog value"
                value={formatUsd(totalTicketUsdcCents)}
                helper="Aggregate ticket capacity across live lots"
              />
            </Section>

            <Section
              title="Available opportunities"
              description="Published lots are presented as premium assets with visible ticket size and origin data."
            />
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <Banner
              tone="info"
              title="Loading catalog"
              description="Fetching published lots available for partnership."
            />
          ) : (
            <Banner
              tone="accent"
              title="No published lots available"
              description="The catalog will populate once farmers publish lots on-chain."
              eyebrow="Market idle"
            />
          )
        }
        renderItem={({ item }) => (
          <ListItemCard
            accessibilityLabel={`Lot ${item.lotCode} ${item.farmName}`}
            onPress={() =>
              router.push(`/(partner)/lots/${item.lotCode}` as Href)
            }
            tone="partner"
            eyebrow={item.lotCode}
            title={item.farmName}
            subtitle={`Partnership-ready ${item.variety} lot from ${item.region}, ${item.country}`}
            status={{ label: "published", tone: "success" }}
            highlight={{
              label: "Ticket size",
              value: formatUsd(item.ticketUsdcCents),
            }}
            badges={[
              { label: item.variety, tone: "partner" },
              {
                label: `${trimNumber(item.areaManzanas)} manzanas`,
                tone: "neutral",
              },
            ]}
            details={[
              {
                label: "Origin",
                value: `${item.region}, ${item.country}`,
              },
              {
                label: "Revenue split",
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

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
