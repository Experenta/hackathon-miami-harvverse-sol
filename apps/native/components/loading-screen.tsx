import { ActivityIndicator, Text, View } from "react-native";
import { Screen } from "@/components/ui";
import { useTheme } from "@/theme";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const { theme } = useTheme();

  return (
    <Screen
      contentContainerStyle={{
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
        }}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.action.primary.background}
        />
        <Text
          style={[
            theme.typography.bodyMd,
            { color: theme.colors.text.secondary },
          ]}
        >
          {message}
        </Text>
      </View>
    </Screen>
  );
}
