import base from "@/themes/base-vuetify-theme.options";
import { merge } from "lodash-es";
import { type ThemeDefinition } from "vuetify";

// Federal-state instances (brb, n21, thr) use the Lernraum palette unchanged; their identity lives in
// logo, favicon and school name. The dBildungscloud default keeps its brand red as the primary accent.
const federalStateOverrides: Record<"light" | "dark", ThemeDefinition> = {
	light: {},
	dark: {},
};

const dbcOverrides: Record<"light" | "dark", ThemeDefinition> = {
	light: {
		colors: {
			primary: "#8E1F2A",
			"primary-darken-1": "#6F1520",
			"primary-lighten": "#F6E7E9",
		},
	},
	dark: {
		colors: {
			primary: "#FF9AA2",
			"primary-darken-1": "#F27D87",
			"primary-lighten": "#3A1C22",
			"on-primary": "#0E1117",
		},
	},
};

export const dbcThemeOptions = merge({}, base, { theme: { themes: dbcOverrides } });
export const federalStateThemeOptions = merge({}, base, { theme: { themes: federalStateOverrides } });
