<template>
	<RouterLink
		v-if="progress && progress.summary.total > 0"
		:to="`/rooms/${roomId}/progress`"
		class="board-progress-link"
		data-testid="board-progress-link"
	>
		<ProgressBar :done="progress.summary.done" :total="progress.summary.total" :label="label" />
	</RouterLink>
</template>

<script setup lang="ts">
import ProgressBar from "./ProgressBar.vue";
import { BoardProgress, useBoardProgressApi } from "@data-board-progress";
import { useEnvConfig } from "@data-env";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	boardId: string;
	roomId?: string;
}>();

const { t } = useI18n();
const api = useBoardProgressApi();
const progress = ref<BoardProgress>();

const isEnabled = computed(() => useEnvConfig().value.FEATURE_BOARD_PROGRESS_ENABLED && !!props.roomId);

const refresh = async () => {
	if (!isEnabled.value) {
		progress.value = undefined;
		return;
	}
	progress.value = await api.getBoardProgress(props.boardId);
};

const label = computed(() => {
	if (!progress.value) return undefined;
	const { done, total } = progress.value.summary;
	return progress.value.isTeacherView
		? t("components.boardProgress.classProgress", { done, total })
		: t("components.boardProgress.doneOf", { done, total });
});

onMounted(refresh);
watch(() => props.boardId, refresh);
watch(isEnabled, refresh);
</script>

<style scoped>
.board-progress-link {
	display: block;
	max-width: 320px;
	text-decoration: none;
	color: inherit;
}
</style>
