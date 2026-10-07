<template>
	<VCard
		ref="cardRef"
		class="content-element-card mb-4"
		:class="{ 'content-element-card-edit-mode': isEditMode }"
		variant="outlined"
		data-testid="board-map-element"
	>
		<ContentElementBar :icon="mdiMapOutline">
			<template #title>{{ t("components.cardElement.mapElement") }}</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu :scope="BoardMenuScope.MAP_ELEMENT" has-background>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="emit('move-up:edit')" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="emit('move-down:edit')" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
		</ContentElementBar>
		<!--
			arrow keys pan the map instead of moving the card or paging through cards,
			a double click zooms instead of starting the card's edit mode
		-->
		<div
			ref="mapContainer"
			class="map-element prevent-card-drag"
			role="region"
			:aria-label="t('components.cardElement.mapElement.label')"
			data-testid="map-element-map"
			@keydown.up.down.left.right.stop
			@dblclick.stop
		>
			<div v-if="state === 'loading'" class="map-element__overlay">
				<VProgressCircular indeterminate color="primary" data-testid="map-element-loading" />
			</div>
			<div
				v-else-if="state === 'error'"
				class="map-element__overlay text-body-2 text-medium-emphasis px-6 text-center"
				data-testid="map-element-error"
			>
				{{ t("components.cardElement.mapElement.loadError") }}
			</div>
		</div>
		<VCardText v-if="isEditMode" class="d-flex flex-wrap align-center ga-2 py-2">
			<span class="text-caption text-medium-emphasis flex-1-1" data-testid="map-element-hint">
				{{ t("components.cardElement.mapElement.editHint") }}
			</span>
			<VBtn
				v-if="hasMarker"
				variant="text"
				size="small"
				:prepend-icon="mdiMapMarkerRemoveOutline"
				data-testid="map-element-remove-marker"
				@click="onRemoveMarker"
			>
				{{ t("components.cardElement.mapElement.removeMarker") }}
			</VBtn>
		</VCardText>
	</VCard>
</template>

<script setup lang="ts">
import type { MapMarkerPosition, MapViewController, MapViewState } from "./map-view";
import { MapElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { mdiMapMarkerRemoveOutline, mdiMapOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { useIntersectionObserver, useResizeObserver } from "@vueuse/core";
import { computed, onBeforeUnmount, ref, toRef, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: MapElement;
	isEditMode: boolean;
	isNotFirstElement?: boolean;
	isNotLastElement?: boolean;
}>();

const emit = defineEmits<{
	(e: "delete:element", id: string): void;
	(e: "move-up:edit"): void;
	(e: "move-down:edit"): void;
}>();

const { t } = useI18n();

// required by the OpenStreetMap tile usage policy; kept out of the messages so they stay plain text
const OSM_COPYRIGHT_LINK =
	'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const cardRef = ref(null);
const element = toRef(props, "element");
useBoardFocusHandler(element.value.id, cardRef);

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 300 });

const mapContainer = useTemplateRef<HTMLDivElement>("mapContainer");
const state = ref<"idle" | "loading" | "ready" | "error">("idle");
let controller: MapViewController | undefined;
let isUnmounted = false;

const hasMarker = computed(() => !!modelValue.value.marker);

const currentView = (): MapViewState => ({
	latitude: modelValue.value.latitude,
	longitude: modelValue.value.longitude,
	zoom: modelValue.value.zoom,
});

const onViewChange = (view: MapViewState) => {
	modelValue.value.latitude = view.latitude;
	modelValue.value.longitude = view.longitude;
	modelValue.value.zoom = view.zoom;
};

const onMarkerChange = (marker: MapMarkerPosition) => {
	modelValue.value.marker = { ...marker };
};

const onRemoveMarker = () => {
	modelValue.value.marker = undefined;
	controller?.setMarker(undefined);
};

const initMap = async () => {
	if (!mapContainer.value) return;
	state.value = "loading";
	try {
		const { createMapView } = await import("./map-view");
		if (isUnmounted || !mapContainer.value) return;
		controller = createMapView(mapContainer.value, {
			view: currentView(),
			marker: modelValue.value.marker,
			isEditable: props.isEditMode,
			attribution: t("components.cardElement.mapElement.attribution", { link: OSM_COPYRIGHT_LINK }),
			markerLabel: t("components.cardElement.mapElement.marker"),
			onViewChange,
			onMarkerChange,
		});
		state.value = "ready";
	} catch {
		if (!isUnmounted) state.value = "error";
	}
};

// only load Leaflet and tiles once the card scrolls into view
const { stop: stopObserving } = useIntersectionObserver(mapContainer, ([entry]) => {
	if (entry?.isIntersecting && state.value === "idle") {
		stopObserving();
		initMap();
	}
});

// Leaflet needs to know when the card (or the detail view) changes its size
useResizeObserver(mapContainer, () => controller?.invalidateSize());

watch(
	() => props.isEditMode,
	(isEditMode) => controller?.setEditable(isEditMode)
);

// changes made by others (socket updates) while this map is only shown
watch(
	() => element.value.content,
	(content) => {
		if (props.isEditMode || !controller) return;
		controller.setView({ latitude: content.latitude, longitude: content.longitude, zoom: content.zoom });
		controller.setMarker(content.marker);
	},
	{ deep: true }
);

onBeforeUnmount(() => {
	isUnmounted = true;
	controller?.destroy();
	controller = undefined;
});

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.mapElement");
	if (shouldDelete) emit("delete:element", element.value.id);
};
</script>

<style lang="scss" scoped>
.map-element {
	position: relative;
	aspect-ratio: 4 / 3;
	background-color: rgba(var(--v-theme-on-surface), 0.04);
	// keep Leaflet's panes and controls below board menus and dialogs
	z-index: 0;
	isolation: isolate;
}

.map-element__overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.map-element--editable {
	cursor: crosshair;
}

:deep(.map-element-marker) {
	color: rgb(var(--v-theme-primary));
	filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
}
</style>
