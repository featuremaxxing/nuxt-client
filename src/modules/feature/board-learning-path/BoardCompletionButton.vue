<template>
	<VBtn
		v-if="completion?.canMarkManually"
		:variant="completion.completed ? 'flat' : 'outlined'"
		:color="completion.completed ? 'success' : 'primary'"
		:prepend-icon="completion.completed ? mdiCheckCircle : mdiCheckCircleOutline"
		:aria-pressed="completion.completed"
		:loading="isSaving"
		data-testid="board-completion-button"
		@click="toggle"
	>
		{{ completion.completed ? t("components.board.completion.done") : t("components.board.completion.markDone") }}
	</VBtn>
</template>

<script setup lang="ts">
import { type BoardCompletion, useLearningPathApi } from "@data-board-learning-path";
import { useEnvConfig } from "@data-env";
import { mdiCheckCircle, mdiCheckCircleOutline } from "@icons/material";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Shown on a board that is part of a learning path and has nothing to track progress with:
// the student marks it as done by hand, which unlocks the boards behind it.
const props = defineProps<{
	boardId: string;
	roomId?: string;
}>();

const { t } = useI18n();
const api = useLearningPathApi();

const completion = ref<BoardCompletion>();
const isSaving = ref(false);

const isEnabled = computed(() => useEnvConfig().value.FEATURE_BOARD_LEARNING_PATH_ENABLED && !!props.roomId);

const refresh = async () => {
	completion.value = undefined;
	if (!isEnabled.value) return;
	try {
		completion.value = await api.fetchCompletion(props.boardId);
	} catch {
		// without the information the button simply stays hidden
	}
};

const toggle = async () => {
	if (!completion.value) return;
	isSaving.value = true;
	try {
		completion.value = await api.setCompletion(props.boardId, !completion.value.completed);
	} catch {
		// the api already told the user
	} finally {
		isSaving.value = false;
	}
};

onMounted(refresh);
watch(() => props.boardId, refresh);
watch(isEnabled, refresh);
</script>
