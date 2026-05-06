import { MaterialIcons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

interface WalletAddressCardProps {
  address: string;
  label?: string;
  style?: ViewStyle;
}

export function WalletAddressCard({
  address,
  label = "Wallet address",
  style,
}: WalletAddressCardProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copyAddress = useCallback(() => {
    Clipboard.setString(address);
    setCopied(true);
  }, [address]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.helper}>Use this public key for seeding</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={`Copy ${label}`}
          accessibilityRole="button"
          onPress={copyAddress}
          style={[styles.copyButton, copied && styles.copyButtonCopied]}
        >
          <MaterialIcons
            color={copied ? "#166534" : "#374151"}
            name={copied ? "check" : "content-copy"}
            size={17}
          />
          <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
            {copied ? "Copied" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addressBox}>
        <Text selectable style={styles.address}>
          {address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  helper: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 16,
  },
  copyButton: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  copyButtonCopied: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  copyText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },
  copyTextCopied: {
    color: "#166534",
  },
  addressBox: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  address: {
    color: "#111827",
    flexShrink: 1,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
  },
});
