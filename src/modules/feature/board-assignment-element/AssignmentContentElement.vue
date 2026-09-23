<template>
	<VCard
		v-if="isVisibleForUser"
		ref="assignmentContentElement"
		class="content-element-card mb-4"
		:class="{ 'content-element-card-edit-mode': isEditMode }"
		data-testid="board-assignment-element"
		variant="outlined"
	>
		<ContentElementBar :icon="mdiClipboardTextOutline">
			<template #title>
				{{ element.content.title || t("components.cardElement.assignmentElement.untitled") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.ASSIGNMENT_ELEMENT"
					has-background
					:data-testid="`element-menu-button-${columnIndex}-${rowIndex}-${elementIndex}`"
				>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="onMoveUp" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="onMoveDown" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
		</ContentElementBar>

		<AssignmentElementEdit v-if="isEditMode" :element="element" :is-edit-mode="isEditMode" />
		<AssignmentElementTeacherDisplay v-else-if="canManageAssignments" :element="element" />
		<AssignmentElementStudentDisplay v-else :element="element" />
	</VCard>
</template>

<script setup lang="ts">
import AssignmentElementEdit from "./components/AssignmentElementEdit.vue";
import AssignmentElementStudentDisplay from "./components/AssignmentElementStudentDisplay.vue";
import AssignmentElementTeacherDisplay from "./components/AssignmentElementTeacherDisplay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { nowUtc, parseUtc } from "@/utils/date-time.utils";
import { useBoardAllowedOperations, useBoardFocusHandler } from "@data-board";
import { mdiClipboardTextOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AssignmentElement;
	isEditMode: boolean;
	isNotFirstElement?: boolean;
	isNotLastElement?: boolean;
	columnIndex: number;
	rowIndex: number;
	elementIndex: number;
}>();

const emit = defineEmits<{
	(e: "delete:element", elementId: string): void;
	(e: "move-down:edit"): void;
	(e: "move-up:edit"): void;
	(e: "move-keyboard:edit", event: KeyboardEvent): void;
}>();

const { t } = useI18n();
const { allowedOperations } = useBoardAllowedOperations();

const element = toRef(props, "element");
const assignmentContentElement = ref(null);
useBoardFocusHandler(element.value.id, assignmentContentElement);

// isBoardEditor, not updateElement: updateElement is board-wide and folds a reader on a
// "readers can edit" board into "can edit" - the server keeps a carve-out that never grants an
// assignment's manage/teacher view to such a reader (see board-node.rule.ts, hasPermission's
// isAssignmentNode guard), and isBoardEditor is the field that reflects that carve-out to the
// client.
const canManageAssignments = computed(() => allowedOperations.value.isBoardEditor);

// Students must not see an assignment at all before its startDate (teachers do). This is
// presentation-level only: the server still serves the element in the board payload, but
// rejects any submission attempt before the start regardless of what a manipulated
// client renders. Re-evaluates when board data refreshes; no live timer by design.
const isVisibleForUser = computed(() => {
	if (canManageAssignments.value) {
		return true;
	}

	const startDate = element.value.content.startDate;
	return !startDate || !parseUtc(startDate).isAfter(nowUtc());
});

const onMoveUp = () => emit("move-up:edit");
const onMoveDown = () => emit("move-down:edit");

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.assignmentElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};
</script>
