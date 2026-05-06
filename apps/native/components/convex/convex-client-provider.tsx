import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export function ConvexClientProvider({ children }: PropsWithChildren) {
  if (!convex) {
    console.warn("Missing EXPO_PUBLIC_CONVEX_URL; Convex is not connected.");
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Convex is not configured</Text>
        <Text style={styles.message}>
          Set EXPO_PUBLIC_CONVEX_URL in apps/native/.env.local and restart Expo.
        </Text>
      </View>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 24,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  message: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
