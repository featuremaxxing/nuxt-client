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
import { mdiFolderMultipleOutline, mdiViewAgendaOutline, mdiViewDashboardOutline } from "@icons/material";
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
	// a file area can only be created (in a room), an existing board never turns into one
	allowFileArea: {
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

const boardLayouts = computed<PickerOption[]>(() =>
	props.allowFileArea && useEnvConfig().value.FEATURE_BOARD_FILE_AREA_ENABLED
		? [...baseLayouts, fileAreaLayout]
		: baseLayouts
);
</script>

<style scoped>
.selected {
	border: 1px solid rgba(var(--v-theme-on-surface));
}
</style>
