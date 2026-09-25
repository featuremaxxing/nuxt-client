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
				<VListItemSubtitle data-testId="task-label" class="d-inline-flex">
					<span class="text-truncate" data-testid="task-subtitle">
						{{ taskLabel }}
					</span>
				</VListItemSubtitle>
				<VListItemTitle data-testid="taskTitle">
					{{ task.name }}
				</VListItemTitle>
				<VListItemSubtitle v-if="topic && currentBreakpoint !== 'xs'" data-testid="task-topic" class="d-inline-flex">
					<span class="text-truncate">{{ topic }}</span>
				</VListItemSubtitle>

				<TaskChipsTeacher class="mt-2" :task />
			</div>
		</template>

		<template #append>
			<div :data-testid="`three-dot-task-option-menu-${task.id}`">
				<TasksOverviewListItemMenu
					:task
					@copy-task="onCopyTask"
					@share-task="onShareTask"
					@finish-task="onFinish"
					@delete-task="onDelete"
					@restore-task="onRestoreTask"
					@revert-task="onRevertPublishedTask"
				/>
				<VProgressCircular
					v-if="isMutating"
					class="position-absolute"
					style="right: 6px; top: 6px"
					indeterminate
					size="16"
				/>
			</div>
		</template>
	</VListItem>
</template>

<script setup lang="ts">
import TasksOverviewListItemMenu from "./TasksOverviewListItemMenu.vue";
import TaskChipsTeacher from "@/components/tasks/task-chips/TaskChipsTeacher.vue";
import { CopyParams } from "@/types/copy/CopyParams";
import { toCategoryColor } from "@/utils/color.utils";
import { formatUtc, isToday } from "@/utils/date-time.utils";
import { TaskResponse } from "@api-server";
import { getTaskSymbol, isTaskDraft, useTaskActions, useTasksOfOverview } from "@data-tasks";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

const props = defineProps<{ task: TaskResponse }>();
const { isMutating, finishTask, restoreFinishedTask, deleteTask, revertPublishedTask } = useTaskActions();
const { fetchTasks, fetchFinishedTasks } = useTasksOfOverview();

const onRestoreTask = async (taskId: string) => {
	await restoreFinishedTask(taskId);
	await Promise.all([fetchTasks(), fetchFinishedTasks()]);
};

const onRevertPublishedTask = async (taskId: string) => {
	await revertPublishedTask(taskId);
	await fetchTasks();
};

const onFinish = async (taskId: string) => {
	await finishTask(taskId);
	await Promise.all([fetchTasks(), fetchFinishedTasks()]);
};

const onDelete = async () => {
	await deleteTask(props.task.id, props.task.name);
	if (props.task.status.isFinished) {
		await fetchFinishedTasks();
	} else {
		await fetchTasks();
	}
};

const emit = defineEmits<{
	"copy-task": [payload: CopyParams];
	"share-task": [taskId: string];
}>();

const { t } = useI18n();

const taskSymbol = computed(() => getTaskSymbol(props.task));
const { name: currentBreakpoint } = useDisplay();

const isDraft = computed(() => isTaskDraft(props.task));
const isPlanned = computed(() => new Date(props.task.availableDate!) > new Date());

const courseName = computed(() => {
	const baseName = props.task.courseName || t("pages.tasks.labels.noCourse");
	return props.task.status.isSubstitutionTeacher ? `${t("common.words.substitute")} ${baseName}` : baseName;
});

const taskLabel = computed(() => {
	const { createdAt, dueDate, availableDate } = props.task;
	const labelText = courseName.value;

	if (isDraft.value) {
		const suffix = isToday(createdAt)
			? `${t("components.molecules.TaskItemMenu.labels.createdAt")} ${formatUtc(createdAt, "time")}`
			: `${t("components.molecules.TaskItemMenu.labels.createdAt")} ${formatUtc(createdAt, "dateTimeYY")}`;
		return `${labelText} - ${suffix}`;
	}

	if (isPlanned.value) {
		return `${labelText} - ${t("pages.tasks.labels.planned")} ${formatUtc(availableDate!, "dateTimeYY")}`;
	}

	if (dueDate) {
		return `${labelText} - ${t("pages.tasks.labels.due")} ${formatUtc(dueDate, "dateTimeYY")}`;
	}

	return labelText;
});

const topic = computed(() => (props.task.lessonName ? `${t("common.words.topic")} ${props.task.lessonName}` : ""));

const ariaLabel = computed(() => `${t("common.words.task")} ${props.task.name}`);

const handleClick = () => {
	window.location.href = `/homework/${props.task.id}`;
};

const onCopyTask = (payload: CopyParams) => {
	emit("copy-task", payload);
};

const onShareTask = (taskId: string) => {
	emit("share-task", taskId);
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

.opacity-0-5 {
	opacity: 0.5;
}

.task-item__main-info {
	overflow: hidden;
}

:deep(.v-list-item__prepend .v-icon) {
	width: inherit;
	height: inherit;
}

.task-stats {
	min-width: 7rem;
}
</style>
