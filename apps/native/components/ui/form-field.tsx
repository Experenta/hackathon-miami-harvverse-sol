import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";

interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelAccessory?: React.ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  disabled,
  required,
  containerStyle,
  labelAccessory,
  ...inputProps
}: FormFieldProps) {
  const { theme } = useTheme();
  const isMultiline = Boolean(inputProps.multiline);

  return (
    <View style={[{ gap: theme.spacing.xxs }, containerStyle]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <Text
          style={[
            theme.typography.labelMd,
            { color: theme.colors.text.secondary },
          ]}
        >
          {label}
          {required ? (
            <Text style={{ color: theme.colors.text.brand }}> *</Text>
          ) : null}
        </Text>
        {labelAccessory ? <View>{labelAccessory}</View> : null}
      </View>
      <TextInput
        style={[
          theme.typography.bodyMd,
          {
            backgroundColor: disabled
              ? theme.colors.input.backgroundDisabled
              : theme.colors.input.background,
            borderRadius: theme.radius.sm,
            borderWidth: theme.borderWidth.thin,
            borderColor: error
              ? theme.colors.input.borderError
              : theme.colors.input.border,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 10,
            color: disabled
              ? theme.colors.input.textDisabled
              : theme.colors.input.text,
            minHeight: isMultiline ? 88 : undefined,
            textAlignVertical: isMultiline ? "top" : "center",
          },
        ]}
        placeholderTextColor={theme.colors.input.placeholder}
        editable={!disabled}
        accessibilityLabel={label}
        {...inputProps}
      />
      {hint && !error && (
        <Text
          style={[theme.typography.caption, { color: theme.colors.text.muted }]}
        >
          {hint}
        </Text>
      )}
      {error && (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.feedback.error.foreground },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
