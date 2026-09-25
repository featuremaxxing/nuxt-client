<template>
	<VNavigationDrawer v-model="sidebarExpanded" class="lr-sidebar" :width="272">
		<VList open-strategy="multiple" class="lr-sidebar__list" nav>
			<div class="lr-sidebar__head d-flex align-center">
				<VBtn
					class="ml-1"
					:icon="mdiMenuOpen"
					size="default"
					flat
					:aria-label="t('global.topbar.actions.closeMenu')"
					data-testid="sidebar-toggle-close"
					@click="sidebarExpanded = false"
				/>
				<CloudLogo class="mt-1" />
			</div>
			<div class="pb-3">
				<template v-for="item in pageItems" :key="item.title">
					<SidebarCategoryItem v-if="isSidebarCategoryItem(item)" :item="item" />
					<SidebarItem v-else :item="item" :draggable="false" />
				</template>
			</div>
			<VDivider aria-hidden="true" />
			<div class="py-3">
				<SidebarCategoryItem v-for="link in metaItems" :key="link.title" :item="link" />
			</div>
			<VDivider aria-hidden="true" />
			<div class="pt-3">
				<SidebarItem v-for="link in legalItems" :key="link.title" :item="link" :draggable="false" />
			</div>
		</VList>
	</VNavigationDrawer>
</template>

<script setup lang="ts">
import CloudLogo from "../CloudLogo.vue";
import { SidebarGroupItem, SidebarItems, SidebarSingleItem } from "../types";
import SidebarCategoryItem from "./SidebarCategoryItem.vue";
import SidebarItem from "./SidebarItem.vue";
import { useSidebarItems } from "./SidebarItems.composable";
import { useAppStore } from "@data-app";
import { useEnvConfig } from "@data-env";
import { mdiMenuOpen } from "@icons/material";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const sidebarExpanded = defineModel({
	type: Boolean,
	required: true,
});

const { t } = useI18n();
const { pageLinks, legalLinks, metaLinks } = useSidebarItems();

const isSidebarCategoryItem = (item: SidebarSingleItem | SidebarGroupItem): item is SidebarGroupItem =>
	(item as SidebarGroupItem).children !== undefined;

const userHasPermission = (item: SidebarSingleItem | SidebarGroupItem) =>
	!item.permissions || item.permissions.some((permission) => useAppStore().userPermissions.includes(permission));

const hasFeatureEnabled = (item: SidebarSingleItem | SidebarGroupItem) => {
	if (!item.feature) return true;

	return useEnvConfig().value[item.feature] === (item.featureValue ?? true);
};

const isEnabledForTheme = (item: SidebarSingleItem | SidebarGroupItem) => {
	if (!item.theme) return true;

	return item.theme.includes(useEnvConfig().value.SC_THEME);
};

const getItemsForUser = (items: SidebarItems) => {
	const sidebarItems = items.filter((item) => {
		if (isSidebarCategoryItem(item)) {
			item.children = item.children.filter(
				(child) => userHasPermission(child) && hasFeatureEnabled(child) && isEnabledForTheme(child)
			);
		}
		return userHasPermission(item) && hasFeatureEnabled(item) && isEnabledForTheme(item);
	});

	return sidebarItems;
};

const legalItems = computed(() => getItemsForUser(legalLinks.value) as SidebarSingleItem[]);
const metaItems = computed(() => getItemsForUser(metaLinks.value) as SidebarGroupItem[]);
const pageItems = computed(() => getItemsForUser(pageLinks.value));
</script>

<style lang="scss">
.lr-sidebar.v-navigation-drawer {
	background: rgb(var(--v-theme-surface));
	border-inline-end: 1px solid var(--lr-line) !important;
}

.lr-sidebar__head {
	min-height: var(--topbar-height);
	gap: var(--lr-space-2);
	padding-inline-end: var(--lr-space-3);
	margin-bottom: var(--lr-space-2);
}

.lr-sidebar__list {
	padding: var(--lr-space-2) var(--lr-space-3) var(--lr-space-4) !important;

	.v-list-item {
		min-height: 44px;
		margin-block: 2px;
		border-radius: var(--lr-radius) !important;
		font-family: var(--font-accent);
		font-stretch: var(--font-stretch-display);
		font-weight: 600;
		color: rgb(var(--v-theme-on-surface));
		transition: background-color var(--lr-duration-fast) var(--lr-ease-out);
	}

	.v-list-item-title {
		font-size: 0.9375rem;
		font-weight: inherit;
		letter-spacing: 0;
	}

	.v-list-item:hover > .v-list-item__overlay {
		opacity: 0.06;
	}

	// selected element: a filled ink tile, readable by shape, not by a colored stripe
	.v-list-item--active {
		background: rgb(var(--v-theme-on-surface));
		color: rgb(var(--v-theme-surface)) !important;

		> .v-list-item__overlay {
			opacity: 0 !important;
		}
	}

	.v-divider {
		margin-inline: var(--lr-space-2);
		border-color: var(--lr-line);
		opacity: 1;
	}
}
</style>
