<template>
	<VCard
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

const canManageAssignments = computed(() => allowedOperations.value.updateElement);

const onMoveUp = () => emit("move-up:edit");
const onMoveDown = () => emit("move-down:edit");

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.assignmentElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};
</script>
