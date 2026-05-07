import { Platform, type TextStyle } from "react-native";

export const officialFontFamilies = {
	brand: "Trenda",
} as const;

const fallbackBrandFamily = Platform.select({
	ios: "System",
	android: "sans-serif",
	default: undefined,
});

export function resolveBrandFontFamily(fontsLoaded: boolean) {
	return fontsLoaded ? officialFontFamilies.brand : fallbackBrandFamily;
}

export function createTypography(brandFontFamily: string | undefined) {
	const brandText = {
		fontFamily: brandFontFamily,
	} satisfies TextStyle;

	return {
		fontFamily: {
			brand: officialFontFamilies.brand,
			resolvedBrand: brandFontFamily,
		},
		h1: {
			...brandText,
			fontSize: 32,
			lineHeight: 38,
			fontWeight: "700",
		} satisfies TextStyle,
		h2: {
			...brandText,
			fontSize: 32,
			lineHeight: 38,
			fontWeight: "600",
		} satisfies TextStyle,
		text1: {
			...brandText,
			fontSize: 18,
			lineHeight: 24,
			fontWeight: "600",
		} satisfies TextStyle,
		text2: {
			...brandText,
			fontSize: 18,
			lineHeight: 24,
			fontWeight: "700",
		} satisfies TextStyle,
		bodyMd: {
			...brandText,
			fontSize: 16,
			lineHeight: 22,
			fontWeight: "400",
		} satisfies TextStyle,
		bodySm: {
			...brandText,
			fontSize: 14,
			lineHeight: 20,
			fontWeight: "400",
		} satisfies TextStyle,
		labelMd: {
			...brandText,
			fontSize: 14,
			lineHeight: 18,
			fontWeight: "600",
		} satisfies TextStyle,
		labelSm: {
			...brandText,
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "600",
		} satisfies TextStyle,
		caption: {
			...brandText,
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "400",
		} satisfies TextStyle,
		button: {
			...brandText,
			fontSize: 16,
			lineHeight: 20,
			fontWeight: "600",
		} satisfies TextStyle,
		mono: {
			fontFamily: Platform.select({
				ios: "Menlo",
				android: "monospace",
				default: "monospace",
			}),
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "400",
		} satisfies TextStyle,
	} as const;
}

export type TypographyTokens = ReturnType<typeof createTypography>;
