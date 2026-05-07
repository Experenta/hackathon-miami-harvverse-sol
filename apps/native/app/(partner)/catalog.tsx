import { FlatList, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { Banner, ListItemCard, MetricCard, Screen } from "@/components/ui";
import { AiChatPanel } from "@/features/agent/ai-chat-panel";
import { useLotCatalog } from "@/features/partner/use-lot-catalog";
import { useTheme } from "@/theme";

export default function CatalogScreen() {
  const { lots, isLoading } = useLotCatalog();
  const { account } = useMobileWallet();
  const router = useRouter();
  const { theme } = useTheme();
  const wallet = account?.address?.toString() ?? "";

  const totalTicketUsdcCents = lots.reduce(
    (total, lot) => total + lot.ticketUsdcCents,
    0,
  );
  const averageTicketUsdcCents =
    lots.length > 0 ? Math.round(totalTicketUsdcCents / lots.length) : 0;

  return (
    <Screen contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
      <FlatList
        data={lots}
        style={{ flex: 1 }}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.lg }}>
            {/* Compact metrics */}
            <Animated.View entering={FadeInDown.duration(200)}>
              <View
                style={{
                  flexDirection: "row",
                  gap: theme.spacing.sm,
                }}
              >
                <MetricCard
                  tone="partner"
                  eyebrow="Supply"
                  label="Lots"
                  value={String(lots.length)}
                  helper={`Avg ${formatUsd(averageTicketUsdcCents)}`}
                  style={{ minWidth: 100 }}
                />
                <MetricCard
                  tone="success"
                  eyebrow="Capital"
                  label="Total value"
                  value={formatUsd(totalTicketUsdcCents)}
                  helper="Aggregate tickets"
                  style={{ minWidth: 100 }}
                />
              </View>
            </Animated.View>

            {/* AI assistant */}
            <Animated.View entering={FadeInUp.delay(50).duration(150)}>
              {wallet ? (
                <AiChatPanel
                  wallet={wallet}
                  role="partner"
                  description="Compare available lots with AI before opening a detail screen."
                />
              ) : null}
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeInUp.delay(65).duration(150)}>
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
                  Available
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: theme.colors.border.subtle,
                  }}
                />
              </View>
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <Banner
              tone="info"
              title="Loading catalog"
              description="Fetching published lots."
            />
          ) : (
            <Banner
              tone="accent"
              title="No lots available"
              description="The catalog will populate once farmers publish lots on-chain."
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
            subtitle={`${item.variety} · ${item.region}, ${item.country}`}
            status={{ label: "published", tone: "success" }}
            highlight={{
              label: "Ticket",
              value: formatUsd(item.ticketUsdcCents),
            }}
            badges={[
              { label: item.variety, tone: "partner" },
              {
                label: `${trimNumber(item.areaManzanas)} mz`,
                tone: "neutral",
              },
            ]}
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

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
