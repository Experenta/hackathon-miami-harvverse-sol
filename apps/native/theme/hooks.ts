import { useThemeContext } from "./provider";

export function useTheme() {
	return useThemeContext();
}

export function useColors() {
	return useThemeContext().theme.colors;
}

export function useTypography() {
	return useThemeContext().theme.typography;
}

export function useSpacing() {
	return useThemeContext().theme.spacing;
}

export function useRadius() {
	return useThemeContext().theme.radius;
}

export function useGradients() {
	return useThemeContext().gradients;
}
