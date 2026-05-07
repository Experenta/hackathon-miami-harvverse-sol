import type { AppTheme } from "./semantic";
import { foundationTokens } from "./tokens";

export function createGradients(theme: AppTheme) {
	return {
		hero: [foundationTokens.colors.base.blue, foundationTokens.colors.base.purple],
		farmer: [
			foundationTokens.colors.base.green,
			foundationTokens.colors.base.blue,
		],
		partner: [
			foundationTokens.colors.base.blue,
			foundationTokens.colors.base.purple,
		],
		surface: [theme.colors.surface.default, theme.colors.surface.raised],
	} as const;
}

export type GradientTokens = ReturnType<typeof createGradients>;
