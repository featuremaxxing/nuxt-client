<template>
	<!-- completed stays visible, gone or not: only the teacher has the student go it once more -->
	<template v-if="progress?.completed">
		<p class="mb-0 d-flex align-center ga-1 text-success" :data-testid="`learning-path-completed-${userId}-${pathId}`">
			<VIcon :icon="mdiCheckCircle" size="18" aria-hidden="true" />
			<span class="font-weight-bold">{{ t("pages.room.learningPaths.completed") }}</span>
		</p>
		<VBtn size="x-small" variant="text" :data-testid="`learning-path-redo-${userId}-${pathId}`" @click="emit('redo')">
			{{ t("pages.room.learningPaths.redo.action") }}
		</VBtn>
		<VBtn
			v-if="canAssign && progress.isEnrolled"
			size="x-small"
			variant="text"
			:data-testid="`learning-path-remove-${userId}-${pathId}`"
			@click="emit('remove')"
		>
			{{ t("pages.room.learningPaths.remove") }}
		</VBtn>
	</template>
	<template v-else-if="progress?.isEnrolled">
		<ProgressBar
			:done="progress.done"
			:total="progress.total"
			:label="t('pages.learningPath.progress', { done: progress.done, total: progress.total })"
			class="progress"
			:data-testid="`learning-path-progress-${userId}-${pathId}`"
		/>
		<p
			v-if="progress.rework > 0"
			class="text-caption mb-0 d-flex align-center ga-1"
			:data-testid="`learning-path-rework-${userId}-${pathId}`"
		>
			<LearningPathReworkMark :size="14" />
			{{ t("pages.room.learningPaths.rework", { count: progress.rework }) }}
		</p>
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
import { type LearningPathOverviewProgress } from "@data-board-learning-path";
import { ProgressBar } from "@feature-board-progress";
import { mdiCheckCircle } from "@icons/material";
import { LearningPathReworkMark } from "@ui-room-details";
import { useI18n } from "vue-i18n";

defineProps<{
	userId: string;
	pathId: string;
	progress?: LearningPathOverviewProgress;
	canAssign: boolean;
}>();

const emit = defineEmits<{
	(e: "assign"): void;
	(e: "remove"): void;
	(e: "redo"): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
.progress {
	min-width: 10rem;
}
</style>
