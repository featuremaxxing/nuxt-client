<template>
	<template v-if="progress">
		<ProgressBar
			:done="progress.done"
			:total="progress.total"
			:label="t('pages.learningPath.progress', { done: progress.done, total: progress.total })"
			class="progress"
			:data-testid="`learning-path-progress-${userId}-${pathId}`"
		/>
		<p v-if="progress.nextBoardTitle" class="text-caption mb-0">
			{{ t("pages.room.learningPaths.next", { title: progress.nextBoardTitle }) }}
		</p>
		<VBtn
			v-if="canAssign"
			size="x-small"
			variant="text"
			:data-testid="`learning-path-remove-${userId}-${pathId}`"
			@click="emit('remove')"
		>
			{{ t("pages.room.learningPaths.remove") }}
		</VBtn>
	</template>
	<VBtn
		v-else-if="canAssign"
		size="small"
		variant="outlined"
		:data-testid="`learning-path-assign-${userId}-${pathId}`"
		@click="emit('assign')"
	>
		{{ t("pages.room.learningPaths.assign") }}
	</VBtn>
</template>

<script setup lang="ts">
import { ProgressBar } from "@feature-board-progress";
import { useI18n } from "vue-i18n";

defineProps<{
	userId: string;
	pathId: string;
	// undefined when the student does not go the learning path
	progress?: { done: number; total: number; nextBoardTitle?: string };
	canAssign: boolean;
}>();

const emit = defineEmits<{
	(e: "assign"): void;
	(e: "remove"): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
.progress {
	min-width: 10rem;
}
</style>
