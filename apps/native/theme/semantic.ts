import { createTypography, type TypographyTokens } from "./typography";
import { foundationTokens } from "./tokens";

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedThemeMode = "dark" | "light";

function createActionTokens() {
	const { base, neutral, alpha } = foundationTokens.colors;
	const { borderWidth } = foundationTokens;

	return {
		primary: {
			background: base.green,
			foreground: neutral[950],
			borderColor: base.green,
			borderWidth: borderWidth.none,
		},
		secondary: {
			background: neutral[850],
			foreground: base.white,
			borderColor: alpha.white[24],
			borderWidth: borderWidth.strong,
		},
		accent: {
			background: neutral[850],
			foreground: base.blue,
			borderColor: alpha.blue[24],
			borderWidth: borderWidth.strong,
		},
		ghost: {
			background: "transparent",
			foreground: base.green,
			borderColor: "transparent",
			borderWidth: borderWidth.none,
		},
		critical: {
			background: neutral[850],
			foreground: base.white,
			borderColor: alpha.white[72],
			borderWidth: borderWidth.strong,
		},
		disabled: {
			background: neutral[800],
			foreground: alpha.white[40],
			borderColor: alpha.white[12],
			borderWidth: borderWidth.thin,
		},
	} as const;
}

function createDarkColors() {
	const { base, neutral, alpha } = foundationTokens.colors;
	const actions = createActionTokens();

	return {
		background: {
			app: neutral[950],
			canvas: neutral[900],
		},
		surface: {
			default: neutral[850],
			raised: neutral[800],
			subtle: neutral[900],
			ticket: alpha.green[12],
			inverse: base.white,
		},
		text: {
			primary: base.white,
			secondary: alpha.white[72],
			muted: alpha.white[56],
			inverse: neutral[950],
			brand: base.green,
			onPrimary: neutral[950],
			onAccent: neutral[950],
			disabled: alpha.white[40],
		},
		border: {
			default: alpha.white[12],
			subtle: alpha.white[8],
			strong: alpha.white[24],
			outlineWhite: alpha.white[72],
			focus: base.blue,
			accent: base.green,
			critical: alpha.white[72],
		},
		input: {
			background: neutral[850],
			backgroundDisabled: neutral[900],
			border: alpha.white[24],
			borderFocus: base.blue,
			borderError: alpha.white[72],
			text: base.white,
			textDisabled: alpha.white[56],
			placeholder: alpha.white[40],
		},
		feedback: {
			success: {
				background: alpha.green[12],
				border: alpha.green[24],
				foreground: base.green,
				accent: base.green,
			},
			warning: {
				background: alpha.purple[12],
				border: alpha.purple[24],
				foreground: base.white,
				accent: base.purple,
			},
			info: {
				background: alpha.blue[12],
				border: alpha.blue[24],
				foreground: base.blue,
				accent: base.blue,
			},
			error: {
				background: neutral[850],
				border: alpha.white[72],
				foreground: base.white,
				accent: base.white,
			},
		},
		action: actions,
		role: {
			farmer: {
				background: alpha.green[16],
				foreground: base.green,
				border: alpha.green[24],
			},
			partner: {
				background: alpha.blue[16],
				foreground: base.blue,
				border: alpha.purple[24],
			},
		},
	} as const;
}

function createLightColors() {
	const { base, neutral, alpha } = foundationTokens.colors;
	const actions = createActionTokens();

	return {
		background: {
			app: base.white,
			canvas: alpha.neutral[8],
		},
		surface: {
			default: alpha.white[96],
			raised: alpha.white[100],
			subtle: alpha.neutral[8],
			ticket: alpha.green[16],
			inverse: neutral[950],
		},
		text: {
			primary: neutral[950],
			secondary: neutral[700],
			muted: neutral[750],
			inverse: base.white,
			brand: base.green,
			onPrimary: neutral[950],
			onAccent: neutral[950],
			disabled: neutral[700],
		},
		border: {
			default: alpha.neutral[12],
			subtle: alpha.neutral[8],
			strong: alpha.neutral[20],
			outlineWhite: neutral[950],
			focus: base.blue,
			accent: base.green,
			critical: neutral[950],
		},
		input: {
			background: alpha.white[100],
			backgroundDisabled: alpha.neutral[8],
			border: alpha.neutral[16],
			borderFocus: base.blue,
			borderError: neutral[950],
			text: neutral[950],
			textDisabled: neutral[700],
			placeholder: neutral[750],
		},
		feedback: {
			success: {
				background: alpha.green[12],
				border: alpha.green[24],
				foreground: neutral[950],
				accent: base.green,
			},
			warning: {
				background: alpha.purple[12],
				border: alpha.purple[24],
				foreground: neutral[950],
				accent: base.purple,
			},
			info: {
				background: alpha.blue[12],
				border: alpha.blue[24],
				foreground: neutral[950],
				accent: base.blue,
			},
			error: {
				background: alpha.white[96],
				border: neutral[950],
				foreground: neutral[950],
				accent: neutral[950],
			},
		},
		action: {
			...actions,
			secondary: {
				...actions.secondary,
				background: alpha.white[100],
				foreground: neutral[950],
				borderColor: alpha.neutral[16],
			},
			accent: {
				...actions.accent,
				background: alpha.white[100],
				foreground: base.purple,
				borderColor: alpha.blue[24],
			},
			critical: {
				...actions.critical,
				background: alpha.white[96],
				foreground: neutral[950],
				borderColor: neutral[950],
			},
			disabled: {
				...actions.disabled,
				background: alpha.neutral[8],
				foreground: neutral[700],
				borderColor: alpha.neutral[8],
			},
		},
		role: {
			farmer: {
				background: alpha.green[12],
				foreground: neutral[950],
				border: alpha.green[24],
			},
			partner: {
				background: alpha.blue[12],
				foreground: neutral[950],
				border: alpha.purple[24],
			},
		},
	} as const;
}

export function createTheme(
	resolvedMode: ResolvedThemeMode,
	brandFontFamily: string | undefined,
) {
	const colors =
		resolvedMode === "light" ? createLightColors() : createDarkColors();
	const typography: TypographyTokens = createTypography(brandFontFamily);

	return {
		mode: resolvedMode,
		colors,
		typography,
		spacing: foundationTokens.spacing,
		radius: foundationTokens.radius,
		borderWidth: foundationTokens.borderWidth,
		elevation: foundationTokens.elevation,
	} as const;
}

export type AppTheme = ReturnType<typeof createTheme>;
