import { useStorage } from "@vueuse/core";
import { computed } from "vue";
import { useTheme } from "vuetify";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCE_KEY = "lernraum.theme";
const PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

const isThemePreference = (value: unknown): value is ThemePreference => PREFERENCES.includes(value as ThemePreference);

/**
 * Initial theme for createVuetify, read before the app mounts so there is no light flash in dark mode.
 * Storage can be unavailable (private mode, blocked site data); "system" is always a safe answer.
 */
export const readStoredThemePreference = (): ThemePreference => {
	try {
		const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
		return isThemePreference(stored) ? stored : "system";
	} catch {
		return "system";
	}
};

export const useThemePreference = () => {
	const theme = useTheme();
	const stored = useStorage<ThemePreference>(THEME_PREFERENCE_KEY, "system");

	const preference = computed<ThemePreference>({
		get: () => (isThemePreference(stored.value) ? stored.value : "system"),
		set: (value) => {
			stored.value = value;
			theme.change(value);
		},
	});

	const isDark = computed(() => theme.current.value.dark);

	return { preference, isDark, preferences: PREFERENCES };
};
