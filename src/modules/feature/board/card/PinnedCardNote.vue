<template>
	<div v-if="isEditing" class="mx-4 mb-3" data-testid="pinned-card-note-editor" @click.stop @dblclick.stop>
		<VTextarea
			v-model="draft"
			:label="t('pages.learningRoom.note.label')"
			:hint="t('pages.learningRoom.note.hint')"
			persistent-hint
			:counter="maxLength"
			:maxlength="maxLength"
			auto-grow
			rows="2"
			density="compact"
			variant="outlined"
			autofocus
			data-testid="pinned-card-note-input"
			@keydown.stop="onKeydown"
			@blur="save"
		/>
	</div>
	<div
		v-else-if="note"
		class="pinned-card-note mx-4 mb-3 pa-2 rounded text-body-2"
		role="button"
		tabindex="0"
		:aria-label="t('pages.learningRoom.note.edit')"
		data-testid="pinned-card-note"
		@click.stop="startEditing"
		@dblclick.stop
		@keydown.enter.stop.prevent="startEditing"
	>
		<div class="text-caption text-medium-emphasis">{{ t("pages.learningRoom.note.label") }}</div>
		<div class="pinned-card-note-text">{{ note }}</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

type Props = {
	note?: string;
};

const props = defineProps<Props>();
const emit = defineEmits<{
	(e: "save", note: string): void;
}>();
const isEditing = defineModel<boolean>("editing", { default: false });

const { t } = useI18n();

// matches the server side limit
const maxLength = 2000;
const draft = ref("");

watch(
	isEditing,
	(editing) => {
		if (editing) {
			draft.value = props.note ?? "";
		}
	},
	{ immediate: true }
);

const startEditing = () => {
	isEditing.value = true;
};

const save = () => {
	if (!isEditing.value) return;
	isEditing.value = false;

	const note = draft.value.trim();
	if (note !== (props.note ?? "")) {
		emit("save", note);
	}
};

const cancel = () => {
	isEditing.value = false;
};

// keys stay inside the note: arrow keys would otherwise move the card and enter
// would start the card's edit mode
const onKeydown = (event: KeyboardEvent) => {
	if (event.key === "Escape") {
		cancel();
	} else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
		save();
	}
};
</script>

<style scoped>
.pinned-card-note {
	background-color: rgba(var(--v-theme-primary), 0.06);
	cursor: pointer;
}

.pinned-card-note-text {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
