import {
	StyleSheet,
	Text,
	TextInput,
	View,
	type TextInputProps,
} from "react-native";

interface FormFieldProps extends Omit<TextInputProps, "style"> {
	label: string;
	hint?: string;
	error?: string;
	disabled?: boolean;
}

export function FormField({
	label,
	hint,
	error,
	disabled,
	...inputProps
}: FormFieldProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.label}>{label}</Text>
			<TextInput
				style={[
					styles.input,
					disabled && styles.inputDisabled,
					error && styles.inputError,
				]}
				placeholderTextColor="#9ca3af"
				editable={!disabled}
				accessibilityLabel={label}
				{...inputProps}
			/>
			{hint && !error && <Text style={styles.hint}>{hint}</Text>}
			{error && <Text style={styles.error}>{error}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 4,
	},
	label: {
		fontSize: 13,
		fontWeight: "600",
		color: "#374151",
	},
	input: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#d1d5db",
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: "#111827",
	},
	inputDisabled: {
		backgroundColor: "#f9fafb",
		color: "#374151",
	},
	inputError: {
		borderColor: "#dc2626",
	},
	hint: {
		fontSize: 12,
		color: "#6b7280",
	},
	error: {
		fontSize: 12,
		color: "#dc2626",
	},
});
