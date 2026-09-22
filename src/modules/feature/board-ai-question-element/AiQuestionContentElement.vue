<template>
	<VCard
		ref="aiQuestionContentElement"
		class="content-element-card mb-4"
		:class="{ 'content-element-card-edit-mode': isEditMode }"
		data-testid="board-ai-question-element"
		variant="outlined"
	>
		<ContentElementBar :icon="mdiRobotOutline">
			<template #title>
				{{ element.content.question || t("components.cardElement.aiQuestionElement") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.AI_QUESTION_ELEMENT"
					has-background
					:data-testid="`element-menu-button-${columnIndex}-${rowIndex}-${elementIndex}`"
				>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="onMoveUp" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="onMoveDown" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
		</ContentElementBar>

		<AiQuestionElementEdit v-if="isEditMode" :element="element" :is-edit-mode="isEditMode" />
		<AiQuestionElementTeacherDisplay v-else-if="canManageAiQuestion" :element="element" />
		<AiQuestionElementStudentDisplay v-else :element="element" />
	</VCard>
</template>

<script setup lang="ts">
import AiQuestionElementEdit from "./components/AiQuestionElementEdit.vue";
import AiQuestionElementStudentDisplay from "./components/AiQuestionElementStudentDisplay.vue";
import AiQuestionElementTeacherDisplay from "./components/AiQuestionElementTeacherDisplay.vue";
import { AiQuestionElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { useBoardAllowedOperations, useBoardFocusHandler } from "@data-board";
import { mdiRobotOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AiQuestionElement;
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
const aiQuestionContentElement = ref(null);
useBoardFocusHandler(element.value.id, aiQuestionContentElement);

// isBoardEditor, not updateElement: updateElement folds a reader on a "readers can edit"
// board into "can edit", but the server never grants an AI question's manage view (the
// teacher's instructions and the expected answer) to such a reader - see the aiQuestion
// carve-out in board-node.rule.ts.
const canManageAiQuestion = computed(() => allowedOperations.value.isBoardEditor);

const onMoveUp = () => emit("move-up:edit");
const onMoveDown = () => emit("move-down:edit");

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.aiQuestionElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};
</script>
