import { darkColors, lightColors } from "./lernraum-palette";
import { customAliases } from "@/components/icons/custom";
import * as materialAliases from "@/components/icons/material";
import { type ThemeDefinition } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

declare global {
	interface Window {
		nonce: string;
	}
}

const sharedVariables = {
	"high-emphasis-opacity": 1,
	"medium-emphasis-opacity": 0.78,
	"disabled-opacity": 0.55,
	"border-opacity": 0.14,
	"hover-opacity": 0.06,
	"focus-opacity": 0.12,
	"selected-opacity": 0.1,
	"activated-opacity": 0.12,
	"pressed-opacity": 0.16,
};

export const lightTheme: ThemeDefinition = {
	dark: false,
	colors: { ...lightColors },
	variables: { ...sharedVariables, "border-color": lightColors["on-surface"] },
};

export const darkTheme: ThemeDefinition = {
	dark: true,
	colors: { ...darkColors },
	variables: { ...sharedVariables, "border-color": darkColors["on-surface"], "border-opacity": 0.16 },
};

export default {
	theme: {
		cspNonce: "**CSP_NONCE**",
		defaultTheme: "system",
		options: {
			customProperties: true,
			cspNonce: window.nonce,
		},
		themes: { light: lightTheme, dark: darkTheme },
	},
	icons: {
		defaultSet: "mdi",
		aliases: {
			...aliases,
			...materialAliases,
			...customAliases,
		},
		sets: {
			mdi,
		},
	},
};
