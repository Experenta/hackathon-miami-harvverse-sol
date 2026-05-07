import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import {
  ActionBar,
  Banner,
  Button,
  Screen,
  ScreenHeader,
  StatusPill,
} from "@/components/ui";
import { LotForm, type LotFormData } from "@/features/farmer/lot-form";
import { useTheme } from "@/theme";

export default function EditLotScreen() {
  const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
  const router = useRouter();
  const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
  const updateDraft = useMutation(api.lots.updateDraft);
  const [formData, setFormData] = useState<LotFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (lot && !formData) {
      setFormData({
        lotCode: lot.lotCode,
        farmName: lot.farmName,
        country: lot.country,
        region: lot.region,
        latitude: String(lot.latitude),
        longitude: String(lot.longitude),
        altitudeMeters: String(lot.altitudeMeters),
        variety: lot.variety,
        areaManzanas: String(lot.areaManzanas),
        ticketUsdcCents: String(lot.ticketUsdcCents),
        farmerShareBps: String(lot.farmerShareBps),
        partnerShareBps: String(lot.partnerShareBps),
      });
    }
  }, [lot, formData]);

  const handleSave = useCallback(async () => {
    if (!formData || !lotCode) return;

    const farmerShareBps = parseInt(formData.farmerShareBps, 10) || 0;
    const partnerShareBps = parseInt(formData.partnerShareBps, 10) || 0;

    if (farmerShareBps + partnerShareBps !== 10000) {
      Alert.alert(
        "Invalid Share Split",
        "Farmer share + Partner share must equal 10000 BPS (100%).",
      );
      return;
    }

    setIsSaving(true);

    try {
      await updateDraft({
        lotCode,
        farmName: formData.farmName.trim(),
        variety: formData.variety.trim(),
        region: formData.region.trim(),
        country: formData.country.trim(),
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        altitudeMeters: parseInt(formData.altitudeMeters, 10) || 0,
        areaManzanas: parseFloat(formData.areaManzanas) || 0,
        ticketUsdcCents: parseInt(formData.ticketUsdcCents, 10) || 0,
        farmerShareBps,
        partnerShareBps,
      });

      Alert.alert("Saved", "Lot draft updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, lotCode, updateDraft, router]);

  if (lot === undefined) {
    return (
      <Screen
        contentContainerStyle={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.action.primary.background}
        />
        <Text
          style={[
            theme.typography.bodySm,
            { color: theme.colors.text.secondary },
          ]}
        >
          Loading lot...
        </Text>
      </Screen>
    );
  }

  if (!lot) {
    return (
      <Screen contentContainerStyle={{ justifyContent: "center" }}>
        <Banner
          tone="error"
          title="Lot not found"
          description={`Lot code: ${lotCode ?? "unknown"}`}
        />
      </Screen>
    );
  }

  if (!formData) {
    return (
      <Screen
        contentContainerStyle={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.action.primary.background}
        />
      </Screen>
    );
  }

  const isDraft = lot.status === "draft";

  return (
    <Screen scrollable>
      <Stack.Screen options={{ title: isDraft ? "Edit Lot" : "Lot Details" }} />
      <ScreenHeader
        eyebrow="Farmer flow"
        title={`${isDraft ? "Edit lot" : "Lot details"}: ${lot.lotCode}`}
        subtitle={
          isDraft
            ? "You can still refine the draft before publish review."
            : `This lot is already ${lot.status}. Fields are read-only.`
        }
        trailing={
          <StatusPill label={lot.status} tone={isDraft ? "farmer" : "info"} />
        }
      />

      {!isDraft ? (
        <Banner
          tone="info"
          title="Read-only mode"
          description="The lot remains viewable here, but only draft lots can be edited."
        />
      ) : null}

      <LotForm
        data={formData}
        onChange={setFormData}
        disabled={isSaving || !isDraft}
        showAutofill={isDraft}
      >
        <ActionBar>
          {isDraft ? (
            <Button
              title="Save Changes"
              onPress={handleSave}
              disabled={isSaving}
              loading={isSaving}
            />
          ) : null}
          <Button
            title={isDraft ? "Proceed to Publish" : "View Publish Review"}
            variant="accent"
            onPress={() =>
              router.push(`/(farmer)/lots/${lotCode}/publish-review` as Href)
            }
          />
        </ActionBar>
      </LotForm>
    </Screen>
  );
}
