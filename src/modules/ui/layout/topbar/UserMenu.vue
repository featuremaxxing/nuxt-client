<template>
	<VMenu :width="isExternalLogoutAllowed ? 'auto' : '320'">
		<template #activator="{ props: menuProps }">
			<VBtn
				v-bind="{ ...menuProps, ...safariAriaOwnsWorkaround }"
				v-bind.attr="$attrs"
				icon
				data-testid="user-menu-btn"
				class="user-menu-btn"
				size="small"
				@click="onMenuBtnClicked"
			>
				<span class="text-h4">{{ initials }}</span>
			</VBtn>
		</template>
		<VList>
			<VListItem data-testid="active-user"> {{ user.firstName }} {{ user.lastName }} ({{ userRole }}) </VListItem>
			<VDivider />
			<LanguageMenu />
			<div class="px-4 pt-2 pb-3" data-testid="theme-preference">
				<div id="theme-preference-label" class="text-body-2 text-muted mb-2">{{ t("global.topbar.theme.label") }}</div>
				<VBtnToggle
					v-model="themePreference"
					mandatory
					density="comfortable"
					variant="outlined"
					divided
					class="w-100"
					aria-labelledby="theme-preference-label"
				>
					<VBtn
						v-for="option in themeOptions"
						:key="option.value"
						:value="option.value"
						:prepend-icon="option.icon"
						class="flex-grow-1"
						:data-testid="`theme-preference-${option.value}`"
					>
						{{ t(option.label) }}
					</VBtn>
				</VBtnToggle>
			</div>
			<VDivider />
			<VListItem href="/account" data-testid="account-link">
				{{ $t("global.topbar.settings") }}
			</VListItem>
			<VListItem
				v-if="isExternalLogoutAllowed"
				data-testid="external-logout"
				:disabled="isSessionTokenExpired"
				@click="externalLogout"
			>
				{{ $t("common.labels.logout") }}{{ isExternalLogoutAllowed ? ` Bildungscloud & ${systemName}` : "" }}
			</VListItem>
			<VListItem data-testid="logout" @click="logout">
				{{ $t("common.labels.logout") }}{{ isExternalLogoutAllowed ? " Bildungscloud" : "" }}
			</VListItem>
		</VList>
	</VMenu>
</template>

<script setup lang="ts">
import LanguageMenu from "./LanguageMenu.vue";
import { useThemePreference } from "@/composables/theme-preference.composable";
import { MeUserResponse } from "@api-server";
import { useSystem } from "@data-access";
import { useAppStore, useAppStoreRefs } from "@data-app";
import { mdiThemeLightDark, mdiWeatherNight, mdiWhiteBalanceSunny } from "@icons/material";
import { safariAriaOwnsWorkaround } from "@util-device-detection";
import { computed, PropType, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	user: {
		type: Object as PropType<MeUserResponse>,
		required: true,
	},
	roleNames: {
		type: Array as PropType<string[]>,
		required: true,
	},
});

const { systemId } = useAppStoreRefs();

const { t } = useI18n();

const { preference: themePreference } = useThemePreference();
const themeOptions = [
	{ value: "system", label: "global.topbar.theme.system", icon: mdiThemeLightDark },
	{ value: "light", label: "global.topbar.theme.light", icon: mdiWhiteBalanceSunny },
	{ value: "dark", label: "global.topbar.theme.dark", icon: mdiWeatherNight },
] as const;

const userRole = computed(() => t(`common.roleName.${toRef(props.roleNames).value[0]}`).toString());

const initials = computed(() => props.user.firstName.slice(0, 1) + props.user.lastName.slice(0, 1));

const { isExternalLogoutAllowed, isSessionTokenExpired, systemName, updateSessionTokenExpiration } =
	useSystem(systemId);

const onMenuBtnClicked = () => updateSessionTokenExpiration();

const logout = () => {
	useAppStore().logout();
};

const externalLogout = () => {
	useAppStore().externalLogout();
};
</script>

<style scoped>
.user-menu-btn {
	background: rgb(var(--v-theme-on-surface));
	color: rgb(var(--v-theme-surface));
	font-stretch: var(--font-stretch-symbol);
}

:deep(.v-list-group__items .v-list-item) {
	padding-inline-start: 16px !important;
}
</style>
