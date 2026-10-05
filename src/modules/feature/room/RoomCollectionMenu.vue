<template>
	<KebabMenu
		:aria-label="t('pages.rooms.collections.menu.ariaLabel', { name: roomName })"
		data-testid="room-collection-menu"
	>
		<KebabMenuAction
			v-if="currentCollection"
			:icon="mdiLayersMinus"
			data-test-id="room-collection-menu-take-out"
			@click="$emit('take-out')"
		>
			{{ t("pages.rooms.collections.menu.takeOut", { title: titleOf(currentCollection) }) }}
		</KebabMenuAction>
		<KebabMenuAction
			v-for="collection in otherCollections"
			:key="collection.id"
			:icon="mdiLayersPlus"
			data-test-id="room-collection-menu-add"
			@click="$emit('add-to', collection.id)"
		>
			{{ t("pages.rooms.collections.menu.addTo", { title: titleOf(collection) }) }}
		</KebabMenuAction>
		<KebabMenuAction :icon="mdiLayersPlus" data-test-id="room-collection-menu-create" @click="$emit('create')">
			{{ t("pages.rooms.collections.menu.create") }}
		</KebabMenuAction>
	</KebabMenu>
</template>

<script setup lang="ts">
import { RoomCollection } from "@data-room";
import { mdiLayersMinus, mdiLayersPlus } from "@icons/material";
import { KebabMenu, KebabMenuAction } from "@ui-kebab-menu";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	roomName: { type: String, required: true },
	collections: { type: Array as PropType<RoomCollection[]>, required: true },
	currentCollection: { type: Object as PropType<RoomCollection>, default: undefined },
});

defineEmits<{
	(e: "take-out"): void;
	(e: "add-to", collectionId: string): void;
	(e: "create"): void;
}>();

const { t } = useI18n();

const otherCollections = computed(() =>
	props.collections.filter((collection) => collection.id !== props.currentCollection?.id)
);

const titleOf = (collection: RoomCollection) => collection.title || t("pages.rooms.collections.untitled");
</script>
