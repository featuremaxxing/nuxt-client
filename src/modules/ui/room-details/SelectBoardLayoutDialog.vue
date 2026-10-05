<template>
	<SvsDialog v-model="isOpen" no-confirm title="pages.room.dialog.boardLayout.title" data-testid="board-layout-dialog">
		<template #content>
			<div class="d-flex flex-wrap justify-center">
				<ExtendedIconBtn
					v-for="(item, key) in boardLayouts"
					:key="key"
					:data-testid="item.dataTestId"
					:icon="item.icon"
					:label="item.label"
					:class="{ selected: currentLayout === item.type }"
					@click.stop="$emit('select', item.type)"
				/>
			</div>
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import { PickerOption } from "./types";
import { BoardLayout } from "@api-server";
import { useEnvConfig } from "@data-env";
import {
	mdiFolderMultipleOutline,
	mdiMapMarkerPath,
	mdiViewAgendaOutline,
	mdiViewDashboardOutline,
} from "@icons/material";
import { SvsDialog } from "@ui-dialog";
import { ExtendedIconBtn } from "@ui-extended-icon-btn";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const isOpen = defineModel({
	type: Boolean,
	required: true,
});

const props = defineProps({
	currentLayout: {
		type: String as PropType<BoardLayout>,
		default: "",
	},
	// file areas and learning paths can only be created (in a room), an existing board never turns into one
	allowRoomLayouts: {
		type: Boolean,
		default: false,
	},
});

defineEmits<{
	(e: "select", layout: BoardLayout): void;
}>();

const { t } = useI18n();

const baseLayouts: PickerOption[] = [
	{
		label: t("pages.room.dialog.boardLayout.multiColumn"),
		icon: mdiViewDashboardOutline,
		type: BoardLayout.COLUMNS,
		dataTestId: "dialog-add-multi-column-board",
		ariaLabel: t("pages.room.dialog.boardLayout.multiColumn"),
	},
	{
		label: t("pages.room.dialog.boardLayout.singleColumn"),
		icon: mdiViewAgendaOutline,
		type: BoardLayout.LIST,
		dataTestId: "dialog-add-single-column-board",
		ariaLabel: t("pages.room.dialog.boardLayout.singleColumn"),
	},
];

const fileAreaLayout: PickerOption = {
	label: t("pages.room.dialog.boardLayout.fileArea"),
	icon: mdiFolderMultipleOutline,
	type: BoardLayout.FILES,
	dataTestId: "dialog-add-file-area-board",
	ariaLabel: t("pages.room.dialog.boardLayout.fileArea"),
};

const learningPathLayout: PickerOption = {
	label: t("pages.room.dialog.boardLayout.learningPath"),
	icon: mdiMapMarkerPath,
	type: BoardLayout.LEARNING_PATH,
	dataTestId: "dialog-add-learning-path-board",
	ariaLabel: t("pages.room.dialog.boardLayout.learningPath"),
};

const boardLayouts = computed<PickerOption[]>(() => {
	if (!props.allowRoomLayouts) return baseLayouts;

	const config = useEnvConfig().value;
	return [
		...baseLayouts,
		...(config.FEATURE_BOARD_FILE_AREA_ENABLED ? [fileAreaLayout] : []),
		...(config.FEATURE_BOARD_LEARNING_PATH_ENABLED ? [learningPathLayout] : []),
	];
});
</script>

<style scoped>
.selected {
	border: 1px solid rgba(var(--v-theme-on-surface));
}
</style>
