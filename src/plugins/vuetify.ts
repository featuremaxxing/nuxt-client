import "@/styles/global.scss";
import { readStoredThemePreference } from "@/composables/theme-preference.composable";
import { createI18n } from "@/plugins/i18n";
import { dbcThemeOptions, federalStateThemeOptions } from "@/themes/vuetify-theme.options";
import { SchulcloudTheme } from "@api-server";
import { useEnvConfig } from "@data-env";
import { merge } from "lodash-es";
import { useI18n } from "vue-i18n";
import { createVuetify } from "vuetify";
import { createVueI18nAdapter } from "vuetify/locale/adapters/vue-i18n";

export const createVuetifyPlugin = (i18n: ReturnType<typeof createI18n>) =>
	createVuetify({
		...merge(
			{},
			useEnvConfig().value.SC_THEME === SchulcloudTheme.DEFAULT ? dbcThemeOptions : federalStateThemeOptions,
			{ theme: { defaultTheme: readStoredThemePreference() } }
		),
		locale: {
			adapter: createVueI18nAdapter({ i18n, useI18n }),
		},
		// Lernposter form language: flat tiles, hairline edges, square-ish corners, no resting shadows.
		defaults: {
			global: { ripple: false },
			VBtn: { variant: "flat", rounded: true },
			VCard: { elevation: 0, rounded: true },
			VSheet: { elevation: 0 },
			VChip: { label: true },
			VDialog: {
				VCard: { rounded: "lg" },
				VCardText: {
					class: "text-body-1",
				},
			},
			VMenu: { VList: { rounded: "lg" } },
			VList: { VListItem: { rounded: true } },
			VAlert: { variant: "tonal", rounded: true },
			VAutocomplete: { color: "primary", variant: "outlined", density: "comfortable" },
			VCheckbox: { color: "primary" },
			VFileInput: { variant: "outlined", color: "primary", density: "comfortable" },
			VProgressLinear: { color: "primary", rounded: true, height: 6 },
			VRadioGroup: { color: "primary" },
			VSelect: { variant: "outlined", color: "primary", density: "comfortable" },
			VSwitch: { inset: true, flat: true, color: "primary" },
			VTabs: { color: "primary" },
			VTextarea: { variant: "outlined", color: "primary", density: "comfortable" },
			VTextField: { variant: "outlined", color: "primary", density: "comfortable" },
			VNavigationDrawer: { border: 0 },
			VToolbar: { flat: true },
			VAppBar: { flat: true },
		},
	});
