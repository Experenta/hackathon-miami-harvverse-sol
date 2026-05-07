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
import { useFarmerLots } from "@/features/farmer/use-farmer-lots";
import { useRole } from "@/features/role/use-role";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function FarmerHomeScreen() {
  const { account } = useMobileWallet();
  const { rolePda } = useRole();
  const { lots, isLoading } = useFarmerLots();
  const router = useRouter();
  const { theme } = useTheme();

  const publishedLots = lots.filter((lot) => lot.status === "published").length;
  const activeLots = lots.filter((lot) =>
    ["published", "reserved", "in_cycle"].includes(lot.status),
  ).length;
  const totalTicketUsdcCents = lots.reduce(
    (total, lot) => total + lot.ticketUsdcCents,
    0,
  );

  return (
    <Screen contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
      <FlatList
        data={lots}
        style={{ flex: 1 }}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.xl,
          paddingBottom: theme.spacing["2xl"],
        }}
        ListHeaderComponent={
          <>
            <ScreenHeader
              eyebrow="Farmer home"
              title="Portfolio dashboard"
              subtitle="Track your lots as digital agricultural assets and push new inventory live without leaving the Harvverse flow."
              trailing={<DisconnectWalletButton />}
            />

            {account ? (
              <Section title="Wallet">
                <WalletAddressCard address={account.address.toString()} />
              </Section>
            ) : null}

            {rolePda ? (
              <Section title="Identity">
                <Banner
                  tone="success"
                  title="Farmer role is live"
                  description={`Role PDA ${ellipsify(rolePda)}`}
                  eyebrow="On-chain role"
                />
              </Section>
            ) : null}

            <Section
              title="Portfolio metrics"
              description="A quick read on your asset base and what is already circulating."
            >
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.md,
                }}
              >
                <MetricCard
                  tone="farmer"
                  eyebrow="Inventory"
                  label="Total lots"
                  value={String(lots.length)}
                  helper="Drafts and live positions"
                  style={{ minWidth: 160 }}
                />
                <MetricCard
                  tone="info"
                  eyebrow="Market"
                  label="Live lots"
                  value={String(activeLots)}
                  helper={`${publishedLots} fully published`}
                  style={{ minWidth: 160 }}
                />
              </View>
              <MetricCard
                tone="success"
                eyebrow="Capital"
                label="Ticketed value"
                value={formatUsd(totalTicketUsdcCents)}
                helper="Aggregate target size across your portfolio"
              />
            </Section>

            <ActionBar>
              <Button
                title="Create Lot"
                onPress={() => router.push("/(farmer)/lots/new" as Href)}
              />
            </ActionBar>

            <Section
              title="My lots"
              description="Each lot is framed as a publishable asset with its own ticket size, geography, and lifecycle."
            />
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <Banner
              tone="info"
              title="Loading lots"
              description="Fetching your latest lot inventory from Convex."
            />
          ) : (
            <Banner
              tone="success"
              title="No lots yet"
              description="Create your first lot to start building your on-chain inventory."
              eyebrow="Portfolio start"
            />
          )
        }
        renderItem={({ item }) => (
          <ListItemCard
            accessibilityLabel={`Lot ${item.lotCode}`}
            onPress={() =>
              router.push(`/(farmer)/lots/${item.lotCode}/edit` as Href)
            }
            tone="farmer"
            eyebrow={item.lotCode}
            title={item.farmName}
            subtitle={`${item.variety} asset from ${item.region}, ${item.country}`}
            status={mapFarmerStatus(item.status)}
            highlight={{
              label: "Ticket size",
              value: formatUsd(item.ticketUsdcCents),
            }}
            badges={[
              { label: item.variety, tone: "brand" },
              {
                label: `${trimNumber(item.areaManzanas)} manzanas`,
                tone: "neutral",
              },
            ]}
            details={[
              {
                label: "Location",
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

function mapFarmerStatus(status: string) {
  switch (status) {
    case "published":
      return { label: formatStatusLabel(status), tone: "success" as const };
    case "reserved":
      return { label: formatStatusLabel(status), tone: "info" as const };
    case "in_cycle":
    case "settled":
      return { label: formatStatusLabel(status), tone: "accent" as const };
    case "cancelled":
      return { label: formatStatusLabel(status), tone: "error" as const };
    case "draft":
    default:
      return { label: formatStatusLabel(status), tone: "farmer" as const };
  }
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
