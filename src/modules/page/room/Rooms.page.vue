<template>
	<DefaultWireframe max-width="full" :fab-items="fabAction" main-with-bottom-padding>
		<template #header>
			<!-- the view toggle sits next to the title: the right side belongs to the "create room" button -->
			<div class="d-flex align-center flex-wrap column-gap-6">
				<h1>{{ t("pages.rooms.title") }}</h1>
				<VBtnToggle
					v-if="!isEmpty"
					v-model="viewMode"
					mandatory
					density="compact"
					variant="outlined"
					divided
					color="primary"
					class="mb-4"
					:aria-label="t('pages.rooms.view.ariaLabel')"
					data-testid="rooms-view-toggle"
				>
					<VBtn value="all" :prepend-icon="mdiViewGridOutline" data-testid="rooms-view-all">
						{{ t("pages.rooms.view.all") }}
					</VBtn>
					<VBtn value="tags" :prepend-icon="mdiTagMultipleOutline" data-testid="rooms-view-tags">
						{{ t("pages.rooms.view.tags") }}
					</VBtn>
				</VBtnToggle>
			</div>
		</template>
		<RoomsWelcomeInfo class="mt-8" />
		<VContainer v-if="isLoading && isEmpty" class="loader">
			<VSkeletonLoader ref="skeleton-loader" type="date-picker-days" class="mt-6" />
		</VContainer>
		<EmptyState v-else-if="isEmpty" :title="t('pages.rooms.emptyState')">
			<template #media>
				<RoomsEmptyStateSvg />
			</template>
		</EmptyState>
		<RoomTagView v-else-if="viewMode === 'tags'" :rooms />
		<RoomGrid v-else :rooms />
		<RoomTagsDialog />
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission } from "@api-server";
import { useAppStore } from "@data-app";
import { useRoomStore } from "@data-room";
import { useImportFlow } from "@feature-import";
import { RoomGrid, RoomsWelcomeInfo, RoomTagsDialog, RoomTagView, useRoomsView } from "@feature-room";
import { mdiPlus, mdiTagMultipleOutline, mdiViewGridOutline } from "@icons/material";
import { EmptyState, RoomsEmptyStateSvg } from "@ui-empty-state";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { sortBy } from "lodash-es";
import { storeToRefs } from "pinia";
import { computed, onMounted, toValue, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { rooms, isLoading, isEmpty } = storeToRefs(useRoomStore());

const { fetchRooms } = useRoomStore();
const { viewMode } = useRoomsView();

const pageTitle = computed(() => buildPageTitle(t("pages.rooms.title")));
useTitle(pageTitle);

const fabAction = computed(() => {
	const canCreateRoom = toValue(useAppStore().hasPermission(Permission.SCHOOL_CREATE_ROOM));
	if (!canCreateRoom) return;

	return [
		{
			icon: mdiPlus,
			label: t("pages.rooms.fab.title"),
			to: "/rooms/new",
			dataTestId: "fab-add-room",
		},
	];
});

const availableDestinations = computed(() =>
	sortBy(
		rooms.value.filter((room) => !room.isLocked && (room.allowedOperations?.editContent ?? false)),
		(r) => r.name
	)
);

const { executeImport } = useImportFlow();

const executeImportFlow = async (token: string) => {
	// rooms might not be loaded yet, so we need to fetch them before executing the import
	await fetchRooms();
	const { destinations: importDestinations, success } = await executeImport(token, availableDestinations);

	if (!success) {
		router.push({ name: "rooms" });
		return;
	}

	const destinations = importDestinations ?? [];

	if (destinations.length === 1 && destinations[0].type === "room") {
		router.replace({ name: "room-details", params: { id: destinations[0].id } });
	} else if (destinations.length === 1 && destinations[0].type === "column" && "boardId" in destinations[0]) {
		router.replace({ name: "boards-id", params: { id: destinations[0].boardId } });
	} else if (destinations.length === 1 && destinations[0].type === "board") {
		router.replace({ name: "boards-id", params: { id: destinations[0].id } });
	} else {
		router.replace({ name: "rooms" });
		fetchRooms();
	}
};

watch(
	() => route.query.import,
	(newValue) => {
		if (newValue) {
			const token = newValue as string;
			executeImportFlow(token);
		}
	},
	{ immediate: true }
);

onMounted(() => {
	fetchRooms();
});
</script>
