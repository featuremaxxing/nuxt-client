<template>
	<VListItem
		class="lr-task-row"
		v-bind="$attrs"
		:aria-label="ariaLabel"
		role="article"
		:ripple="false"
		tabindex="0"
		@click="handleClick"
	>
		<template #prepend>
			<span class="lr-task-symbol" :style="{ background: toCategoryColor(task.displayColor) }" aria-hidden="true">
				{{ taskSymbol }}
			</span>
		</template>
		<template #default>
			<div>
				<VListItemSubtitle data-testid="task-subtitle">
					{{ taskLabel }}
				</VListItemSubtitle>
				<VListItemTitle data-testid="taskTitle" class="text-truncate">
					{{ task.name }}
				</VListItemTitle>
				<VListItemSubtitle>{{ topic }}</VListItemSubtitle>
			</div>
			<div class="d-sm-block mr-sm-4 d-flex mt-2">
				<div class="text-subtitle-2 due-date-label" data-testid="due-date-label">{{ dueDateLabel }}</div>
				<TaskChipsStudent :task />
			</div>
		</template>

		<template #append>
			<div :data-testid="`three-dot-task-option-menu-${task.id}`">
				<TasksOverviewListItemMenu :task @finish-task="onFinish" @restore-task="onRestoreTask" />
				<VProgressCircular
					v-if="isMutating"
					style="right: 6px; top: 6px"
					class="position-absolute"
					indeterminate
					size="16"
				/>
			</div>
		</template>
	</VListItem>
</template>

<script setup lang="ts">
import TasksOverviewListItemMenu from "./TasksOverviewListItemMenu.vue";
import TaskChipsStudent from "@/components/tasks/task-chips/TaskChipsStudent.vue";
import { toCategoryColor } from "@/utils/color.utils";
import { formatUtc } from "@/utils/date-time.utils";
import { TaskResponse } from "@api-server";
import { getTaskSymbol, useTaskActions, useTasksOfOverview } from "@data-tasks";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

const props = defineProps<{ task: TaskResponse }>();

const { fetchTasks, fetchFinishedTasks } = useTasksOfOverview();
const { isMutating, finishTask, restoreFinishedTask } = useTaskActions();

const { t } = useI18n();

const taskSymbol = computed(() => getTaskSymbol(props.task));
const { xs } = useDisplay();

const topic = computed(() => (props.task.lessonName ? `${t("common.words.topic")} ${props.task.lessonName}` : ""));

const dueDateLabel = computed(() => {
	const { dueDate } = props.task;
	if (!dueDate) return undefined;

	const formatted = xs.value ? formatUtc(dueDate, "dateYY") : formatUtc(dueDate, "dateTimeYY");
	return `${t("pages.tasks.labels.due")} ${formatted}`;
});

const taskLabel = computed(() => props.task.courseName);

const ariaLabel = computed(() => `${t("common.words.task")} ${props.task.name}`);

const onFinish = async (taskId: string) => {
	await finishTask(taskId);
	await Promise.all([fetchTasks(), fetchFinishedTasks()]);
};
const onRestoreTask = async (taskId: string) => {
	await restoreFinishedTask(taskId);
	await Promise.all([fetchTasks(), fetchFinishedTasks()]);
};

const handleClick = () => {
	window.location.href = `/homework/${props.task.id}`;
};
</script>

<style lang="scss" scoped>
.lr-task-row {
	border-bottom: 1px solid var(--lr-line);
}

.lr-task-symbol {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	margin-inline-end: var(--lr-space-4);
	border: 1px solid rgba(20, 26, 34, 0.18);
	border-radius: var(--lr-radius);
	color: var(--lr-cat-ink);
	font-family: var(--font-accent);
	font-stretch: var(--font-stretch-symbol);
	font-weight: 800;
	font-size: 1.125rem;
	flex-shrink: 0;
}

.fill {
	fill: currentColor;
}

:deep(.v-list-item__prepend .v-icon) {
	width: inherit;
	height: inherit;
}

:deep(.due-date-label) {
	opacity: var(--v-medium-emphasis-opacity);
}
</style>
