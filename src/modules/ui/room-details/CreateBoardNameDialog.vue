<template>
	<SvsDialog
		v-model="isOpen"
		:title="t('pages.room.dialog.boardName.title')"
		confirm-btn-lang-key="common.actions.create"
		:confirm-btn-disabled="!isNameValid"
		data-testid="board-name-dialog"
		@confirm="onConfirm"
	>
		<template #content>
			<VTextField
				v-model="name"
				data-testid="board-name-input"
				density="compact"
				autofocus
				:label="t('common.labels.title')"
				:placeholder="placeholder"
				:rules="[validateOnOpeningTag]"
				@keydown.enter.prevent="onEnter"
			/>
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import { BoardLayout } from "@api-server";
import { SvsDialog } from "@ui-dialog";
import { useOpeningTagValidator } from "@util-validators";
import { computed, PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Asks for the name of a new board, so a room does not fill up with boards of the same default name.
const props = defineProps({
	layout: { type: String as PropType<BoardLayout>, default: BoardLayout.COLUMNS },
});

const isOpen = defineModel({ type: Boolean, required: true });

const emit = defineEmits<{
	(e: "confirm", name: string): void;
}>();

const { t } = useI18n();
const { validateOnOpeningTag } = useOpeningTagValidator();

const name = ref("");

watch(isOpen, (open) => {
	if (open) name.value = "";
});

const placeholder = computed(() => {
	if (props.layout === BoardLayout.FILES) return t("pages.room.dialog.boardName.placeholder.fileArea");
	if (props.layout === BoardLayout.LEARNING_PATH) return t("pages.room.dialog.boardName.placeholder.learningPath");
	return t("pages.room.dialog.boardName.placeholder.board");
});

const isNameValid = computed(() => name.value.trim().length > 0 && validateOnOpeningTag(name.value) === true);

const onConfirm = () => {
	if (isNameValid.value) emit("confirm", name.value.trim());
};

const onEnter = () => {
	if (!isNameValid.value) return;
	onConfirm();
	isOpen.value = false;
};
</script>
